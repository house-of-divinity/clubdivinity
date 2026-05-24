// /admin/emails — list of lifecycle templates (built-in) + any
// custom broadcast templates admins have created. Each row has an
// inline ON/OFF toggle that flips `enabled` without leaving the page.

import Link from "next/link";
import { loadAllTemplatesForAdmin } from "@/lib/email/templates-admin";
import EmailListRow from "@/components/admin/EmailListRow";

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
            <EmailListRow
              key={t.id}
              id={t.id}
              label={t.label}
              trigger={t.trigger}
              hasOverride={t.hasOverride}
              enabled={t.enabled}
              updatedAt={t.updatedAt}
            />
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
            <EmailListRow
              key={t.id}
              id={t.id}
              label={t.label}
              trigger={t.trigger}
              hasOverride={t.hasOverride}
              enabled={t.enabled}
              updatedAt={t.updatedAt}
            />
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
