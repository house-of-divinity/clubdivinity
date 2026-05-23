// GET /api/me  — returns the signed-in user's full profile state.
//
// Response shape:
//   user        — { id, email, isAdmin } | null. null = not signed in.
//   member      — full member row IF they're admitted. For admins
//                 without a real members row, we synthesise a
//                 profile so the Nav chip + Curator link still
//                 render. For pending applicants, this is null.
//   application — most recent application by this email IF they
//                 don't have a members row. Pending applicants
//                 use this to show the status overlay.
//                 Null when they ARE a member or when no application
//                 exists for the email at all.

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
    return NextResponse.json({ user: null, member: null, application: null });
  }

  const admin = createSupabaseAdminClient();
  const isAdmin =
    (user.app_metadata as Record<string, unknown> | null)?.role === "admin";

  // Real member lookup
  const { data: realMember } = await admin
    .from("members")
    .select("id, name, email, admitted_at, status, pair_id")
    .eq("email", user.email!)
    .maybeSingle();

  // Most recent application — only relevant if not already a member
  let application: {
    ref: string;
    status: string;
    submittedAt: string;
    decidedAt: string | null;
  } | null = null;

  if (!realMember) {
    const { data: app } = await admin
      .from("applications")
      .select("ref, status, created_at, reviewed_at")
      .eq("email", user.email!)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (app) {
      application = {
        ref: app.ref,
        status: app.status,
        submittedAt: app.created_at,
        decidedAt: app.reviewed_at,
      };
    }
  }

  // Member shown to the Nav. Real member preferred. Admins without
  // a members row get a synthesised profile so the Curator chip
  // + dropdown still works.
  let memberProfile: {
    id: string | null;
    name: string;
    email: string;
    admittedAt: string | null;
    status: string;
    isAdmin: boolean;
  } | null = null;

  if (realMember) {
    memberProfile = {
      id: realMember.id,
      name: realMember.name,
      email: realMember.email,
      admittedAt: realMember.admitted_at,
      status: realMember.status,
      isAdmin,
    };
  } else if (isAdmin) {
    // Synthesise a name from the email's local part
    const local = user.email!.split("@")[0].split(/[._-]/)[0];
    memberProfile = {
      id: null,
      name: local.charAt(0).toUpperCase() + local.slice(1),
      email: user.email!,
      admittedAt: null,
      status: "admin",
      isAdmin: true,
    };
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, isAdmin },
    member: memberProfile,
    application,
  });
}
