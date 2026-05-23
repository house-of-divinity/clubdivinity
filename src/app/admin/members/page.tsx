// /admin/members — table of admitted members. Click a row to jump
// to the originating application (where you can revoke if needed).

import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const GRID = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1.4fr 130px 1fr 90px 140px 32px",
  alignItems: "center",
} as const;

export default async function MembersPage() {
  const supabase = createSupabaseAdminClient();
  const { data: members } = await supabase
    .from("members")
    .select(
      "id, name, email, status, admitted_at, pair_id, application_id",
    )
    .order("admitted_at", { ascending: false });

  // Tickets per member (one extra query is fine at our volume).
  const { data: tickets } = await supabase
    .from("event_tickets")
    .select("member_id");
  const ticketCount = new Map<string, number>();
  tickets?.forEach((t) => {
    if (!t.member_id) return;
    ticketCount.set(t.member_id, (ticketCount.get(t.member_id) ?? 0) + 1);
  });

  // Pair partner name lookup (cheap join via the same array).
  const byPair = new Map<string, string[]>();
  members?.forEach((m) => {
    if (!m.pair_id) return;
    const arr = byPair.get(m.pair_id) ?? [];
    arr.push(m.name);
    byPair.set(m.pair_id, arr);
  });
  const partnerName = (m: { id: string; pair_id: string | null; name: string }) => {
    if (!m.pair_id) return "—";
    return byPair.get(m.pair_id)?.filter((n) => n !== m.name)[0] ?? "—";
  };

  return (
    <>
      <div className="admin-page-head">
        <h1>Members.</h1>
        <div className="aph-sub">{members?.length ?? 0} admitted · sorted newest first</div>
      </div>

      {members && members.length > 0 ? (
        <div className="admin-table">
          <div className="at-head" style={GRID}>
            <div>Name</div>
            <div>Email</div>
            <div>Admitted</div>
            <div>Pair</div>
            <div>Tickets</div>
            <div>Standing</div>
            <div></div>
          </div>
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/admin/applications/${m.application_id}`}
              className="at-row"
              style={{ ...GRID, textDecoration: "none", color: "inherit" }}
            >
              <div className="at-name"><em>{m.name}</em></div>
              <div className="at-email">{m.email}</div>
              <div className="at-time">{relative(m.admitted_at)}</div>
              <div className="at-pair">{partnerName(m)}</div>
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)" }}>
                  {ticketCount.get(m.id) ?? 0}
                </span>
              </div>
              <div>
                <MemberStanding status={m.status} />
              </div>
              <div className="at-arr">→</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          No members yet. Approve an application to admit the first.
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
  return "Today";
}

function MemberStanding({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "var(--gold)",
          border: ".5px solid var(--gold)",
          padding: "5px 10px",
          background: "color-mix(in oklab, var(--gold) 8%, transparent)",
        }}
      >
        ✦ Good standing
      </span>
    );
  }
  if (status === "revoked") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "var(--wine)",
          border: ".5px dashed var(--wine)",
          padding: "5px 10px",
        }}
      >
        Revoked
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          border: ".5px solid var(--ink-mute)",
          padding: "5px 10px",
        }}
      >
        Paused
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        letterSpacing: ".18em",
        textTransform: "uppercase",
        color: "var(--ink-dim)",
      }}
    >
      {status}
    </span>
  );
}
