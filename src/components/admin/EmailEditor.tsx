"use client";

// Editor form for one email template.
// - Edit subject + headline (HTML allowed for <em>) + body (plain text)
// - Variables listed below the body field; click to insert at caret
// - Save (upserts override) and Reset to default (deletes override)

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { TemplateId, TemplateMeta } from "@/lib/email/templates-meta";

export default function EmailEditor({
  templateId,
  initial,
  isOverridden,
  meta,
}: {
  templateId: TemplateId;
  initial: { subject: string; headline: string; body: string };
  isOverridden: boolean;
  meta: TemplateMeta;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const set = <K extends keyof typeof form>(k: K, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const insertVar = (name: string) => {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      set("body", form.body + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = form.body.slice(0, start);
    const after = form.body.slice(end);
    const next = before + token + after;
    set("body", next);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    }, 0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/emails/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Save failed");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!isOverridden) return;
    if (!confirm("Reset to the default copy? Your custom text will be lost.")) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/emails/${templateId}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Reset failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="ee-form" style={{ maxWidth: 760 }}>
      <FormField label="Subject" required>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          required
        />
      </FormField>

      <FormField
        label="Headline"
        hint="Big italic line at the top. Use <em>...</em> to make a word gold + italic (e.g. 'Your file is in the <em>room</em>.')"
        required
      >
        <input
          type="text"
          value={form.headline}
          onChange={(e) => set("headline", e.target.value)}
          required
        />
      </FormField>

      <FormField label="Body" required hint="Plain text. Blank lines separate paragraphs.">
        <textarea
          ref={bodyRef}
          rows={12}
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          required
          style={{ fontFamily: "var(--font-mono)", fontStyle: "normal", fontSize: 14 }}
        />
      </FormField>

      {meta.vars.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--ink-dim)",
              marginBottom: 12,
            }}
          >
            Variables — click to insert
          </div>
          <div className="em-vars">
            {meta.vars.map((v) => (
              <button
                key={v.name}
                type="button"
                className="em-var"
                onClick={() => insertVar(v.name)}
                title={v.description}
              >
                {`{{${v.name}}}`}
              </button>
            ))}
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              marginTop: 16,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".04em",
              color: "var(--ink-mute)",
              lineHeight: 1.7,
            }}
          >
            {meta.vars.map((v) => (
              <li key={v.name}>
                <strong style={{ color: "var(--gold)" }}>{`{{${v.name}}}`}</strong>{" — "}
                {v.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 32,
          paddingTop: 24,
          borderTop: ".5px solid var(--line)",
          flexWrap: "wrap",
        }}
      >
        <button type="submit" className="ee-btn ee-btn-save" disabled={busy}>
          {busy ? "Saving…" : (isOverridden ? "Save changes" : "Save customisation")}
        </button>
        {isOverridden && (
          <button
            type="button"
            onClick={reset}
            className="ee-btn ee-btn-revert"
            disabled={busy}
          >
            Reset to default
          </button>
        )}
        {saved && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--gold)",
            }}
          >
            ✦ Saved
          </span>
        )}
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

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {hint && (
        <div
          className="field-help"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".06em" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
