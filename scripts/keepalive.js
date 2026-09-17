import { createClient } from "@supabase/supabase-js";

async function keepAlive() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  const { error } = await supabase
    .from("suppliers")
    .select("supplier_id")
    .limit(1);

  if (error) {
    throw error;
  }

  console.log("Keep-alive successful:", new Date().toISOString());
}

keepAlive().catch((error) => {
  console.error("Keep-alive failed:", error);
  process.exit(1);
});
