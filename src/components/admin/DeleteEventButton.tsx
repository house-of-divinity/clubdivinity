"use client";

// Three-stage delete button for the event edit page. Same safety
// pattern as DeleteApplicationButton — click → confirm → permanent.
//
// Cascades: tickets, the poster file, and unlinks applications +
// email_log. The application records themselves stay (they have
// their own value beyond the event association).

import { useRouter } from "next/navigation";
import { useState } from "react";

type Stage = "idle" | "confirm" | "final";

export default function DeleteEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
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
      const res = await fetch(`/api/admin/events/${eventId}/delete`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Delete failed");
      router.push("/admin/events");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 48,
        padding: 24,
        border: ".5px dashed var(--wine)",
        background: "color-mix(in oklab, var(--wine) 5%, transparent)",
        maxWidth: 720,
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
              marginBottom: 14,
              lineHeight: 1.6,
              textTransform: "uppercase",
            }}
          >
            Cancel is usually better than delete (just set the status to
            Cancelled). Delete only for duplicates or test events.
          </p>
          <button onClick={() => setStage("confirm")} style={dangerButtonStyle()}>
            Delete this event
          </button>
        </>
      )}

      {stage === "confirm" && (
        <>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 18,
              color: "var(--ink)",
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Delete <strong style={{ color: "var(--gold)" }}>{eventName}</strong>?
            All ticket records and the poster file will be removed.
            Applications stay (they just lose their event link).
          </p>
          <div style={{ display: "flex", gap: 10 }}>
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
            This is <strong>permanent</strong>. The event, all its
            tickets, and its poster will be gone forever. There is no undo.
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
          <div style={{ display: "flex", gap: 10 }}>
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
    padding: "12px 22px",
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
    padding: "12px 22px",
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
