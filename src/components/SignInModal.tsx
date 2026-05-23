"use client";

// Sign-in via Supabase magic link AND 6-digit OTP code.
//
// Why both:
// The PKCE magic-link flow breaks when users open the email in an
// in-app browser (Gmail iOS, Outlook mobile) — the code_verifier
// is stored in their normal browser but the email's link opens in
// the email-app's webview, which can't access that storage. The
// link clicks but no session is set.
//
// The 6-digit code path sidesteps this entirely: user types the
// code into our website in their normal browser → verifyOtp() sets
// the session in that browser. Works on any device combo.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignInModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"email" | "code">("email");
  const codeInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-focus the code input when we switch to the code stage.
  useEffect(() => {
    if (stage === "code") {
      setTimeout(() => codeInputRef.current?.focus(), 50);
    }
  }, [stage]);

  const sendLink = async (e: React.FormEvent) => {
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
      setStage("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the link.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work. Try again or request a new one.");
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setCode("");
    setError(null);
    await sendLink({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="signin-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="signin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="signin-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="signin-mark">Divinity</div>

        {stage === "email" && (
          <>
            <h2 className="signin-title">Member <em>sign in</em></h2>
            <p className="signin-sub">
              For applicants who&apos;ve been admitted. New here? Apply below.
              <br />
              <span className="signin-hint">
                We&apos;ll email you a sign-in link and a 6-digit code.
              </span>
            </p>

            <form className="signin-form" onSubmit={sendLink}>
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
                {busy ? "Sending…" : "Send me a code"} <span className="arr">→</span>
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

        {stage === "code" && (
          <>
            <h2 className="signin-title">Check your <em>inbox</em>.</h2>
            <p className="signin-sub">
              We sent a sign-in link and a 6-digit code to <strong>{email}</strong>.
              <br />
              <span className="signin-hint">
                Tap the link from your laptop, OR enter the code below from anywhere.
              </span>
            </p>

            <form className="signin-form" onSubmit={submitCode}>
              <div className="field full">
                <label>6-digit code</label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontStyle: "normal",
                    fontSize: 28,
                    letterSpacing: "0.3em",
                    textAlign: "center",
                  }}
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
                disabled={code.length < 6 || busy}
              >
                {busy ? "Verifying…" : "Sign in"} <span className="arr">→</span>
              </button>
            </form>

            <div className="signin-divider"><span>didn&apos;t get it?</span></div>

            <button
              className="signin-apply"
              onClick={resendCode}
              disabled={busy}
            >
              <span>Send a new code →</span>
            </button>

            <button
              className="signin-forgot"
              onClick={() => { setStage("email"); setError(null); setCode(""); }}
              style={{
                background: "none",
                border: 0,
                cursor: "pointer",
                marginTop: 16,
              }}
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
