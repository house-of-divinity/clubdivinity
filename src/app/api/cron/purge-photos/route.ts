// Daily cron: delete photos from storage for applications that
// have been declined or withdrawn for at least 90 days. Keeps the
// storage bucket lean and honors the "we will not retain your
// photo beyond 90 days" promise in the decline email.
//
// Suggested schedule: daily at 03:00 PT = 10:00 UTC
//   cron-job.org expression: `0 10 * * *`

import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 90;

export async function GET(req: Request) {
  const fail = checkCronAuth(req);
  if (fail) return fail;

  const supabase = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();

  const { data: stale } = await supabase
    .from("applications")
    .select("id, ref, photo_url")
    .in("status", ["declined", "withdrawn"])
    .lt("updated_at", cutoff)
    .not("photo_url", "is", null);

  if (!stale || stale.length === 0) {
    return NextResponse.json({ ok: true, purged: 0 });
  }

  const paths = stale.map((s) => s.photo_url).filter((p): p is string => !!p);
  const { error: removeErr } = await supabase.storage
    .from("applications-photos")
    .remove(paths);

  if (removeErr) {
    return NextResponse.json(
      { ok: false, error: removeErr.message },
      { status: 500 },
    );
  }

  // Null out the photo_url so the admin UI shows "Photo expired".
  const ids = stale.map((s) => s.id);
  await supabase
    .from("applications")
    .update({ photo_url: null })
    .in("id", ids);

  return NextResponse.json({
    ok: true,
    purged: paths.length,
    refs: stale.map((s) => s.ref),
  });
}
