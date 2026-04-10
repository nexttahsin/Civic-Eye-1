import { createClient } from "@supabase/supabase-js";

function getSupabaseConfig() {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];
  const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required. Please configure your Supabase credentials.",
    );
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

export function createSupabaseClientWithToken(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

export function createSupabaseServiceClient() {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}
