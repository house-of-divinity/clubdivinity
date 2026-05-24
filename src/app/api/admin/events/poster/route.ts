// POST /api/admin/events/poster
//
// Accepts a multipart/form-data file upload from the admin Event
// editor. Uploads to the `event-posters` Supabase Storage bucket
// (public) and returns the public URL to drop into the event's
// poster_url field.
//
// Admin only. Server-side upload via the service-role client so we
// don't have to deal with browser-side direct uploads.

import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap

export async function POST(req: Request) {
  // Admin gate
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return err(401, "AUTH", "Sign in required");
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return err(403, "FORBIDDEN", "Admin only");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err(400, "INVALID_BODY", "Expected multipart/form-data");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return err(422, "VALIDATION", "file: required");
  }
  if (file.size > MAX_BYTES) {
    return err(413, "TOO_LARGE", "Poster exceeds 10 MB");
  }
  if (!file.type.startsWith("image/")) {
    return err(422, "VALIDATION", "file: must be an image");
  }

  const admin = createSupabaseAdminClient();

  // Path: posters/{timestamp}-{random}.{ext}
  // Timestamp + random keeps uploads from colliding even when an
  // admin uploads the same file twice in quick succession.
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `posters/${stamp}-${rand}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from("event-posters")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) {
    return err(500, "STORAGE", `Couldn't upload: ${uploadErr.message}`);
  }

  // Public URL for the bucket.
  const { data: pub } = admin.storage
    .from("event-posters")
    .getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    url: pub.publicUrl,
    path,
  });
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
