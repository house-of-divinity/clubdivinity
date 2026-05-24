// POST /api/admin/events/:id/delete
//
// Admin-only. Permanently delete an event.
// Cleanup order:
//   1. Delete event_tickets that reference this event
//   2. NULL out applications.event_id (don't lose applications)
//   3. NULL out email_log.event_id (preserve email history)
//   4. Remove the poster from storage if it's hosted in our
//      event-posters bucket (skip if it's a static /assets/ path)
//   5. Delete the events row

import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  // Admin gate
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return err(401, "AUTH", "Sign in required");
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return err(403, "FORBIDDEN", "Admin only");

  const { id } = await ctx.params;
  const admin = createSupabaseAdminClient();

  // Load event so we know the poster path.
  const { data: ev, error: loadErr } = await admin
    .from("events")
    .select("id, slug, name, poster_url")
    .eq("id", id)
    .maybeSingle();
  if (loadErr || !ev) return err(404, "NOT_FOUND", "Event not found");

  const cleanup: string[] = [];

  // 1. Delete tickets (event_tickets has NOT NULL event_id, so
  // they must go before the event itself).
  const { error: ticketErr } = await admin
    .from("event_tickets")
    .delete()
    .eq("event_id", id);
  if (ticketErr) cleanup.push(`tickets: ${ticketErr.message}`);

  // 2. NULL out application.event_id — keep the application but
  // unlink it from this event. (Applications keep their own ref +
  // status — they just lose the event association.)
  const { error: appErr } = await admin
    .from("applications")
    .update({ event_id: null })
    .eq("event_id", id);
  if (appErr) cleanup.push(`applications: ${appErr.message}`);

  // 3. NULL out email_log.event_id similarly.
  const { error: logErr } = await admin
    .from("email_log")
    .update({ event_id: null })
    .eq("event_id", id);
  if (logErr) cleanup.push(`email_log: ${logErr.message}`);

  // 4. Remove the poster if it's in our event-posters bucket.
  if (ev.poster_url) {
    const path = extractPosterPath(ev.poster_url);
    if (path) {
      const { error: storErr } = await admin.storage
        .from("event-posters")
        .remove([path]);
      if (storErr) cleanup.push(`poster: ${storErr.message}`);
    }
  }

  // 5. Finally delete the event itself.
  const { error: delErr } = await admin
    .from("events")
    .delete()
    .eq("id", id);
  if (delErr) return err(500, "DELETE", delErr.message);

  return NextResponse.json({
    ok: true,
    slug: ev.slug,
    name: ev.name,
    warnings: cleanup,
  });
}

// Pull the storage path out of a Supabase public URL like:
//   https://<project>.supabase.co/storage/v1/object/public/event-posters/posters/123-abc.jpg
// Returns "posters/123-abc.jpg" if it matches the event-posters
// bucket, otherwise null (so we don't try to delete static assets
// from /assets/ or external URLs).
function extractPosterPath(url: string): string | null {
  const marker = "/storage/v1/object/public/event-posters/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
