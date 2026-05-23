// /admin — Curator Overview. Five metric tiles + a capacity bar
// for the next event + a recent-activity feed. All queries run
// server-side via the admin client (bypassing RLS).

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const supabase = createSupabaseAdminClient();

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Run all the count queries in parallel for speed.
  const [
    queueCount,
    weekCount,
    monthApprovedCount,
    membersCount,
    nextEvent,
    activity,
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .in("status", ["received", "reviewing"]),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfWeek.toISOString()),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("reviewed_at", startOfMonth.toISOString()),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("events")
      .select("id, slug, roman, name, starts_at, capacity_souls")
      .eq("status", "upcoming")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("audit_log")
      .select(
        "id, to_status, created_at, application:applications!inner(ref, p1_name, p2_name)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  let ticketsSold = 0;
  if (nextEvent.data) {
    const { count } = await supabase
      .from("event_tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", nextEvent.data.id);
    ticketsSold = count ?? 0;
  }

  const nights = nextEvent.data
    ? Math.max(
        0,
        Math.ceil(
          (new Date(nextEvent.data.starts_at).getTime() - Date.now()) / 86_400_000,
        ),
      )
    : 0;

  return (
    <>
      <div className="admin-page-head">
        <h1>Overview.</h1>
        <div className="aph-sub">The room — at a glance</div>
      </div>

      <div className="admin-tiles">
        <Tile label="In queue" value={queueCount.count ?? 0} sub="Awaiting first look" />
        <Tile label="This week" value={weekCount.count ?? 0} sub="New applications" />
        <Tile label="Approved" value={monthApprovedCount.count ?? 0} sub="This month" />
        <Tile label="Members" value={membersCount.count ?? 0} sub="Active" />
        <Tile
          label="Next event"
          value={nights}
          sub={nextEvent.data ? `${nextEvent.data.roman} · ${nextEvent.data.name}` : "—"}
        />
      </div>

      {nextEvent.data && nextEvent.data.capacity_souls && (
        <div className="admin-band">
          <div className="band-head">
            <div className="band-eye">The room is filling — internal capacity</div>
            <div className="band-num">
              {ticketsSold} / {nextEvent.data.capacity_souls}
            </div>
          </div>
          <div className="cap-bar">
            <div
              className="cap-bar-fill"
              style={{
                width: `${Math.min(100, (ticketsSold / nextEvent.data.capacity_souls) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <h2 className="admin-section-h">Recently arrived</h2>

      {activity.data && activity.data.length > 0 ? (
        <div className="admin-table">
          {activity.data.map((row) => {
            const app = (row.application as unknown) as
              | { ref: string; p1_name: string; p2_name: string | null }
              | null;
            return (
              <div key={row.id} className="at-row" style={{ gridTemplateColumns: "120px 1fr 140px 160px" }}>
                <div className="at-ref">{app?.ref ?? "—"}</div>
                <div>
                  <em style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--ink)" }}>
                    {app?.p1_name}
                    {app?.p2_name && <> <span className="and">&amp;</span> {app.p2_name}</>}
                  </em>
                </div>
                <div>
                  <StatusChip status={row.to_status} />
                </div>
                <div className="at-time">{relative(row.created_at)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-empty">
          The room is quiet. Nothing has arrived yet.
        </div>
      )}
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="admin-tile">
      <div className="tile-k">{label}</div>
      <div className="tile-v">{value}</div>
      <div className="tile-sub">{sub}</div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  return <span className={"status-chip s-" + status}>{status}</span>;
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
