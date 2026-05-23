// GET /api/me  — current member profile. Returns null if the user
// is signed in via magic link but doesn't have a members row yet
// (e.g. they got an approval email but the curator hasn't created
// their membership). The client uses this to decide whether to
// show member-state UI.

import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ member: null });
  }

  // Use the admin client so we can read the members table without
  // requiring RLS to allow the request. We still gate by the
  // authenticated user's email.
  const admin = createSupabaseAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id, name, email, admitted_at, status, pair_id")
    .eq("email", user.email!)
    .maybeSingle();

  const isAdmin =
    (user.app_metadata as Record<string, unknown> | null)?.role === "admin";

  return NextResponse.json({
    member: member
      ? {
          id: member.id,
          name: member.name,
          email: member.email,
          admittedAt: member.admitted_at,
          status: member.status,
          isAdmin,
        }
      : {
          // Signed in but not yet an admitted member. Show as a
          // "pending" placeholder so the nav at least reflects
          // that the user is authed.
          id: null,
          name: user.email!.split("@")[0],
          email: user.email!,
          admittedAt: null,
          status: "pending",
          isAdmin,
        },
  });
}
