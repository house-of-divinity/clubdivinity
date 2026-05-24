"use client";

// Sign-in via Supabase 8-digit OTP code.
//
// The link-based magic-link UX gets eaten by Gmail's in-app browser
// (PKCE code_verifier lives in the user's main browser, but the
// link opens in the email app's webview which has no access to it).
// Code-only sidesteps the whole class of issues — user types the
// code into our site in any browser → verifyOtp() sets the session.
//
// We also gate signInWithOtp behind /api/auth/check so we don't
// blast magic-link emails at random unknown addresses (Supabase
// would otherwise auto-create accounts for them).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Stage = "email" | "code" | "not-recognized";

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
  const [stage, setStage] = useState<Stage>("email");
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

  useEffect(() => {
    if (stage === "code") {
      setTimeout(() => codeInputRef.current?.focus(), 50);
    }
  }, [stage]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Pre-check: is this email a member, applicant, or admin?
      const checkRes = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const check = await checkRes.json().catch(() => ({}));
      if (!check.allowed) {
        if (check.reason === "invalid-email") {
          setError("That doesn't look like a valid email.");
        } else {
          // Not a member, applicant, or admin — surface the
          // "not recognised" screen instead of sending a link.
          setStage("not-recognized");
        }
        return;
      }

      // Email is recognised — request the OTP.
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
      setError(err instanceof Error ? err.message : "Couldn't send the code.");
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
      // On iPhone Safari the user is often scrolled mid-page when they
      // open the sign-in modal. Snap back to the top so the post-login
      // home page (or admin redirect) starts at the top.
      window.scrollTo(0, 0);
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
    await sendCode();
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
            </p>

            <form className="signin-form" onSubmit={sendCode}>
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
                {busy ? "Checking…" : "Send me a code"} <span className="arr">→</span>
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
              Your sign-in code is on the way to <strong>{email}</strong>. Enter it below.
            </p>

            <form className="signin-form" onSubmit={submitCode}>
              <div className="field full">
                <label>Sign-in code</label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  autoComplete="one-time-code"
                  placeholder="enter the code from the email"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontStyle: "normal",
                    fontSize: 24,
                    letterSpacing: "0.25em",
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

        {stage === "not-recognized" && (
          <>
            <h2 className="signin-title">
              We don&apos;t see your <em>file</em>.
            </h2>
            <p className="signin-sub">
              There&apos;s no application from <strong>{email}</strong>. Either you
              haven&apos;t applied yet, or you applied with a different email.
            </p>

            <button
              className="btn-gold signin-cta"
              onClick={() => { onClose(); onApply(); }}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Begin your application <span className="arr">→</span>
            </button>

            <div className="signin-divider"><span>or</span></div>

            <button
              className="signin-apply"
              onClick={() => { setStage("email"); setError(null); }}
            >
              <span>Try a different email →</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
