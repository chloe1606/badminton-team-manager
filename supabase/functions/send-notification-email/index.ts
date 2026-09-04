import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const APP_URL =
  Deno.env.get("APP_URL") ||
  "https://badminton-team-manager-oauw-pearl.vercel.app/";

const GOOGLE_MAPS_BASE_URL =
  "https://www.google.com/maps/search/?api=1&query=";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isPastMatch(startAt: string | null | undefined): boolean {
  if (!startAt) {
    return false;
  }

  const startTime = new Date(startAt).getTime();
  if (Number.isNaN(startTime)) {
    return false;
  }

  return startTime < Date.now();
}

// --------------------------------------------------
// Main function
// --------------------------------------------------

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // --------------------------------------------------
    // 1. Verify our webhook secret
    // --------------------------------------------------

    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const suppliedSecret = req.headers.get("x-webhook-secret");

    if (!webhookSecret || suppliedSecret !== webhookSecret) {
      console.error("Invalid webhook secret");

      return jsonResponse({
          error: "Unauthorized",
        }, 401);
    }

    // --------------------------------------------------
    // 2. Read the database webhook payload
    // --------------------------------------------------

    const payload = await req.json();

    console.log("Webhook type:", payload.type);

    const newRecord = payload.record;
    const oldRecord = payload.old_record;

    if (!newRecord) {
      throw new Error("No record received");
    }

    // --------------------------------------------------
    // 3. Create Supabase admin client
    // --------------------------------------------------

    const secretKeys = JSON.parse(
      Deno.env.get("SUPABASE_SECRET_KEYS")!,
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      secretKeys["default"],
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    // --------------------------------------------------
    // 4. Get the match
    // --------------------------------------------------

    const { data: match, error: matchError } =
      await supabaseAdmin
        .from("matches")
        .select(`
          id,
          match_type,
          venue_name,
          venue_address,
          start_at,
          end_at,
          team_display_name,
          league_name,
          notes
        `)
        .eq("id", newRecord.id)
        .single();

    if (matchError || !match) {
      throw new Error(
        `Could not find match: ${
          matchError?.message ?? "Unknown error"
        }`,
      );
    }

    // ==================================================
    // NEW MATCH
    // ==================================================

    if (payload.type === "INSERT") {
      console.log(`New match created: ${match.id}`);

      if (isPastMatch(match.start_at)) {
        console.log(
          `Skipping notifications for past match ${match.id} (${match.start_at})`,
        );

        return jsonResponse({
            success: true,
            type: "new_match",
            skipped: true,
            reason: "match_is_in_past",
          });
      }

      const result = await notifyAllPlayers(
        supabaseAdmin,
        match,
      );

      return jsonResponse({
          success: true,
          type: "new_match",
          result,
        });
    }

    // ==================================================
    // MATCH UPDATED
    // ==================================================

    if (payload.type === "UPDATE") {
      if (isPastMatch(match.start_at)) {
        console.log(
          `Skipping selection notifications for past match ${match.id} (${match.start_at})`,
        );

        return jsonResponse({
            success: true,
            type: "update",
            skipped: true,
            reason: "match_is_in_past",
          });
      }

      const newAssigned =
        Array.isArray(newRecord.assigned_player_ids)
          ? newRecord.assigned_player_ids
          : [];

      const oldAssigned =
        Array.isArray(oldRecord?.assigned_player_ids)
          ? oldRecord.assigned_player_ids
          : [];

      // Find IDs that exist in the new array
      // but did not exist in the old array.
      const newlySelectedPlayers =
        newAssigned.filter(
          (playerId: string) =>
            !oldAssigned.includes(playerId),
        );

      console.log(
        "Newly selected players:",
        newlySelectedPlayers,
      );

      if (newlySelectedPlayers.length === 0) {
        return jsonResponse({
            success: true,
            type: "update",
            message: "No newly selected players",
          });
      }

      // Send an email to each newly selected player.
      const results = [];

      for (const playerId of newlySelectedPlayers) {
        const result = await notifyPlayer(
          supabaseAdmin,
          match,
          playerId,
        );

        results.push(result);
      }

      return jsonResponse({
          success: true,
          type: "player_selected",
          results,
        });
    }

    // We don't need DELETE notifications.
    return jsonResponse({
        success: true,
        message: "Event ignored",
      });
  } catch (error) {
    console.error("Function error:", error);

    return jsonResponse({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }, 500);
  }
});

// ==================================================
// Notify every player about a new match
// ==================================================

