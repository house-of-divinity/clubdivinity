// POST /api/admin/emails/:id/send
//   Send a custom broadcast email to the chosen audience.
//   Only works on custom templates (is_custom=true); built-ins are
//   fired automatically by lifecycle events.

import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { interpolate } from "@/lib/email/templates-meta";
import { OverriddenEmail } from "@/lib/email/templates/OverriddenEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  audience: z.enum([
    "members",
    "applicants-all",
    "applicants-pending",
    "applicants-approved",
  ]),
  testOnly: z.boolean().optional(),  // send only to the requesting admin
});

const REPLY_TO = "hello@clubdivinity.com";

type Recipient = {
  email: string;
  firstName: string;
  fullName: string;
  applicationId?: string | null;
  memberId?: string | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const fail = await adminGate();
  if (fail) return fail;

  const { id } = await ctx.params;
  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return err(422, "VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
  }

  const admin = createSupabaseAdminClient();
  const { data: tpl } = await admin
    .from("email_templates")
    .select("id, subject, headline, body, enabled, is_custom")
    .eq("id", id)
    .maybeSingle();

  if (!tpl) return err(404, "NOT_FOUND", "Template not found");
  if (!tpl.is_custom) {
    return err(400, "NOT_CUSTOM", "Broadcasts are only available for custom templates.");
  }
  if (!tpl.enabled) {
    return err(400, "DISABLED", "This template is disabled. Enable it before sending.");
  }

  // Resolve recipients. Test mode → just the signed-in admin.
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();

  let recipients: Recipient[];
  if (parsed.data.testOnly) {
    recipients = [{
      email: user?.email ?? "",
      firstName: (user?.email ?? "").split("@")[0],
      fullName: user?.email ?? "",
    }];
  } else {
    recipients = await loadRecipients(parsed.data.audience);
  }

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, audience_size: 0 });
  }

  // Resolve event variables once. Same event for every recipient.
  const eventVars = await loadEventVars();

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || originFromReq(req);

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const vars: Record<string, string> = {
      firstName: r.firstName,
      fullName: r.fullName,
      ...eventVars,
      siteUrl,
    };
    const subject  = interpolate(tpl.subject, vars);
    const headline = interpolate(tpl.headline, vars);
    const body     = interpolate(tpl.body, vars);

    let providerId: string | null = null;
    let status: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    try {
      const node = (
        <OverriddenEmail
          preview={subject}
          headline={headline}
          body={body}
          extras={{ kind: "none" }}
        />
      );
      const { data, error } = await resend.emails.send({
        from,
        to: r.email,
        replyTo: REPLY_TO,
        subject,
        react: node,
      });
      if (error) {
        status = "failed";
        errorMessage = error.message;
      } else {
        providerId = data?.id ?? null;
      }
    } catch (e) {
      status = "failed";
      errorMessage = e instanceof Error ? e.message : "unknown error";
    }

    try {
      await admin.from("email_log").insert({
        to_email: r.email,
        template: id,
        subject,
        application_id: r.applicationId ?? null,
        member_id: r.memberId ?? null,
        event_id: null,
        status,
        provider_id: providerId,
        error: errorMessage,
      });
    } catch {
      /* swallow */
    }

    if (status === "sent") sent++;
    else failed++;
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    audience_size: recipients.length,
  });
}

async function loadRecipients(audience: string): Promise<Recipient[]> {
  const admin = createSupabaseAdminClient();
  const seen = new Set<string>();
  const out: Recipient[] = [];

  if (audience === "members") {
    const { data } = await admin
      .from("members")
      .select("id, name, email")
      .eq("status", "active");
    for (const m of data ?? []) {
      const e = (m.email as string).toLowerCase();
      if (seen.has(e)) continue;
      seen.add(e);
      out.push({
        email: m.email as string,
        firstName: firstNameOf(m.name as string),
        fullName: m.name as string,
        memberId: m.id as string,
      });
    }
    return out;
  }

  let statusFilter: string[] | null = null;
  if (audience === "applicants-pending")  statusFilter = ["received", "reviewing"];
  if (audience === "applicants-approved") statusFilter = ["approved"];

  let q = admin.from("applications").select("id, p1_name, email, status");
  if (statusFilter) q = q.in("status", statusFilter);
  const { data } = await q;
  for (const a of data ?? []) {
    const e = (a.email as string).toLowerCase();
    if (seen.has(e)) continue;
    seen.add(e);
    out.push({
      email: a.email as string,
      firstName: firstNameOf(a.p1_name as string),
      fullName: a.p1_name as string,
      applicationId: a.id as string,
    });
  }
  return out;
}

async function loadEventVars(): Promise<{ eventLine: string; eventDateLine: string }> {
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("events")
    .select("roman, name, starts_at, location_city")
    .in("status", ["upcoming", "sold-out"])
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return { eventLine: "", eventDateLine: "" };
  }

  const eventLine = `${row.roman} · ${row.name}`;
  const d = new Date(row.starts_at as string);
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const eventDateLine = `${dateFmt.format(d)} · ${row.location_city ?? "Las Vegas"}`;
  return { eventLine, eventDateLine };
}

function firstNameOf(fullName: string): string {
  return (fullName || "").trim().split(/\s+/)[0] || "";
}

function originFromReq(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

async function adminGate(): Promise<Response | null> {
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return err(401, "AUTH", "Sign in required");
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return err(403, "FORBIDDEN", "Admin only");
  return null;
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
