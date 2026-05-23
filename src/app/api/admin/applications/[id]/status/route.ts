// POST /api/admin/applications/:id/status
//
// Curator action. Transitions an application to a new status,
// writes an audit_log row, and (when sendEmail is true) fires the
// matching lifecycle email. On `approved`, also creates the
// members row(s) and sends the magic-link email instead of the
// generic approved template.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(["reviewing", "approved", "waitlisted", "declined", "revoked"]),
  reason: z.string().trim().optional(),
  sendEmail: z.boolean().default(true),
  emailNote: z.string().trim().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  // Auth gate
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return error(401, "AUTH", "Sign in required");
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return error(403, "FORBIDDEN", "Admin only");

  const { id } = await ctx.params;
  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return error(422, "VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
  }
  const { status, reason, sendEmail: doSend, emailNote } = parsed.data;

  const admin = createSupabaseAdminClient();

  // Load current row so we can record from_status + know who to email.
  const { data: app, error: loadErr } = await admin
    .from("applications")
    .select(
      "id, ref, type, status, email, p1_name, p2_name, event_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (loadErr || !app) return error(404, "NOT_FOUND", "Application not found");

  // 1. Update the row.
  const { error: updateErr } = await admin
    .from("applications")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      decision_reason: reason ?? null,
    })
    .eq("id", id);
  if (updateErr) return error(500, "UPDATE", updateErr.message);

  // 2. Audit log.
  await admin.from("audit_log").insert({
    application_id: id,
    actor_id: user.id,
    from_status: app.status,
    to_status: status,
    reason: reason ?? null,
  });

  // 3. Approve → create member row(s).
  let createdMemberIds: string[] = [];
  if (status === "approved") {
    const pairId = app.type === "couple" ? crypto.randomUUID() : null;
    const rows = [
      {
        application_id: id,
        pair_id: pairId,
        name: app.p1_name,
        email: app.email,
      },
    ];
    if (app.type === "couple" && app.p2_name) {
      // The handoff has both partners share an email — we keep that
      // for now. If you later add a partner-email field we'll fork.
      rows.push({
        application_id: id,
        pair_id: pairId,
        name: app.p2_name,
        email: app.email,
      });
    }
    // Upsert by email to avoid the "members_email_key" violation
    // if the same address re-applies (rare but possible).
    const { data: inserted } = await admin
      .from("members")
      .upsert(rows, { onConflict: "email", ignoreDuplicates: false })
      .select("id");
    createdMemberIds = inserted?.map((m) => m.id) ?? [];
  }

  // 4. Revoke → mark members revoked.
  if (status === "revoked") {
    await admin
      .from("members")
      .update({ status: "revoked" })
      .eq("application_id", id);
  }

  // 5. Fire the right email (if asked).
  let emailSent = false;
  if (doSend) {
    try {
      if (status === "approved") {
        // Approval email is an announcement, not an auth-bearing
        // link — the member visits the site whenever they're ready
        // and uses the standard "Member sign in" flow to get a
        // fresh magic link. That way the email never expires and
        // can't be forwarded to grant access.
        await sendEmail({
          template: "application-approved",
          to: app.email,
          vars: {
            siteUrl: `${getOrigin(req)}/`,
            partnerFirstName: app.p2_name?.split(" ")[0],
            eventLine: "VI · The Lovers",
            eventDateLine: "Friday, June 19 · Las Vegas",
            curatorNote: emailNote,
          },
          applicationId: id,
        });
      } else if (status === "waitlisted") {
        await sendEmail({
          template: "application-waitlisted",
          to: app.email,
          vars: { eventName: "VI · The Lovers" },
          applicationId: id,
        });
      } else if (status === "declined") {
        await sendEmail({
          template: "application-declined",
          to: app.email,
          applicationId: id,
        });
      } else if (status === "reviewing") {
        await sendEmail({
          template: "application-reviewing",
          to: app.email,
          applicationId: id,
        });
      }
      emailSent = true;
    } catch (e) {
      console.error("[status email] failed:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    sentEmail: emailSent,
    memberIds: createdMemberIds,
  });
}

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function getOrigin(req: Request): string {
  return new URL(req.url).origin;
}
