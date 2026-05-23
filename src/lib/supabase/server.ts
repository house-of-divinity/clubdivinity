// Server-side Supabase clients.
//
// `createSupabaseServerClient` reads cookies so server components +
// route handlers know who the user is (anon or signed-in member or
// admin), and RLS policies apply to their queries.
//
// `createSupabaseAdminClient` uses the service_role key and BYPASSES
// row-level security. Only use this in API routes / scripts that
// explicitly need elevated access (e.g. /api/applications writing
// into the table on behalf of an anonymous applicant). Never expose
// the returned client back to client code.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — Next disallows
            // setting cookies there. Safe to ignore; the middleware
            // refreshes the session on the next request.
          }
        },
      },
    },
  );
}

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
