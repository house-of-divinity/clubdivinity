"use client";

// Full-screen overlay shown when a user signs in but they aren't an
// admitted member yet. Two flavors:
//
//   1. They have an application → show its current status with
//      brand-appropriate copy.
//   2. They have no application at all → "we don't see your file"
//      with CTAs to apply or sign out.
//
// The overlay is non-dismissible by tap — sign out is the only exit.
// That keeps the signed-in-but-not-a-member state from leaking into
// the public marketing UI.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type ApplicantStatus =
  | "received"
  | "reviewing"
  | "approved"
  | "waitlisted"
  | "declined"
  | "withdrawn"
  | "revoked";

type Application = {
  ref: string;
  status: ApplicantStatus;
  submittedAt: string;
  decidedAt: string | null;
};

const STATUS_COPY: Record<
  ApplicantStatus,
  { headline: string; body: string; chipClass: string }
> = {
  received: {
    headline: "Your file is in the <em>room</em>.",
    body:
      "We have your file in hand. Our curators read every submission by hand — not by algorithm, not by template. You'll hear from us within seven days.",
    chipClass: "s-received",
  },
  reviewing: {
    headline: "A note from the <em>room</em>.",
    body:
      "Your file has been opened. One of us is reading it now. A decision is coming — not today, but soon.",
    chipClass: "s-reviewing",
  },
  approved: {
    headline: "Welcome to the <em>room</em>.",
    body:
      "You've been admitted. Your membership is being set up — try signing back in a moment from now to see the member view.",
    chipClass: "s-approved",
  },
  waitlisted: {
    headline: "Held for the <em>next chair</em>.",
    body:
      "Your file is beautiful — and the room for this gathering is already full. We're holding your application for the next door we open. You don't need to do anything.",
    chipClass: "s-waitlisted",
  },
  declined: {
    headline: "Not this <em>room</em>, not this night.",
    body:
      "Thank you for trusting us with your file. This particular night isn't the right fit — and that says nothing about you, only about the room we're composing.",
    chipClass: "s-declined",
  },
  withdrawn: {
    headline: "<em>Withdrawn</em>.",
    body:
      "You withdrew this application. You're welcome to apply again any time the door is open.",
    chipClass: "s-declined",
  },
  revoked: {
    headline: "Membership <em>revoked</em>.",
    body:
      "Your membership has been revoked. If you believe this is in error, write to curator@clubdivinity.com.",
    chipClass: "s-revoked",
  },
};

export default function ApplicantStatusOverlay({
  application,
  email,
  onApply,
}: {
  application: Application | null;
  email: string;
  onApply: () => void;
}) {
  const router = useRouter();

  // Lock body scroll while overlay is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div
      className="signin-overlay"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 130 }}
    >
      <div className="signin-modal" style={{ maxWidth: 520 }}>
        <div className="signin-mark">Divinity</div>

        {application ? (
          <ApplicantBody application={application} />
        ) : (
          <UnknownEmailBody email={email} onApply={onApply} />
        )}

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: ".5px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--ink-dim)",
            }}
          >
            Signed in as {email}
          </div>
          <button
            onClick={signOut}
            style={{
              background: "none",
              border: 0,
              color: "var(--ink-mute)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: 8,
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicantBody({ application }: { application: Application }) {
  const copy = STATUS_COPY[application.status] ?? STATUS_COPY.received;
  const headlineHtml = copy.headline.replace(
    /<em>([\s\S]*?)<\/em>/g,
    `<em style="color:var(--gold);font-style:italic">$1</em>`,
  );

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span
          className={"status-chip " + copy.chipClass}
          style={{ fontSize: 10 }}
        >
          {application.status}
        </span>
      </div>

      <h2
        className="signin-title"
        style={{ marginBottom: 24 }}
        dangerouslySetInnerHTML={{ __html: headlineHtml }}
      />

      <p
        className="signin-sub"
        style={{ marginBottom: 32 }}
      >
        {copy.body}
      </p>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: "var(--gold)",
          textAlign: "center",
          padding: "14px 16px",
          border: ".5px solid var(--gold)",
          margin: "0 auto",
          maxWidth: 260,
        }}
      >
        Reference · {application.ref}
      </div>

      <div
        style={{
          marginTop: 18,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "var(--ink-dim)",
        }}
      >
        Submitted{" "}
        {new Date(application.submittedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        {application.decidedAt && (
          <>
            {" · "}
            decided{" "}
            {new Date(application.decidedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </>
        )}
      </div>
    </>
  );
}

function UnknownEmailBody({
  email,
  onApply,
}: {
  email: string;
  onApply: () => void;
}) {
  return (
    <>
      <h2 className="signin-title" style={{ marginBottom: 18 }}>
        We don&apos;t see your <em style={{ color: "var(--gold)" }}>file</em>.
      </h2>
      <p className="signin-sub" style={{ marginBottom: 32 }}>
        There&apos;s no application from <strong>{email}</strong>. Either you
        haven&apos;t applied yet, or you applied with a different email.
      </p>
      <button
        className="btn-gold signin-cta"
        onClick={onApply}
        style={{ width: "100%", justifyContent: "center" }}
      >
        Begin your application <span className="arr">→</span>
      </button>
    </>
  );
}
