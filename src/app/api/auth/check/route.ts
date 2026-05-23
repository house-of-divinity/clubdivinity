// POST /api/auth/check { email }
//
// Returns whether we should send a sign-in code to this email.
// Allowed if the email is:
//   - an admitted member (row in `members`), OR
//   - a pending applicant (row in `applications`), OR
//   - a Supabase Auth user with role:admin
// Otherwise: not recognized. The SignInModal uses this to avoid
// sending magic-link emails to random addresses (which would
// otherwise auto-create a Supabase auth user and email them).

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email: string | undefined = body?.email?.toString().trim().toLowerCase();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { allowed: false, reason: "invalid-email" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  // 1. Members get in.
  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (member) {
    return NextResponse.json({ allowed: true, reason: "member" });
  }

  // 2. Pending applicants get in (so they can see their status).
  const { data: application } = await admin
    .from("applications")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (application) {
    return NextResponse.json({ allowed: true, reason: "applicant" });
  }

  // 3. Admins get in regardless of member/applicant status.
  // listUsers is paginated; 1000 per page is plenty for any
  // realistic admin count.
  const { data: { users } } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const adminUser = users.find(
    (u) =>
      u.email?.toLowerCase() === email &&
      (u.app_metadata as Record<string, unknown> | null)?.role === "admin",
  );
  if (adminUser) {
    return NextResponse.json({ allowed: true, reason: "admin" });
  }

  return NextResponse.json({ allowed: false, reason: "not-recognized" });
}
