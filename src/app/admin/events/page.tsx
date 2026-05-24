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
      "id, slug, roman, name, tagline, starts_at, ticket_url, capacity_label, capacity_souls, status, poster_url, hosts",
    )
    .order("starts_at", { ascending: true });

  return (
    <>
      <div
        className="admin-page-head"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}
      >
        <div>
          <h1>Events.</h1>
          <div className="aph-sub">{events?.length ?? 0} on the calendar</div>
        </div>
        <Link
          href="/admin/events/new"
          className="btn-gold"
          style={{ textDecoration: "none" }}
        >
          + New event <span className="arr">→</span>
        </Link>
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
                  <span className="k">Capacity (public)</span>
                  <span className="v">{ev.capacity_label ?? "—"}</span>
                </div>
                <div>
                  <span className="k">Capacity (internal)</span>
                  <span className="v small">{ev.capacity_souls ?? "—"} seats · hidden from public</span>
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
          No events on the calendar yet.{" "}
          <Link href="/admin/events/new" style={{ color: "var(--gold)" }}>
            Create the first one →
          </Link>
        </div>
      )}
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
