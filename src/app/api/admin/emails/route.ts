// POST /api/admin/emails
//   Create a new custom email template. Returns the generated id so
//   the caller can redirect into the editor.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/email/templates-meta";
import { CUSTOM_DEFAULTS, customIdFromLabel } from "@/lib/email/templates-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  label: z.string().trim().min(1).max(120),
  triggerDescription: z.string().trim().min(1).max(400).optional(),
});

export async function POST(req: Request) {
  const fail = await adminGate();
  if (fail) return fail;

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return err(422, "VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
  }

  const admin = createSupabaseAdminClient();
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();

  // Derive a stable id. If the slug collides (either with a built-in
  // or an existing custom row), suffix -2, -3, … until free.
  const baseId = customIdFromLabel(parsed.data.label);
  let id = baseId;
  for (let i = 2; i < 50; i++) {
    if (!(id in TEMPLATES)) {
      const { data: clash } = await admin
        .from("email_templates")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (!clash) break;
    }
    id = `${baseId}-${i}`;
  }

  const { error: insErr } = await admin
    .from("email_templates")
    .insert({
      id,
      subject: CUSTOM_DEFAULTS.subject,
      headline: CUSTOM_DEFAULTS.headline,
      body: CUSTOM_DEFAULTS.body,
      enabled: true,
      is_custom: true,
      label: parsed.data.label,
      trigger_description:
        parsed.data.triggerDescription ||
        "Custom broadcast — sent manually from the admin.",
      updated_by: user?.id ?? null,
    });
  if (insErr) return err(500, "INSERT", insErr.message);

  return NextResponse.json({ ok: true, id });
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
