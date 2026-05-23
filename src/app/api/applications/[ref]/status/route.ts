// GET /api/applications/:ref/status
// Public sanitized view used by the /status?ref=DV-... page so an
// applicant can check where they are in review. Returns only the
// status + timestamps — never notes, photo, reviewer, or contact.

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ref: string }> },
) {
  const { ref } = await ctx.params;

  if (!/^DV-[A-Z0-9]{6}$/.test(ref)) {
    return NextResponse.json(
      { error: { code: "BAD_REF", message: "Invalid reference" } },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select("ref, status, created_at, reviewed_at")
    .eq("ref", ref)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No such application" } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ref: data.ref,
    status: data.status,
    submittedAt: data.created_at,
    decidedAt: data.reviewed_at,
  });
}
