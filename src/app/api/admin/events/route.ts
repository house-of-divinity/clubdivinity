// POST /api/admin/events — create a new event. Admin only.
// Auto-generates a URL-friendly slug from roman + name. If the
// slug collides, appends -2, -3, etc. until unique.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  roman: z.string().trim().min(1),
  name: z.string().trim().min(1),
  tagline: z.string().nullable(),
  startsAt: z.string(),
  locationCity: z.string().trim(),
  ticketUrl: z.string().nullable(),
  ticketspiceFormId: z.number().int().nonnegative().nullable(),
  capacityLabel: z.string().nullable(),
  capacitySeats: z.number().int().nonnegative().nullable(),
  hosts: z.array(z.string()),
  status: z.enum(["upcoming", "sold-out", "past", "cancelled"]),
  posterUrl: z.string().nullable(),
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  venueCity: z.string().nullable(),
  venueState: z.string().nullable(),
});

export async function POST(req: Request) {
  const server = await createSupabaseServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return err(401, "AUTH", "Sign in required");
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return err(403, "FORBIDDEN", "Admin only");

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return err(422, "VALIDATION", parsed.error.issues[0]?.message ?? "Invalid body");
  }
  const v = parsed.data;

  const admin = createSupabaseAdminClient();
  const slug = await pickUniqueSlug(admin, `${v.roman}-${v.name}`);

  const { data: created, error: insertErr } = await admin
    .from("events")
    .insert({
      slug,
      roman: v.roman,
      name: v.name,
      tagline: v.tagline,
      starts_at: v.startsAt,
      location_city: v.locationCity,
      ticket_url: v.ticketUrl,
      ticketspice_form_id: v.ticketspiceFormId,
      capacity_label: v.capacityLabel,
      capacity_souls: v.capacitySeats,
      hosts: v.hosts,
      status: v.status,
      poster_url: v.posterUrl,
      venue_name: v.venueName,
      venue_address: v.venueAddress,
      venue_city: v.venueCity,
      venue_state: v.venueState,
    })
    .select("id, slug")
    .single();

  if (insertErr || !created) return err(500, "INSERT", insertErr?.message ?? "Couldn't create event");

  return NextResponse.json({ ok: true, id: created.id, slug: created.slug });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")          // strip diacritics
    .replace(/[^\w\s-]/g, "")                   // remove non-word
    .replace(/\s+/g, "-")                       // spaces -> dashes
    .replace(/-+/g, "-")                        // collapse dashes
    .replace(/^-|-$/g, "");                     // trim dashes
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function pickUniqueSlug(admin: AdminClient, base: string): Promise<string> {
  const baseSlug = slugify(base) || "event";
  let candidate = baseSlug;
  for (let i = 2; i < 100; i++) {
    const { data: existing } = await admin
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!existing) return candidate;
    candidate = `${baseSlug}-${i}`;
  }
  // After 100 collisions just append a timestamp suffix.
  return `${baseSlug}-${Date.now()}`;
}

function err(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
