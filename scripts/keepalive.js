import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function keepAlive() {
  const { error } = await supabase
    .from("suppliers")
    .select("supplier_id")
    .limit(1);

  if (error) {
    console.error("Keep-alive failed:", error);
    process.exit(1);
  }

  console.log("Keep-alive successful:", new Date().toISOString());
}

keepAlive();
