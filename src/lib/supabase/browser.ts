// Browser-side Supabase client. Use in "use client" components to
// read public data and to handle auth (magic links land in a
// session that this client can read via cookies).

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
