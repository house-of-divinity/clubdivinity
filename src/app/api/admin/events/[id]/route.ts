// PATCH /api/admin/events/:id — update event fields. Admin only.

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
  status: z.enum(["upcoming", "past", "cancelled"]),
  posterUrl: z.string().nullable(),
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  venueCity: z.string().nullable(),
  venueState: z.string().nullable(),
});

export async function PATCH(
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
  const v = parsed.data;

  const admin = createSupabaseAdminClient();
  const { error: updateErr } = await admin
    .from("events")
    .update({
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
    .eq("id", id);

  if (updateErr) return error(500, "UPDATE", updateErr.message);

  return NextResponse.json({ ok: true });
}

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
