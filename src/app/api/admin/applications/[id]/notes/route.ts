// POST /api/admin/applications/:id/notes
// Curator-only. Append a private note to the application.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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

  const admin = createSupabaseAdminClient();
  const { data, error: insertErr } = await admin
    .from("review_notes")
    .insert({
      application_id: id,
      author_id: user.id,
      body: parsed.data.body,
    })
    .select("id")
    .single();
  if (insertErr || !data) return error(500, "INSERT", "Couldn't save the note");

  return NextResponse.json({ ok: true, id: data.id });
}

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
