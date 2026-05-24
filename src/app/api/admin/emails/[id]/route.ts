// PATCH /api/admin/emails/:id
//   Upsert an override into email_templates for one template id.
//
// DELETE /api/admin/emails/:id
//   Reset to default (deletes the override row so sendEmail falls
//   back to the React component).

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { TEMPLATES, type TemplateId } from "@/lib/email/templates-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  subject: z.string().trim().min(1).max(300),
  headline: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(10_000),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const fail = await adminGate();
  if (fail) return fail;

  const { id } = await ctx.params;
  if (!(id in TEMPLATES)) {
    return err(404, "NOT_FOUND", "Unknown template id");
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return err(422, "VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
  }

  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  const admin = createSupabaseAdminClient();

  const { error: upsertErr } = await admin
    .from("email_templates")
    .upsert({
      id,
      subject: parsed.data.subject,
      headline: parsed.data.headline,
      body: parsed.data.body,
      updated_by: user?.id ?? null,
    });
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
  if (!(id in TEMPLATES)) {
    return err(404, "NOT_FOUND", "Unknown template id");
  }

  const admin = createSupabaseAdminClient();
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
