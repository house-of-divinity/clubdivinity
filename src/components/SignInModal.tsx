"use client";

// Sign-in via Supabase magic link. User types email → we send a
// one-time link to their inbox → they click it → /auth/callback
// exchanges it for a session cookie → they land back on the site
// signed in.

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignInModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || busy) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signin-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="signin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="signin-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="signin-mark">Divinity</div>

        {sent ? (
          <>
            <h2 className="signin-title">Check your <em>inbox</em>.</h2>
            <p className="signin-sub">
              We&apos;ve sent a sign-in link to <strong>{email}</strong>.
              <br />
              <span className="signin-hint">
                The link is good for 1 hour. You can close this window.
              </span>
            </p>
            <button
              className="signin-apply"
              onClick={onClose}
              style={{ marginTop: 28 }}
            >
              <span>Close →</span>
            </button>
          </>
        ) : (
          <>
            <h2 className="signin-title">Member <em>sign in</em></h2>
            <p className="signin-sub">
              For applicants who&apos;ve been admitted. New here? Apply below.
              <br />
              <span className="signin-hint">
                We&apos;ll email you a one-time sign-in link.
              </span>
            </p>

            <form className="signin-form" onSubmit={submit}>
              <div className="field full">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@discreet.com"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && (
                <div
                  role="alert"
                  style={{
                    color: "var(--wine)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                  }}
                >
                  {error}
                </div>
              )}
              <button
                className="btn-gold signin-cta"
                type="submit"
                disabled={!email || busy}
              >
                {busy ? "Sending…" : "Send me a link"} <span className="arr">→</span>
              </button>
            </form>

            <div className="signin-divider"><span>or</span></div>

            <button
              className="signin-apply"
              onClick={() => { onClose(); onApply(); }}
            >
              Not a member yet? <span>Begin your application →</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
