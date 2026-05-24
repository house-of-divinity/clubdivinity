// Event shape used by the public marketing components. The home
// page server-renders this from the live `events` table (via
// `loadHomeEvent` below) so admin changes flow through immediately.
// NEXT_EVENT_FALLBACK is the last-resort default if the DB is
// empty or the query fails.

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type Event = {
  id: string;
  slug: string;
  roman: string;
  name: string;
  tagline?: string;
  date: string;             // YYYY-MM-DD (Pacific date)
  time?: string;            // free-form door text
  city?: string;
  posterUrl?: string;
  ticketUrl?: string;
  hosts?: string;
  // Public-facing capacity label. Shown on the website if set.
  // Free-form: "Intimate", "By invitation only", etc.
  capacityLabel?: string;
  // Internal seat count — ADMIN ONLY, never shown publicly.
  // Used to draw the "room is filling" capacity bar in admin and
  // to detect sold-out when matched against event_tickets.
  capacityNumber?: number;
  status?: "upcoming" | "past" | "cancelled" | "sold-out";
};

export const NEXT_EVENT_FALLBACK: Event = {
  id: "vi-the-lovers",
  slug: "vi-the-lovers",
  roman: "VI",
  name: "The Lovers",
  tagline: "A Wilde Night where the Sky's the limit",
  date: "2026-06-19",
  city: "Las Vegas",
  posterUrl: "/assets/lovers-poster.jpeg",
  ticketUrl: "https://divinity.ticketspice.com/vi-the-lovers",
  hosts: "Madison Wilde · Bree Sky",
  capacityNumber: 60,
  status: "upcoming",
};

// Load the next gathering for the public homepage. Picks the
// soonest event whose status is upcoming OR sold-out (sold-out
// events still need to show with the "at capacity" UI). Falls
// back to the seeded VI · The Lovers if the table is empty.
export async function loadHomeEvent(): Promise<Event> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: row } = await supabase
      .from("events")
      .select(
        "id, slug, roman, name, tagline, starts_at, location_city, ticket_url, poster_url, capacity_label, capacity_souls, status, hosts",
      )
      .in("status", ["upcoming", "sold-out"])
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!row) return NEXT_EVENT_FALLBACK;

    return {
      id: row.id,
      slug: row.slug,
      roman: row.roman,
      name: row.name,
      tagline: row.tagline ?? undefined,
      date: toPacificDate(row.starts_at),
      city: row.location_city ?? "Las Vegas",
      posterUrl: row.poster_url ?? undefined,
      ticketUrl: row.ticket_url ?? undefined,
      hosts: Array.isArray(row.hosts) ? row.hosts.join(" · ") : (row.hosts ?? undefined),
      capacityLabel: row.capacity_label ?? undefined,
      capacityNumber: row.capacity_souls ?? undefined,
      status: row.status as Event["status"],
    };
  } catch {
    return NEXT_EVENT_FALLBACK;
  }
}

// Postgres timestamptz returns as UTC. Our formatters expect a
// "YYYY-MM-DD" in the event's local (Pacific) timezone so the date
// shown to visitors matches the actual gathering day, not the UTC
// rollover.
function toPacificDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
