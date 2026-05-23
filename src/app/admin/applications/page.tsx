// /admin/applications — Queue.
// Filter pills (status), search by ref / name / email, table of
// rows that link into the per-application detail page.

import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { id: "all",         label: "All" },
  { id: "received",    label: "Received" },
  { id: "reviewing",   label: "Reviewing" },
  { id: "approved",    label: "Approved" },
  { id: "waitlisted",  label: "Waitlisted" },
  { id: "declined",    label: "Declined" },
] as const;

type SP = Promise<{ status?: string; q?: string }>;

export default async function ApplicationsQueue({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const status = (sp.status as string) || "all";
  const q = (sp.q as string) || "";

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("applications")
    .select(
      "id, ref, type, p1_name, p2_name, email, referral, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status);
  if (q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(
      `ref.ilike.${term},p1_name.ilike.${term},p2_name.ilike.${term},email.ilike.${term},referral.ilike.${term}`,
    );
  }

  const { data: rows } = await query;

  return (
    <>
      <div className="admin-page-head">
        <h1>Applications.</h1>
        <div className="aph-sub">
          {rows?.length ?? 0} in view · sorted newest first
        </div>
      </div>

      <div className="admin-filters">
        <div className="filter-row">
          <span className="filter-label">Status</span>
          <div className="filter-pills">
            {STATUS_FILTERS.map((f) => {
              const href = buildHref({ status: f.id === "all" ? undefined : f.id, q: q || undefined });
              const on = (f.id === "all" && status === "all") || f.id === status;
              return (
                <Link
                  key={f.id}
                  href={href}
                  className={"pill" + (on ? " on" : "")}
                  style={{ textDecoration: "none" }}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
          <form className="filter-search" action="/admin/applications" method="get">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <input
              type="search"
              name="q"
              placeholder="ref, name, email, referrer…"
              defaultValue={q}
            />
          </form>
        </div>
      </div>

      {rows && rows.length > 0 ? (
        <div className="admin-table">
          <div className="at-head" style={GRID}>
            <div>Ref</div>
            <div>Name(s)</div>
            <div>Email</div>
            <div>Referral</div>
            <div>Status</div>
            <div>Submitted</div>
            <div></div>
          </div>
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/applications/${r.id}`}
              className="at-row"
              style={{ ...GRID, textDecoration: "none", color: "inherit" }}
            >
              <div className="at-ref">{r.ref}</div>
              <div className="at-name">
                <span className="at-type">{r.type}</span>
                <em>{r.p1_name}</em>
                {r.p2_name && (
                  <>
                    <span className="and">&amp;</span>
                    <em>{r.p2_name}</em>
                  </>
                )}
              </div>
              <div className="at-email">{r.email}</div>
              <div className="at-ref-by">{r.referral}</div>
              <div>
                <span className={"status-chip s-" + r.status}>{r.status}</span>
              </div>
              <div className="at-time">{relative(r.created_at)}</div>
              <div className="at-arr">→</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          The room is quiet. No applications match these filters.
        </div>
      )}
    </>
  );
}

const GRID = {
  display: "grid",
  gridTemplateColumns: "120px 1.4fr 1.2fr 1fr 110px 110px 32px",
  alignItems: "center",
} as const;

function buildHref(p: { status?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (p.status) params.set("status", p.status);
  if (p.q) params.set("q", p.q);
  const qs = params.toString();
  return "/admin/applications" + (qs ? `?${qs}` : "");
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
