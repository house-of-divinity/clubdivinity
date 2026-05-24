"use client";

// One row on /admin/emails. The label/trigger/state is a Link into
// the editor; the toggle on the right flips `enabled` inline (no
// navigation) by calling PATCH /api/admin/emails/:id with just the
// {enabled} field.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EmailListRow({
  id,
  label,
  trigger,
  hasOverride,
  enabled: initialEnabled,
  updatedAt,
}: {
  id: string;
  label: string;
  trigger: string;
  hasOverride: boolean;
  enabled: boolean;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);

  const flip = async () => {
    if (busy) return;
    const next = !enabled;
    setEnabled(next);   // optimistic
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/emails/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("toggle failed");
      router.refresh();
    } catch {
      setEnabled(!next); // rollback
    } finally {
      setBusy(false);
    }
  };

  let stateLabel: string;
  let stateColor: string;
  if (!enabled) {
    stateLabel = "✕ Silenced";
    stateColor = "var(--wine)";
  } else if (hasOverride) {
    stateLabel = updatedAt
      ? `✦ Customised · edited ${relative(updatedAt)}`
      : "✦ Customised";
    stateColor = "var(--gold)";
  } else {
    stateLabel = "Default copy";
    stateColor = "var(--ink-dim)";
  }

  return (
    <div className="email-row-wrap">
      <Link
        href={`/admin/emails/${encodeURIComponent(id)}`}
        className="email-list-item"
        style={{
          textDecoration: "none",
          color: "inherit",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div className="eli-name">{label}</div>
        <div className="eli-trigger">{trigger}</div>
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

      <button
        type="button"
        onClick={flip}
        disabled={busy}
        className={"email-toggle" + (enabled ? " on" : " off")}
        aria-label={enabled ? "Silence this email" : "Enable this email"}
        title={enabled ? "Click to silence" : "Click to enable"}
      >
        <span className="email-toggle-knob" />
        <span className="email-toggle-label">{enabled ? "ON" : "OFF"}</span>
      </button>
    </div>
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
