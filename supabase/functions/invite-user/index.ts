import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "admin" | "player";
type Gender = "lady" | "man" | null;

type RequestBody = {
  setupMode?: "temporary_password" | "invite_email";
  email: string;
  fullName: string;
  firstName: string;
  role: Role;
  gender?: Gender;
  temporaryPassword?: string;
};

function normalizeUsernameBase(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20) || "user";
}

async function generateUniqueUsername(adminDb: ReturnType<typeof createClient>, base: string) {
  const root = normalizeUsernameBase(base);

  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? root : `${root}${i}`;
    const { data, error } = await adminDb
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  return `${root}${Date.now().toString().slice(-6)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing function secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: callerAuthError,
    } = await callerClient.auth.getUser();

    if (callerAuthError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile, error: callerProfileError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .maybeSingle();

    if (callerProfileError || callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    const setupMode = body.setupMode ?? "temporary_password";

    if (!body.email || !body.fullName || !body.firstName || !body.role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (setupMode === "temporary_password") {
      if (!body.temporaryPassword || body.temporaryPassword.trim().length < 8) {
        return new Response(JSON.stringify({ error: "Temporary password must be at least 8 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;
    if (existingProfile) {
      return new Response(JSON.stringify({ error: "User already exists for this email" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | undefined;

    if (setupMode === "temporary_password") {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.temporaryPassword!,
        email_confirm: true,
        user_metadata: {
          name: body.fullName,
          first_name: body.firstName,
          role: body.role,
        },
      });

      if (createError) throw createError;
      userId = created.user?.id;
    } else {
      const redirectTo = `${new URL(req.url).origin.replace(".functions.supabase.co", ".supabase.co")}`;
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        body.email,
        { redirectTo }
      );

      if (inviteError) throw inviteError;
      userId = invited.user?.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "User created/invited but user id was missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usernameBase = body.email.split("@")[0] || body.firstName || body.fullName;
    const username = await generateUniqueUsername(adminClient, usernameBase);

    const { error: upsertError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        name: body.fullName,
        username,
        role: body.role,
        player_id: null,
        gender: body.role === "player" ? (body.gender ?? null) : null,
        email: body.email,
      },
      { onConflict: "id" }
    );

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        ok: true,
        setupMode,
        userId,
        username,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("invite-user error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});