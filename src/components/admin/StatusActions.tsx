"use client";

// Right-rail status buttons on the application detail page. Each
// button opens a small inline confirm with an optional "note to
// include in the email" textarea, then POSTs to the status API.
// On success we refresh the route to show new status + audit row.

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "received" | "reviewing" | "approved" | "waitlisted" | "declined" | "withdrawn" | "revoked";

export default function StatusActions({
  applicationId,
  ref_,
  currentStatus,
  applicantEmail,
}: {
  applicationId: string;
  ref_: string;
  currentStatus: string;
  applicantEmail: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Status | null>(null);
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which actions are offered depends on current status.
  const available: { status: Status; label: string; className: string }[] = (() => {
    switch (currentStatus) {
      case "received":
        return [
          { status: "reviewing",  label: "Mark reviewing", className: "ad-btn-r" },
          { status: "approved",   label: "Approve",        className: "ad-btn-a" },
          { status: "waitlisted", label: "Waitlist",       className: "ad-btn-w" },
          { status: "declined",   label: "Decline",        className: "ad-btn-d" },
        ];
      case "reviewing":
      case "waitlisted":
        return [
          { status: "approved",   label: "Approve",  className: "ad-btn-a" },
          { status: "waitlisted", label: "Waitlist", className: "ad-btn-w" },
          { status: "declined",   label: "Decline",  className: "ad-btn-d" },
        ];
      case "approved":
        return [
          { status: "revoked", label: "Revoke membership", className: "ad-btn-revoke" },
        ];
      case "declined":
      case "withdrawn":
      case "revoked":
        return [
          { status: "reviewing", label: "Reopen for review", className: "ad-btn-r" },
        ];
      default:
        return [];
    }
  })();

  const submit = async (status: Status) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reason: note.trim() || undefined,
          sendEmail,
          emailNote: note.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "transition failed");
      setPending(null);
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "transition failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="ad-side-h">Status</div>

      {!pending ? (
        <div className="ad-actions">
          {available.length === 0 ? (
            <div className="ad-action-note">No transitions available from {currentStatus}.</div>
          ) : (
            available.map((a) => (
              <button
                key={a.status}
                className={"ad-btn " + a.className}
                onClick={() => setPending(a.status)}
              >
                {a.label}
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="ad-actions">
          <div className="ad-action-note">
            Confirm <strong style={{ color: "var(--gold)" }}>{pending}</strong> for {ref_}.
            <br />Will email {applicantEmail} if checked.
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              pending === "approved"
                ? "Optional note for the email (e.g. \"It was a beautiful application.\")"
                : "Optional reason — shown in the audit log"
            }
            style={{
              background: "var(--bg)",
              border: ".5px solid var(--line)",
              padding: "12px 14px",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink)",
              outline: "none",
              resize: "vertical",
              minHeight: 70,
            }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              style={{ accentColor: "#c8a352" }}
            />
            Send {pending} email
          </label>
          {error && (
            <div style={{ color: "var(--wine)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
              {error}
            </div>
          )}
          <button
            className="ad-btn ad-btn-a"
            disabled={busy}
            onClick={() => submit(pending)}
          >
            {busy ? "Working…" : `Confirm ${pending}`}
          </button>
          <button
            className="ad-btn ad-btn-d"
            onClick={() => { setPending(null); setNote(""); setError(null); }}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
