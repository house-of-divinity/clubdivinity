// POST /api/applications — public endpoint that accepts a new
// application + photo as multipart/form-data, uploads the photo
// to Supabase Storage, inserts the row, and returns the public
// reference (e.g. DV-A3F9KX) for the applicant's records.
//
// The applicant is anonymous, so we use the admin client which
// bypasses RLS. Validation re-runs server-side on the same Zod
// schema the client uses — defense in depth.

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { applicationSchema } from "@/lib/validations";
import { generateRef } from "@/lib/ref";
import { sendEmail } from "@/lib/email/send";
import { notifyDiscord, newApplicationEmbed } from "@/lib/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB hard ceiling

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "INVALID_BODY", "Expected multipart/form-data");
  }

  // ─── 1. Validate fields ───────────────────────────────────
  const raw = {
    type: form.get("type"),
    p1Name: form.get("p1Name"),
    p1Age: form.get("p1Age"),
    p2Name: form.get("p2Name") || undefined,
    p2Age: form.get("p2Age") || undefined,
    email: form.get("email"),
    phone: form.get("phone"),
    city: form.get("city"),
    p1Socials: form.get("p1Socials") || "",
    p2Socials: form.get("p2Socials") || "",
    essay: form.get("essay"),
    referral: form.get("referral"),
  };

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(
      422,
      "VALIDATION",
      `${first.path.join(".") || "field"}: ${first.message}`,
    );
  }
  const data = parsed.data;

  // ─── 2. Validate photo ────────────────────────────────────
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return jsonError(422, "VALIDATION", "photo: required");
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return jsonError(413, "TOO_LARGE", "Photo exceeds 10 MB");
  }
  if (!photo.type.startsWith("image/")) {
    return jsonError(422, "VALIDATION", "photo: not an image");
  }

  // ─── 3. Generate ref + look up the upcoming event ─────────
  const supabase = createSupabaseAdminClient();
  const ref = generateRef();

  const { data: ev } = await supabase
    .from("events")
    .select("id")
    .eq("status", "upcoming")
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // ─── 4. Upload the photo first so we can store its path ──
  // Path: applications/{ref}/{timestamp}.{ext}
  // The bucket is private; admins generate signed URLs to view.
  const ext = photo.name.split(".").pop()?.toLowerCase() || "webp";
  const storagePath = `applications/${ref}/${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("applications-photos")
    .upload(storagePath, photo, {
      contentType: photo.type,
      upsert: false,
    });
  if (uploadErr) {
    return jsonError(
      500,
      "STORAGE",
      "Couldn't save the photo. Please try again.",
    );
  }

  // ─── 5. Insert the application row ────────────────────────
  const { data: inserted, error: insertErr } = await supabase
    .from("applications")
    .insert({
      ref,
      type: data.type,
      event_id: ev?.id ?? null,
      p1_name: data.p1Name,
      p1_age: data.p1Age,
      p2_name: data.p2Name ?? null,
      p2_age: data.p2Age ?? null,
      email: data.email,
      phone: data.phone,
      city: data.city,
      p1_socials: data.p1Socials || null,
      p2_socials: data.p2Socials || null,
      photo_url: storagePath,
      essay: data.essay,
      referral: data.referral,
      status: "received",
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    // Clean up the orphan photo so storage doesn't fill with
    // garbage from failed submissions.
    await supabase.storage.from("applications-photos").remove([storagePath]);
    return jsonError(500, "INSERT", "Couldn't save your application.");
  }

  // ─── 6. Audit log entry: null → received ─────────────────
  await supabase.from("audit_log").insert({
    application_id: inserted.id,
    actor_id: null,
    from_status: null,
    to_status: "received",
    reason: "submitted",
  });

  // ─── 7. Fire the "your file is in the room" email ────────
  // Email failure shouldn't fail the submission — the row + photo
  // are already saved, the applicant has a ref shown on screen, and
  // an admin alert tells us to follow up manually.
  try {
    await sendEmail({
      template: "application-received",
      to: data.email,
      vars: { ref },
      applicationId: inserted.id,
    });
  } catch (e) {
    console.error("[application-received] email failed:", e);
  }

  // ─── 8. Discord ping — admins get a notification in #divinity ─
  // No-op if DISCORD_WEBHOOK_URL isn't set. Best-effort like email:
  // a webhook outage shouldn't fail an application submission.
  try {
    const url = new URL(req.url);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      `${url.protocol}//${url.host}`;
    await notifyDiscord({
      embeds: [newApplicationEmbed({
        ref,
        type: data.type,
        p1Name: data.p1Name,
        p2Name: data.p2Name ?? null,
        city: data.city,
        email: data.email,
        applicationId: inserted.id,
        siteUrl,
      })],
    });
  } catch (e) {
    console.error("[discord] notify failed:", e);
  }

  return NextResponse.json({ ref });
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
