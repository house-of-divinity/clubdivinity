// /admin/emails — list of all 7 lifecycle templates.
// Each one shows whether it's currently customised (override
// exists) or running on the default copy. Click → edit.

import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { TEMPLATES, TEMPLATE_IDS } from "@/lib/email/templates-meta";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const supabase = createSupabaseAdminClient();
  const { data: overrides } = await supabase
    .from("email_templates")
    .select("id, updated_at");

  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.id, o.updated_at as string]),
  );

  return (
    <>
      <div className="admin-page-head">
        <h1>Emails.</h1>
        <div className="aph-sub">
          {TEMPLATE_IDS.length} lifecycle templates · {overrideMap.size} customised
        </div>
      </div>

      <div className="emails-layout" style={{ gridTemplateColumns: "1fr" }}>
        <div className="email-list">
          {TEMPLATE_IDS.map((id) => {
            const meta = TEMPLATES[id];
            const overridden = overrideMap.get(id);
            return (
              <Link
                key={id}
                href={`/admin/emails/${id}`}
                className="email-list-item"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="eli-name">{meta.label}</div>
                <div className="eli-trigger">{meta.trigger}</div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: overridden ? "var(--gold)" : "var(--ink-dim)",
                  }}
                >
                  {overridden
                    ? `✦ Customised · edited ${relative(overridden)}`
                    : "Default copy"}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
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
