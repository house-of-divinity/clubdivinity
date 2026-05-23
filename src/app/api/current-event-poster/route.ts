// GET /api/current-event-poster — 302-redirect to the next upcoming
// event's poster image. Used in the magic-link email template so the
// "header image" always reflects whatever the next gathering is,
// without needing to update the email template per event.

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Don't cache the redirect — when admin swaps the upcoming event,
// the next email rendering should pick up the new poster.
export const revalidate = 0;

export async function GET(req: Request) {
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("events")
    .select("poster_url")
    .eq("status", "upcoming")
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Fallback to the seed VI · The Lovers poster if no upcoming event.
  const path = data?.poster_url || "/assets/lovers-poster.jpeg";

  // If the stored value is already a full URL, redirect to it directly.
  // Otherwise resolve against the request's origin (so it works on
  // localhost and production without hardcoding).
  const target = path.startsWith("http")
    ? path
    : new URL(path, req.url).toString();

  return NextResponse.redirect(target, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
