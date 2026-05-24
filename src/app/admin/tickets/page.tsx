// /admin/tickets — sales view per event.
// Pill filters at top (one per event), then a capacity bar +
// orders/seats/gross meta band, then the ticket table for that
// event. Synced hourly from TicketSpice via /api/cron/sync-tickets.

import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SP = Promise<{ event?: string }>;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const supabase = createSupabaseAdminClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, slug, roman, name, status, capacity_souls, capacity_label, starts_at")
    .order("starts_at", { ascending: true });

  // Default to the first upcoming-or-sold-out event, fall back to
  // the first event if none.
  const candidates = events ?? [];
  const defaultEvent =
    candidates.find((e) => e.status === "upcoming" || e.status === "sold-out") ??
    candidates[0];

  const selectedSlug = sp.event || defaultEvent?.slug;
  const selected = candidates.find((e) => e.slug === selectedSlug) ?? defaultEvent;

  let tickets: Array<{
    id: string;
    buyer_email: string;
    purchased_at: string;
    quantity: number;
    raw: Record<string, unknown> | null;
    member_id: string | null;
  }> = [];
  let memberById = new Map<string, string>();
  let grossCents = 0;

  if (selected) {
    const { data: rows } = await supabase
      .from("event_tickets")
      .select("id, buyer_email, purchased_at, quantity, raw, member_id")
      .eq("event_id", selected.id)
      .order("purchased_at", { ascending: false });

    tickets = rows ?? [];

    const memberIds = Array.from(
      new Set(tickets.map((t) => t.member_id).filter((id): id is string => !!id)),
    );
    if (memberIds.length > 0) {
      const { data: members } = await supabase
        .from("members")
        .select("id, name")
        .in("id", memberIds);
      memberById = new Map((members ?? []).map((m) => [m.id, m.name]));
    }

    grossCents = tickets.reduce((sum, t) => {
      const r = t.raw as Record<string, unknown> | null;
      const total = (r && typeof r["total"] === "number") ? (r["total"] as number) : 0;
      // TicketSpice returns totals in dollars already (decimal), so
      // multiply by 100 to keep math integer.
      return sum + Math.round(total * 100);
    }, 0);
  }

  return (
    <>
      <div className="admin-page-head">
        <h1>Tickets.</h1>
        <div className="aph-sub">
          {selected ? `${selected.roman} · ${selected.name}` : "No events"}
        </div>
      </div>

      {candidates.length > 0 && (
        <div className="admin-filters">
          <div className="filter-row">
            <span className="filter-label">Event</span>
            <div className="filter-pills">
              {candidates.map((ev) => {
                const on = ev.slug === selected?.slug;
                return (
                  <Link
                    key={ev.id}
                    href={`/admin/tickets?event=${ev.slug}`}
                    className={"pill" + (on ? " on" : "")}
                    style={{ textDecoration: "none" }}
                  >
                    {ev.roman} · {ev.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <>
          {selected.capacity_souls ? (
            <div className="admin-band">
              <div className="band-head">
                <div className="band-eye">The room is filling — internal capacity</div>
                <div className="band-num">
                  {tickets.length} / {selected.capacity_souls}
                </div>
              </div>
              <div className="cap-bar">
                <div
                  className="cap-bar-fill"
                  style={{
                    width: `${Math.min(100, (tickets.length / selected.capacity_souls) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="admin-band">
              <div className="band-head">
                <div className="band-eye">No internal capacity set</div>
                <div className="band-num">{tickets.length}</div>
              </div>
            </div>
          )}

          <div className="tickets-meta">
            <div>
              <span className="k">Orders</span>
              <span className="v">{tickets.length}</span>
            </div>
            <div>
              <span className="k">Seats sold</span>
              <span className="v">
                {tickets.reduce((s, t) => s + (t.quantity ?? 1), 0)}
              </span>
            </div>
            <div>
              <span className="k">Gross</span>
              <span className="v">${(grossCents / 100).toFixed(2)}</span>
            </div>
            <div>
              <span className="k">Matched members</span>
              <span className="v">
                {tickets.filter((t) => t.member_id).length}
              </span>
            </div>
          </div>

          {tickets.length > 0 ? (
            <div className="admin-table" style={{ marginTop: 20 }}>
              <div
                className="at-head"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1.4fr 110px 110px",
                  padding: "14px 20px",
                }}
              >
                <div>Buyer email</div>
                <div>Matched member</div>
                <div>Purchased</div>
                <div>Amount</div>
              </div>
              {tickets.map((t) => {
                const r = t.raw as Record<string, unknown> | null;
                const total = (r && typeof r["total"] === "number") ? (r["total"] as number) : null;
                return (
                  <div
                    key={t.id}
                    className="at-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 1.4fr 110px 110px",
                      padding: "16px 20px",
                      cursor: "default",
                    }}
                  >
                    <div className="at-email">{t.buyer_email}</div>
                    <div>
                      {t.member_id ? (
                        <Link
                          href={`/admin/members`}
                          style={{
                            fontFamily: "var(--font-display)",
                            fontStyle: "italic",
                            color: "var(--ink)",
                            textDecoration: "none",
                          }}
                        >
                          {memberById.get(t.member_id) ?? "—"}
                        </Link>
                      ) : (
                        <span
                          className="at-pair"
                          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-dim)" }}
                        >
                          NOT MATCHED
                        </span>
                      )}
                    </div>
                    <div className="at-time">{relative(t.purchased_at)}</div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--gold)",
                      }}
                    >
                      {total !== null ? `$${total.toFixed(2)}` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty" style={{ marginTop: 20 }}>
              No tickets sold yet for this event.
              {!selected.capacity_souls && (
                <div
                  style={{
                    marginTop: 12,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "var(--ink-dim)",
                  }}
                >
                  TicketSpice sync runs hourly at :15 past
                </div>
              )}
            </div>
          )}
        </>
      )}

      {candidates.length === 0 && (
        <div className="admin-empty">
          No events on the calendar.{" "}
          <Link href="/admin/events/new" style={{ color: "var(--gold)" }}>
            Create one →
          </Link>
        </div>
      )}
    </>
  );
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(ms / 3_600_000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(ms / 60_000);
  if (m > 0) return `${m}m ago`;
  return "Just now";
}
