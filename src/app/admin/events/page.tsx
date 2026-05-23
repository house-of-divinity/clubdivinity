// /admin/events — simple events manager.
// For tonight: list of events as cards with the key fields. Full
// CRUD (poster upload, editing) lands in a future session — for
// now this is the read view + a quick "edit JSON" form.

import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = createSupabaseAdminClient();
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, slug, roman, name, tagline, starts_at, ticket_url, capacity_souls, status, poster_url, hosts",
    )
    .order("starts_at", { ascending: true });

  return (
    <>
      <div className="admin-page-head">
        <h1>Events.</h1>
        <div className="aph-sub">{events?.length ?? 0} on the calendar</div>
      </div>

      {events && events.length > 0 ? (
        <div className="events-grid">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/admin/events/${ev.id}`}
              className="event-card"
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
                transition: "transform .2s, box-shadow .2s",
              }}
            >
              <div className="ec-status">{ev.status}</div>
              <div className="ec-roman">{ev.roman}</div>
              <div className="ec-name">{ev.name}</div>
              {ev.tagline && <div className="ec-tagline">{ev.tagline}</div>}

              <div className="ec-rows">
                <div>
                  <span className="k">Date</span>
                  <span className="v">{formatDate(ev.starts_at)}</span>
                </div>
                <div>
                  <span className="k">Capacity</span>
                  <span className="v">{ev.capacity_souls ?? "—"} souls</span>
                </div>
                {ev.hosts && (
                  <div>
                    <span className="k">Hosts</span>
                    <span className="v">{Array.isArray(ev.hosts) ? ev.hosts.join(" · ") : ev.hosts}</span>
                  </div>
                )}
                {ev.ticket_url && (
                  <div>
                    <span className="k">Tickets</span>
                    <span className="v small">{ev.ticket_url}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 18,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: ".22em",
                  color: "var(--gold)",
                  textTransform: "uppercase",
                }}
              >
                Edit event →
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          No events on the calendar. Seed one in the SQL editor.
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          padding: "20px 24px",
          border: ".5px solid var(--line)",
          color: "var(--ink-mute)",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 16,
          lineHeight: 1.6,
        }}
      >
        To add a <em>new</em> event: open Supabase →{" "}
        <Link
          href="https://supabase.com/dashboard/project/dyqyabqbmrrbetmqlnfj/editor"
          style={{ color: "var(--gold)" }}
        >
          Table Editor → events
        </Link>
        {" "}→ Insert row. The new-event form lands in a later session — for now,
        clicking any card above opens the full editor.
      </div>
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
