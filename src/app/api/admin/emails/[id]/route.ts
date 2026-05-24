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

const Body = z.object({
  subject: z.string().trim().min(1).max(300),
  headline: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(10_000),
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

  const upsertPayload: Record<string, unknown> = {
    id,
    subject: parsed.data.subject,
    headline: parsed.data.headline,
    body: parsed.data.body,
    updated_by: user?.id ?? null,
    is_custom: isCustomExisting,
  };
  if (parsed.data.enabled !== undefined) {
    upsertPayload.enabled = parsed.data.enabled;
  }
  // label + trigger_description only meaningful on custom rows.
  if (isCustomExisting) {
    if (parsed.data.label !== undefined) {
      upsertPayload.label = parsed.data.label;
    }
    if (parsed.data.triggerDescription !== undefined) {
      upsertPayload.trigger_description = parsed.data.triggerDescription;
    }
  }

  const { error: upsertErr } = await admin
    .from("email_templates")
    .upsert(upsertPayload);
  if (upsertErr) return err(500, "UPSERT", upsertErr.message);

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
