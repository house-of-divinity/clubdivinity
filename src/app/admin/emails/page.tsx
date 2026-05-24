// /admin/emails — list of lifecycle templates (built-in) + any
// custom broadcast templates admins have created. Each one shows
// whether it's customised + currently enabled, with a link into the
// editor.

import Link from "next/link";
import { loadAllTemplatesForAdmin } from "@/lib/email/templates-admin";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const all = await loadAllTemplatesForAdmin();
  const builtIns = all.filter((t) => !t.isCustom);
  const customs  = all.filter((t) =>  t.isCustom);

  const customisedCount = builtIns.filter((t) => t.hasOverride).length;
  const disabledCount   = all.filter((t) => !t.enabled).length;

  return (
    <>
      <div className="admin-page-head">
        <h1>Emails.</h1>
        <div className="aph-sub">
          {builtIns.length} lifecycle · {customs.length} custom
          {" · "}
          {customisedCount} customised
          {disabledCount > 0 && <> · {disabledCount} silenced</>}
        </div>
      </div>

      <div className="admin-section-h">Lifecycle templates</div>
      <div className="emails-layout" style={{ gridTemplateColumns: "1fr" }}>
        <div className="email-list">
          {builtIns.map((t) => (
            <EmailListItem key={t.id} t={t} />
          ))}
        </div>
      </div>

      <div className="admin-section-h" style={{ marginTop: 40 }}>
        Custom broadcasts
      </div>
      <div className="emails-layout" style={{ gridTemplateColumns: "1fr" }}>
        <div className="email-list">
          {customs.length === 0 && (
            <div className="admin-empty">No custom emails yet.</div>
          )}
          {customs.map((t) => (
            <EmailListItem key={t.id} t={t} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link
          href="/admin/emails/new"
          className="ad-btn ad-btn-a"
          style={{
            display: "inline-block",
            textDecoration: "none",
            padding: "12px 22px",
          }}
        >
          + Create custom email
        </Link>
      </div>
    </>
  );
}

function EmailListItem({
  t,
}: {
  t: Awaited<ReturnType<typeof loadAllTemplatesForAdmin>>[number];
}) {
  let stateLabel: string;
  let stateColor: string;
  if (!t.enabled) {
    stateLabel = "✕ Silenced";
    stateColor = "var(--wine)";
  } else if (t.hasOverride) {
    stateLabel = t.updatedAt
      ? `✦ Customised · edited ${relative(t.updatedAt)}`
      : "✦ Customised";
    stateColor = "var(--gold)";
  } else {
    stateLabel = "Default copy";
    stateColor = "var(--ink-dim)";
  }

  return (
    <Link
      href={`/admin/emails/${encodeURIComponent(t.id)}`}
      className="email-list-item"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="eli-name">{t.label}</div>
      <div className="eli-trigger">{t.trigger}</div>
      <div
        style={{
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: stateColor,
        }}
      >
        {stateLabel}
      </div>
    </Link>
  );
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(ms / 3_600_000);
  if (h > 0) return `${h}h ago`;
  return "just now";
}
