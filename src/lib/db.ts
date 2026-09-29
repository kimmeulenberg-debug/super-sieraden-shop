import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 *
 * Server-only: dit bestand mag alleen worden geimporteerd in Route Handlers
 * of Server Components, nooit in Client Components ("use client"). De
 * SUPABASE_SERVICE_ROLE_KEY omzeilt Row Level Security en mag de browserbundel
 * nooit bereiken (vergelijkbaar met de scheiding in src/lib/stripe-server.ts).
 *
 * Status: werkt alleen zodra SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in
 * .env.local staan. Zonder geldige configuratie geeft getSupabaseAdmin()
 * `null` terug, zodat de aanroepende route een nette 503 kan tonen in plaats
 * van te crashen.
 */
let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || serviceRoleKey === "REPLACE_WITH_SERVICE_ROLE_KEY_FROM_SUPABASE_DASHBOARD") {
    return null;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return supabaseAdmin;
}
