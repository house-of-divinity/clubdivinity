import HomeClient from "@/components/HomeClient";
import { NEXT_EVENT_FALLBACK, type Event } from "@/lib/event";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Server component. Reads the next gathering from the live events
// table on every request and hands it to HomeClient. Admin changes
// (status flips, poster swaps, etc.) appear publicly within seconds.

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const event = await loadHomeEvent();
  return <HomeClient event={event} />;
}

async function loadHomeEvent(): Promise<Event> {
  try {
    const supabase = createSupabaseAdminClient();
    // 12-hour grace window so the event still shows on its own day
    // (and a few hours after door time for late-night refreshes).
    // After that, it drops off and the next upcoming event takes over —
    // even if an admin forgot to flip status from 'upcoming' to 'past'.
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data: row } = await supabase
      .from("events")
      .select(
        "id, slug, roman, name, tagline, starts_at, location_city, ticket_url, poster_url, capacity_label, capacity_souls, status, hosts",
      )
      .in("status", ["upcoming", "sold-out"])
      .gte("starts_at", cutoff)
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
      hosts: Array.isArray(row.hosts)
        ? row.hosts.join(" · ")
        : (row.hosts ?? undefined),
      capacityLabel: row.capacity_label ?? undefined,
      capacityNumber: row.capacity_souls ?? undefined,
      status: row.status as Event["status"],
    };
  } catch {
    return NEXT_EVENT_FALLBACK;
  }
}

// Postgres timestamptz returns as UTC. The public formatters expect
// "YYYY-MM-DD" in the event's local (Pacific) timezone so the date
// visitors see matches the actual gathering day, not the UTC rollover.
function toPacificDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
