// POST /api/admin/applications/:id/delete
//
// Permanently deletes an application and all associated data.
// Admin-only. No undo.
//
// Cleanup order (all on the service-role admin client so RLS
// doesn't get in the way):
//   1. Photo from Supabase Storage
//   2. event_tickets where member_id belongs to this application
//   3. members rows linked to this application (and their
//      auth.users counterparts so the email is fully expunged)
//   4. applications row → cascades audit_log + review_notes per schema
//
// We don't touch email_log — keep that for delivery audit history,
// since it's just a record of what got sent, not personal data.

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
  // Admin gate.
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return err(401, "AUTH", "Sign in required");
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return err(403, "FORBIDDEN", "Admin only");

  const { id } = await ctx.params;
  const admin = createSupabaseAdminClient();

  // Load the application so we know what to clean up.
  const { data: app, error: loadErr } = await admin
    .from("applications")
    .select("id, ref, email, photo_url")
    .eq("id", id)
    .maybeSingle();
  if (loadErr || !app) return err(404, "NOT_FOUND", "Application not found");

  const cleanup: string[] = [];

  // 1. Delete the photo from storage (best-effort — if it's already
  // gone or never existed, keep going).
  if (app.photo_url) {
    const { error: storageErr } = await admin.storage
      .from("applications-photos")
      .remove([app.photo_url]);
    if (storageErr) {
      cleanup.push(`photo: ${storageErr.message}`);
    }
  }

  // 2. Find members tied to this application.
  const { data: members } = await admin
    .from("members")
    .select("id")
    .eq("application_id", id);
  const memberIds = members?.map((m) => m.id) ?? [];

  // 3. Tickets bought by those members.
  if (memberIds.length > 0) {
    const { error: ticketErr } = await admin
      .from("event_tickets")
      .delete()
      .in("member_id", memberIds);
    if (ticketErr) cleanup.push(`tickets: ${ticketErr.message}`);

    // 4. Delete the member rows themselves.
    const { error: memberErr } = await admin
      .from("members")
      .delete()
      .in("id", memberIds);
    if (memberErr) cleanup.push(`members: ${memberErr.message}`);
  }

  // 5. Delete the auth.users row for this email (so a fresh
  // application from the same email starts clean). Don't error if
  // they were never an auth user.
  try {
    const { data: { users } } = await admin.auth.admin.listUsers({
      page: 1, perPage: 1000,
    });
    const target = users.find(
      (u) => u.email?.toLowerCase() === app.email.toLowerCase(),
    );
    if (target) {
      // Skip if they're an admin — never delete an admin account
      // via this path (would lock you out of /admin).
      const isAdmin = (target.app_metadata as Record<string, unknown> | null)?.role === "admin";
      if (!isAdmin) {
        const { error: authErr } = await admin.auth.admin.deleteUser(target.id);
        if (authErr) cleanup.push(`auth: ${authErr.message}`);
      } else {
        cleanup.push("skipped auth.users delete: target email is an admin");
      }
    }
  } catch (e) {
    cleanup.push(`auth: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // 6. Finally delete the application row. This cascades audit_log
  // + review_notes per the schema's ON DELETE CASCADE.
  const { error: appErr } = await admin
    .from("applications")
    .delete()
    .eq("id", id);
  if (appErr) return err(500, "DELETE_APP", appErr.message);

  return NextResponse.json({
    ok: true,
    ref: app.ref,
    warnings: cleanup,
  });
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
