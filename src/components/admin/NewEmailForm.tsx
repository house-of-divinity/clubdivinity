"use client";

// Small form to create a new custom email template.
// On submit: POST /api/admin/emails → returns {id} → redirect to
// the editor for that id where the admin writes subject/headline/body.

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewEmailForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          triggerDescription: description || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Create failed");
      router.push(`/admin/emails/${encodeURIComponent(body.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="ee-form" style={{ maxWidth: 560 }}>
      <div className="field">
        <label>
          Email name <span className="req">*</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. After-party invitation"
          required
        />
        <div
          className="field-help"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".06em" }}
        >
          Shown in the admin list, not in the email itself.
        </div>
      </div>

      <div className="field">
        <label>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Sent the morning after the gathering"
        />
        <div
          className="field-help"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".06em" }}
        >
          Optional reminder of when you'd use this email.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 24,
          flexWrap: "wrap",
        }}
      >
        <button type="submit" className="ee-btn ee-btn-save" disabled={busy || !label.trim()}>
          {busy ? "Creating…" : "Create + start writing →"}
        </button>
        {error && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".12em",
              color: "var(--wine)",
            }}
          >
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
