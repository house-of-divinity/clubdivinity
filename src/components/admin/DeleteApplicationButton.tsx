"use client";

// Three-stage delete button for the admin application detail page.
// You really shouldn't delete an application — declining is almost
// always better. But for test clutter and edge cases, this exists
// with hard guardrails.
//
// Click 1: red "Delete this application" button → opens confirm
// Click 2: "Are you sure?" → opens final warning
// Click 3: "This is permanent — no undo" → actually deletes,
//          then navigates back to the queue.

import { useRouter } from "next/navigation";
import { useState } from "react";

type Stage = "idle" | "confirm" | "final";

export default function DeleteApplicationButton({
  applicationId,
  ref_,
}: {
  applicationId: string;
  ref_: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStage("idle");
    setError(null);
  };

  const doDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/delete`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Delete failed");
      // Successful delete → leave the now-missing page.
      router.push("/admin/applications");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 32,
        padding: 18,
        border: ".5px dashed var(--wine)",
        background: "color-mix(in oklab, var(--wine) 5%, transparent)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: "var(--wine)",
          marginBottom: 12,
        }}
      >
        ✦ Danger zone
      </div>

      {stage === "idle" && (
        <>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".14em",
              color: "var(--ink-mute)",
              marginBottom: 12,
              lineHeight: 1.5,
              textTransform: "uppercase",
            }}
          >
            Decline is almost always the right choice. Delete only for
            test clutter or duplicates.
          </p>
          <button
            onClick={() => setStage("confirm")}
            style={dangerButtonStyle()}
          >
            Delete this application
          </button>
        </>
      )}

      {stage === "confirm" && (
        <>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 16,
              color: "var(--ink)",
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Delete <strong style={{ color: "var(--gold)" }}>{ref_}</strong>?
            This removes the application, photo, member record (if any),
            tickets, and auth account.
          </p>
          <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
            <button onClick={() => setStage("final")} style={dangerButtonStyle()}>
              Yes, delete it
            </button>
            <button onClick={reset} style={cancelButtonStyle()}>
              Cancel
            </button>
          </div>
        </>
      )}

      {stage === "final" && (
        <>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 18,
              color: "var(--wine)",
              marginBottom: 14,
              lineHeight: 1.4,
            }}
          >
            This is <strong>permanent</strong>. Photo, history, and
            everything tied to this email will be gone forever.
            There is no undo.
          </p>
          {error && (
            <div
              style={{
                color: "var(--wine)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: ".12em",
                marginBottom: 10,
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
            <button
              onClick={doDelete}
              disabled={busy}
              style={{
                ...dangerButtonStyle(),
                background: "var(--wine)",
                color: "#fff",
                borderColor: "var(--wine)",
              }}
            >
              {busy ? "Deleting…" : "DELETE FOREVER"}
            </button>
            <button onClick={reset} disabled={busy} style={cancelButtonStyle()}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function dangerButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 18px",
    border: ".5px solid var(--wine)",
    background: "color-mix(in oklab, var(--wine) 12%, transparent)",
    color: "var(--wine)",
    fontFamily: "var(--font-body)",
    fontSize: 11,
    letterSpacing: ".2em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontWeight: 500,
  };
}

function cancelButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 18px",
    border: ".5px solid var(--line)",
    background: "none",
    color: "var(--ink-mute)",
    fontFamily: "var(--font-body)",
    fontSize: 11,
    letterSpacing: ".2em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