async function notifyAllPlayers(
  supabaseAdmin: any,
  match: any,
) {
  const { data: profiles, error } =
    await supabaseAdmin
      .from("profiles")
      .select("id, name, email")
      .not("email", "is", null);

  if (error) {
    throw new Error(
      `Could not load profiles: ${error.message}`,
    );
  }

  const safeProfiles = profiles ?? [];

  console.log(
    `Found ${safeProfiles.length} players to notify`,
  );

  const results = [];

  for (const profile of safeProfiles) {
    if (!profile.email) {
      continue;
    }

    try {
      const result = await sendBrevoEmail({
        email: profile.email,
        name: profile.name,
        subject: `New match added - ${
          match.team_display_name || "New match"
        }`,
        html: buildNewMatchEmail(
          profile.name,
          match,
        ),
      });

      results.push({
        playerId: profile.id,
        email: profile.email,
        success: true,
        messageId: result.messageId,
      });
    } catch (error) {
      console.error(
        `Failed to email ${profile.email}:`,
        error,
      );

      results.push({
        playerId: profile.id,
        email: profile.email,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
  }

  return results;
}

// ==================================================
// Notify one selected player
// ==================================================

async function notifyPlayer(
  supabaseAdmin: any,
  match: any,
  playerId: string,
) {
  const { data: profile, error } =
    await supabaseAdmin
      .from("profiles")
      .select("id, name, email")
      .eq("id", playerId)
      .single();

  if (error || !profile) {
    console.error(
      `Could not find profile ${playerId}:`,
      error,
    );

    return {
      playerId,
      success: false,
      error: "Player profile not found",
    };
  }

  if (!profile.email) {
    console.error(
      `Player ${profile.name} has no email address`,
    );

    return {
      playerId,
      success: false,
      error: "Player has no email address",
    };
  }

  try {
    const result = await sendBrevoEmail({
      email: profile.email,
      name: profile.name,
      subject: `You've been selected - ${
        match.team_display_name || "Match"
      }`,
      html: buildPlayerSelectedEmail(
        profile.name,
        match,
      ),
    });

    return {
      playerId,
      email: profile.email,
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error(
      `Failed to email ${profile.email}:`,
      error,
    );

    return {
      playerId,
      email: profile.email,
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
}

// ==================================================
// Send email through Brevo
// ==================================================

async function sendBrevoEmail({
  email,
  name,
  subject,
  html,
}: {
  email: string;
  name: string | null;
  subject: string;
  html: string;
}) {
  const apiKey = Deno.env.get("BREVO_API_KEY");

  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY is not configured",
    );
  }

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",

      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },

      body: JSON.stringify({
        sender: {
          name: "Badminton Team Manager",
          email: "chloehaff@gmail.com",
        },

        to: [
          {
            email,
            name: name || undefined,
          },
        ],

        subject,
        htmlContent: html,
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Brevo error:", result);

    throw new Error(
      `Brevo error: ${JSON.stringify(result)}`,
    );
  }

  console.log(
    `Email sent to ${email}`,
    result.messageId,
  );

  return result;
}

// ==================================================
// Build Google Maps link
// ==================================================

function buildGoogleMapsUrl(address: string) {
  return `${GOOGLE_MAPS_BASE_URL}${encodeURIComponent(address)}`;
}

// ==================================================
// Venue HTML
// ==================================================

function buildVenueHtml(match: any) {
  const venueName = match.venue_name || "N/A";
  const venueAddress = match.venue_address;

  if (!venueAddress) {
    return `
      <p>
        <strong>Venue: ${escapeHtml(venueName)}</strong><br>
        N/A
      </p>
    `;
  }

  const mapsUrl = buildGoogleMapsUrl(
    venueAddress,
  );

  return `
    <p>
      <strong>Venue: ${escapeHtml(venueName)}</strong><br>
      ${escapeHtml(venueAddress)}
      <br>
      <a
        href="${mapsUrl}"
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Google Maps
      </a>
    </p>
  `;
}

// ==================================================
// New match email
// ==================================================

function buildNewMatchEmail(
  name: string | null,
  match: any,
) {
  const start = new Date(match.start_at);

  const date = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time = start.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <h2>New match added</h2>

    <p>
      Hi ${escapeHtml(name || "there")},
    </p>

    <p>
      A new match has been added.
    </p>

    <p>
      <strong>Team:</strong>
      ${escapeHtml(match.team_display_name || "N/A")}
    </p>

    ${
      match.match_type
        ? `
          <p>
            <strong>Division:</strong>
            ${escapeHtml(match.match_type)}
          </p>
        `
        : ""
    }

    <p>
      <strong>Date:</strong>
      ${escapeHtml(date)}
    </p>

    <p>
      <strong>Time:</strong>
      ${escapeHtml(time)}
    </p>

    ${buildVenueHtml(match)}

    ${
      match.league_name
        ? `
          <p>
            <strong>League:</strong>
            ${escapeHtml(match.league_name)}
          </p>
        `
        : ""
    }

    <p>
      Please visit the
      <a
        href="${APP_URL}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Badminton Team Manager
      </a>
      for more information.
    </p>
  `;
}

// ==================================================
// Player selected email
// ==================================================

function buildPlayerSelectedEmail(
  name: string | null,
  match: any,
) {
  const start = new Date(match.start_at);

  const date = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time = start.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <h2>You've been selected!</h2>

    <p>
      Hi ${escapeHtml(name || "there")},
    </p>

    <p>
      You have been selected for the following match:
    </p>

    <p>
      <strong>Team:</strong>
      ${escapeHtml(match.team_display_name || "N/A")}
    </p>

    ${
      match.match_type
        ? `
          <p>
            <strong>Division:</strong>
            ${escapeHtml(match.match_type)}
          </p>
        `
        : ""
    }

    <p>
      <strong>Date:</strong>
      ${escapeHtml(date)}
    </p>

    <p>
      <strong>Time:</strong>
      ${escapeHtml(time)}
    </p>

    ${buildVenueHtml(match)}

    ${
      match.league_name
        ? `
          <p>
            <strong>League:</strong>
            ${escapeHtml(match.league_name)}
          </p>
        `
        : ""
    }

    <p>
      Please visit the
      <a
        href="${APP_URL}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Badminton Team Manager
      </a>
      for more details.
    </p>
  `;
}

// ==================================================
// Basic HTML escaping
// ==================================================

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}