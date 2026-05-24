"use client";

// Editor form for one email template.
// - Edit subject + headline (HTML allowed for <em>) + body (plain text)
// - Toggle whether the trigger is enabled
// - Variables listed below the body field; click to insert at caret
// - For built-ins: Save / Reset to default
// - For custom templates: also edit label + trigger; Delete; Send broadcast

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { TemplateMeta } from "@/lib/email/templates-meta";

const AUDIENCE_OPTIONS = [
  { id: "members",              label: "All active members" },
  { id: "applicants-pending",   label: "Applicants — pending review" },
  { id: "applicants-approved",  label: "Applicants — approved (not yet members)" },
  { id: "applicants-all",       label: "Every applicant ever" },
] as const;

export default function EmailEditor({
  templateId,
  isCustom,
  initialLabel,
  initialTrigger,
  initial,
  initialEnabled,
  isOverridden,
  meta,
}: {
  templateId: string;
  isCustom: boolean;
  initialLabel: string;
  initialTrigger: string;
  initial: { subject: string; headline: string; body: string };
  initialEnabled: boolean;
  isOverridden: boolean;
  meta: TemplateMeta;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...initial,
    label: initialLabel,
    trigger: initialTrigger,
  });
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
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
    set("body", before + token + after);
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
      const payload: Record<string, unknown> = {
        subject: form.subject,
        headline: form.headline,
        body: form.body,
        enabled,
      };
      if (isCustom) {
        payload.label = form.label;
        payload.triggerDescription = form.trigger;
      }
      const res = await fetch(`/api/admin/emails/${encodeURIComponent(templateId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    const verb = isCustom ? "Delete" : "Reset to the default copy";
    const msg = isCustom
      ? "Delete this custom email permanently? It will be removed from the list."
      : "Reset to the default copy? Your custom text will be lost.";
    if (!confirm(`${verb}? ${msg}`)) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/emails/${encodeURIComponent(templateId)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Reset failed");
      if (isCustom) {
        router.push("/admin/emails");
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="ee-form" style={{ maxWidth: 760 }}>
      {isCustom && (
        <>
          <FormField label="Email name" required hint="Shown in the admin list (not in the email itself).">
            <input
              type="text"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              required
            />
          </FormField>
          <FormField label="Description" hint="A short reminder of what this email is for.">
            <input
              type="text"
              value={form.trigger}
              onChange={(e) => set("trigger", e.target.value)}
            />
          </FormField>
        </>
      )}

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
          marginTop: 32,
          paddingTop: 24,
          borderTop: ".5px solid var(--line)",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: enabled ? "var(--ink)" : "var(--wine)",
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => { setEnabled(e.target.checked); setSaved(false); }}
            style={{ width: 18, height: 18, accentColor: "var(--gold)" }}
          />
          {enabled
            ? (isCustom ? "Enabled — can be sent" : "Enabled — sends when its trigger fires")
            : "Silenced — sends will be logged as skipped"}
        </label>
        {!enabled && (
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".14em",
              color: "var(--ink-mute)",
              lineHeight: 1.6,
            }}
          >
            {isCustom
              ? "Re-enable to allow broadcasts. The template is preserved either way."
              : "The trigger will still fire, but no email is sent. Each skip is recorded in the email log."}
          </div>
        )}
      </div>

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

        {isCustom && (
          <button
            type="button"
            className="ee-btn"
            onClick={() => setSendOpen(true)}
            disabled={busy || !enabled}
            style={{
              border: ".5px solid var(--gold)",
              background: "var(--gold)",
              color: "#0a0807",
              padding: "12px 20px",
              fontFamily: "var(--font-body)",
              fontSize: 11,
              letterSpacing: ".20em",
              textTransform: "uppercase",
              cursor: enabled ? "pointer" : "not-allowed",
              opacity: enabled ? 1 : 0.4,
            }}
            title={enabled ? "Send to an audience" : "Enable the template first"}
          >
            Send broadcast →
          </button>
        )}

        {isOverridden && (
          <button
            type="button"
            onClick={reset}
            className="ee-btn ee-btn-revert"
            disabled={busy}
          >
            {isCustom ? "Delete email" : "Reset to default"}
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

      {sendOpen && (
        <BroadcastModal
          templateId={templateId}
          label={form.label}
          onClose={() => setSendOpen(false)}
        />
      )}
    </form>
  );
}

function BroadcastModal({
  templateId,
  label,
  onClose,
}: {
  templateId: string;
  label: string;
  onClose: () => void;
}) {
  const [audience, setAudience] = useState<typeof AUDIENCE_OPTIONS[number]["id"]>("members");
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; audience_size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (testOnly: boolean) => {
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/emails/${encodeURIComponent(templateId)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audience, testOnly }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Send failed");
      setResult({
        sent: body.sent ?? 0,
        failed: body.failed ?? 0,
        audience_size: body.audience_size ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ad-overlay" onClick={onClose}>
      <div
        className="ad-modal"
        style={{ maxWidth: 540, gridTemplateColumns: "1fr" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="ad-close" onClick={onClose} aria-label="Close">×</button>
        <div className="ad-left" style={{ padding: "40px 36px 48px" }}>
          <div className="ad-ref">Send a broadcast</div>
          <h2 className="ad-name" style={{ marginBottom: 24 }}>{label}</h2>

          {!result && (
            <>
              <div className="ad-block-h">Audience</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {AUDIENCE_OPTIONS.map((a) => (
                  <label
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      border: ".5px solid var(--line)",
                      cursor: "pointer",
                      background: audience === a.id
                        ? "color-mix(in oklab, var(--gold) 8%, transparent)"
                        : "transparent",
                      borderColor: audience === a.id ? "var(--gold)" : "var(--line)",
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: 16,
                      color: "var(--ink)",
                    }}
                  >
                    <input
                      type="radio"
                      name="audience"
                      value={a.id}
                      checked={audience === a.id}
                      onChange={() => setAudience(a.id)}
                      style={{ accentColor: "var(--gold)" }}
                    />
                    {a.label}
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  className="ad-btn ad-btn-r"
                  onClick={() => send(true)}
                  disabled={sending}
                >
                  Send test to me only
                </button>

                {!confirm ? (
                  <button
                    type="button"
                    className="ad-btn ad-btn-a"
                    onClick={() => setConfirm(true)}
                    disabled={sending}
                  >
                    Send broadcast →
                  </button>
                ) : (
                  <>
                    <div className="ad-action-note">
                      This will send the email to every recipient in the audience above.
                      It can't be undone.
                    </div>
                    <button
                      type="button"
                      className="ad-btn ad-btn-revoke"
                      onClick={() => send(false)}
                      disabled={sending}
                    >
                      {sending ? "Sending…" : "Yes — send to everyone"}
                    </button>
                    <button
                      type="button"
                      className="ad-btn ad-btn-d"
                      onClick={() => setConfirm(false)}
                      disabled={sending}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {result && (
            <div>
              <div className="ad-block-h">Sent</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 22,
                  color: "var(--ink)",
                  lineHeight: 1.5,
                  marginBottom: 24,
                }}
              >
                {result.sent} of {result.audience_size} delivered
                {result.failed > 0 && (
                  <span style={{ color: "var(--wine)" }}> · {result.failed} failed</span>
                )}
                .
              </div>
              <button
                type="button"
                className="ad-btn ad-btn-a"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: ".12em",
                color: "var(--wine)",
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
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
