// /admin/applications/:id — Detail.
// Photo (via 10-min signed URL), all form fields, status timeline,
// status-action buttons (those run client-side and call the API),
// and an inline notes panel.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import StatusActions from "@/components/admin/StatusActions";
import NotesPanel from "@/components/admin/NotesPanel";

export const dynamic = "force-dynamic";

export default async function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: app, error } = await supabase
    .from("applications")
    .select(
      "id, ref, type, p1_name, p1_age, p2_name, p2_age, email, phone, city, p1_socials, p2_socials, photo_url, essay, referral, status, created_at, reviewed_at, decision_reason",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !app) notFound();

  // 10-minute signed URL for the photo (private bucket).
  let photoUrl: string | null = null;
  if (app.photo_url) {
    const { data: signed } = await supabase.storage
      .from("applications-photos")
      .createSignedUrl(app.photo_url, 600);
    photoUrl = signed?.signedUrl ?? null;
  }

  const { data: audit } = await supabase
    .from("audit_log")
    .select("id, from_status, to_status, reason, created_at, actor_id")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const { data: notes } = await supabase
    .from("review_notes")
    .select("id, body, created_at, author_id")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="admin-page-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Link
            href="/admin/applications"
            className="aph-sub"
            style={{ textDecoration: "none", color: "var(--ink-mute)" }}
          >
            ← Back to queue
          </Link>
          <h1 style={{ marginTop: 8 }}>
            <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontStyle: "italic" }}>
              {app.ref}
            </span>
          </h1>
          <div className="aph-sub">Submitted {relative(app.created_at)}</div>
        </div>
        <span className={"status-chip s-" + app.status} style={{ fontSize: 11, padding: "8px 14px" }}>
          {app.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 32, alignItems: "start" }}>
        <div>
          {photoUrl ? (
            <div className="ad-photo">
              <div className="ad-photo-frame" style={{ maxWidth: 340 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Applicant" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div className="ad-photo-help">
                Signed URL · expires in 10 minutes
              </div>
            </div>
          ) : (
            <div className="ad-photo">
              <div className="ad-photo-frame" style={{ maxWidth: 340 }}>
                <div className="ad-photo-placeholder">
                  <div className="ad-photo-glyph">D</div>
                  <div className="ad-photo-tag">No photo</div>
                </div>
              </div>
            </div>
          )}

          <div className="ad-block">
            <div className="ad-block-h">Who</div>
            <div className="ad-rows">
              <div className="ad-row"><div className="ad-k">Type</div><div className="ad-v">{app.type === "couple" ? "A couple" : "A woman, alone"}</div></div>
              <div className="ad-row"><div className="ad-k">Partner one</div><div className="ad-v">{app.p1_name} <span style={{ color: "var(--ink-dim)" }}>· {app.p1_age}</span></div></div>
              {app.p2_name && (
                <div className="ad-row"><div className="ad-k">Partner two</div><div className="ad-v">{app.p2_name} <span style={{ color: "var(--ink-dim)" }}>· {app.p2_age}</span></div></div>
              )}
              <div className="ad-row"><div className="ad-k">Email</div><div className="ad-v" style={{ fontFamily: "var(--font-mono)", fontStyle: "normal", fontSize: 13 }}>{app.email}</div></div>
              <div className="ad-row"><div className="ad-k">Phone</div><div className="ad-v" style={{ fontFamily: "var(--font-mono)", fontStyle: "normal", fontSize: 13 }}>{app.phone}</div></div>
              <div className="ad-row"><div className="ad-k">City</div><div className="ad-v">{app.city}</div></div>
            </div>
          </div>

          {(app.p1_socials || app.p2_socials) && (
            <div className="ad-block">
              <div className="ad-block-h">Presence</div>
              <div className="ad-rows">
                {app.p1_socials && <div className="ad-row"><div className="ad-k">{app.p2_socials ? "Partner one" : "Socials"}</div><div className="ad-v">{app.p1_socials}</div></div>}
                {app.p2_socials && <div className="ad-row"><div className="ad-k">Partner two</div><div className="ad-v">{app.p2_socials}</div></div>}
              </div>
            </div>
          )}

          <div className="ad-block">
            <div className="ad-block-h">Why you</div>
            <p className="ad-essay">{app.essay}</p>
          </div>

          <div className="ad-block">
            <div className="ad-block-h">Referral</div>
            <p className="ad-referral">{app.referral}</p>
          </div>
        </div>

        <aside style={{ position: "sticky", top: 32, display: "flex", flexDirection: "column", gap: 28 }}>
          <StatusActions
            applicationId={app.id}
            ref_={app.ref}
            currentStatus={app.status}
            applicantEmail={app.email}
          />

          <div>
            <div className="ad-side-h">Timeline</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {audit?.map((a) => (
                <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={"status-chip s-" + a.to_status} style={{ fontSize: 9 }}>
                      {a.to_status}
                    </span>
                    <span className="at-time">{relative(a.created_at)}</span>
                  </div>
                  {a.reason && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".10em", color: "var(--ink-dim)" }}>
                      {a.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <NotesPanel applicationId={app.id} notes={notes ?? []} />
        </aside>
      </div>
    </>
  );
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
