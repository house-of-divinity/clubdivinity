// PATCH /api/admin/emails/:id
//   Upsert subject/headline/body/enabled (and label/trigger for
//   custom templates) into email_templates.
//
// DELETE /api/admin/emails/:id
//   Built-in: deletes the override row → falls back to default copy
//     (also re-enables the trigger).
//   Custom:   deletes the row entirely → template disappears from
//     the admin list.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/email/templates-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// All content fields are optional so the list page can flip just the
// `enabled` toggle without sending the full body. The editor still
// sends subject/headline/body together on save.
const Body = z.object({
  subject: z.string().trim().min(1).max(300).optional(),
  headline: z.string().trim().min(1).max(300).optional(),
  body: z.string().trim().min(1).max(10_000).optional(),
  enabled: z.boolean().optional(),
  label: z.string().trim().min(1).max(120).optional(),
  triggerDescription: z.string().trim().min(1).max(400).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const fail = await adminGate();
  if (fail) return fail;

  const { id } = await ctx.params;
  const admin = createSupabaseAdminClient();

  // Resolve whether this id is a built-in (TemplateId) or a custom
  // template (must already exist as is_custom=true). Unknown ids
  // are rejected — to create a new one use POST /api/admin/emails.
  const isBuiltIn = id in TEMPLATES;
  let isCustomExisting = false;
  if (!isBuiltIn) {
    const { data: existing } = await admin
      .from("email_templates")
      .select("is_custom")
      .eq("id", id)
      .maybeSingle();
    if (!existing) {
      return err(404, "NOT_FOUND", "Unknown template id");
    }
    isCustomExisting = !!existing.is_custom;
    if (!isCustomExisting) {
      return err(404, "NOT_FOUND", "Unknown template id");
    }
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return err(422, "VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
  }

  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();

  // See if a row already exists. PATCH supports partial updates —
  // the list page only sends `enabled` when flipping the toggle,
  // the editor sends subject/headline/body together. If we're about
  // to insert a brand-new row for a built-in (toggle flipped before
  // any edit), fill in subject/headline/body from the in-code defaults
  // so the NOT NULL columns are satisfied.
  const { data: existing } = await admin
    .from("email_templates")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existing) {
    const updatePayload: Record<string, unknown> = {
      updated_by: user?.id ?? null,
    };
    if (parsed.data.subject  !== undefined) updatePayload.subject  = parsed.data.subject;
    if (parsed.data.headline !== undefined) updatePayload.headline = parsed.data.headline;
    if (parsed.data.body     !== undefined) updatePayload.body     = parsed.data.body;
    if (parsed.data.enabled  !== undefined) updatePayload.enabled  = parsed.data.enabled;
    if (isCustomExisting) {
      if (parsed.data.label              !== undefined) updatePayload.label               = parsed.data.label;
      if (parsed.data.triggerDescription !== undefined) updatePayload.trigger_description = parsed.data.triggerDescription;
    }

    const { error: updErr } = await admin
      .from("email_templates")
      .update(updatePayload)
      .eq("id", id);
    if (updErr) return err(500, "UPDATE", updErr.message);
  } else {
    // No row yet — only possible for built-ins (customs always have a
    // row from the POST that created them). Pull defaults from
    // templates-meta.ts so the insert satisfies the NOT NULL columns.
    if (!isBuiltIn) return err(404, "NOT_FOUND", "Unknown template id");
    const meta = TEMPLATES[id as keyof typeof TEMPLATES];

    const insertPayload: Record<string, unknown> = {
      id,
      subject:  parsed.data.subject  ?? meta.defaultSubject,
      headline: parsed.data.headline ?? meta.defaultHeadline,
      body:     parsed.data.body     ?? meta.defaultBody,
      enabled:  parsed.data.enabled  ?? true,
      is_custom: false,
      updated_by: user?.id ?? null,
    };

    const { error: insErr } = await admin
      .from("email_templates")
      .insert(insertPayload);
    if (insErr) return err(500, "INSERT", insErr.message);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const fail = await adminGate();
  if (fail) return fail;

  const { id } = await ctx.params;
  const admin = createSupabaseAdminClient();

  // For built-ins we just remove the override row (falls back to
  // default copy + re-enables). For custom we delete the row, which
  // also makes the template vanish from the admin list.
  if (!(id in TEMPLATES)) {
    const { data: existing } = await admin
      .from("email_templates")
      .select("is_custom")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return err(404, "NOT_FOUND", "Unknown template id");
    if (!existing.is_custom) return err(404, "NOT_FOUND", "Unknown template id");
  }

  const { error: delErr } = await admin
    .from("email_templates")
    .delete()
    .eq("id", id);
  if (delErr) return err(500, "DELETE", delErr.message);

  return NextResponse.json({ ok: true, reset: true });
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
