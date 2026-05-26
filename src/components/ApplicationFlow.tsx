"use client";

// Multi-step membership application form. 7-step flow:
// Type → Identity → Contact → Presence → Why You → Referral → Submit.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUpload, { type PhotoState } from "./PhotoUpload";
import { NEXT_EVENT_FALLBACK as NEXT_EVENT } from "@/lib/event";
import { nightsUntil } from "@/lib/format";

const STEPS = [
  { id: "type", label: "Applying As" },
  { id: "identity", label: "Who You Are" },
  { id: "contact", label: "Contact" },
  { id: "presence", label: "Presence" },
  { id: "essay", label: "Why You" },
  { id: "referral", label: "Referral" },
  { id: "review", label: "Submit" },
] as const;

export type ApplicationData = {
  applicantType: "" | "couple" | "solo";
  p1Name: string; p1Age: string;
  p2Name: string; p2Age: string;
  email: string; phone: string; city: string;
  p1Socials: string; p2Socials: string;
  photo: PhotoState | null;
  essay: string;
  referral: string;
};

const INITIAL: ApplicationData = {
  applicantType: "",
  p1Name: "", p1Age: "",
  p2Name: "", p2Age: "",
  email: "", phone: "", city: "Las Vegas",
  p1Socials: "", p2Socials: "",
  photo: null,
  essay: "",
  referral: "",
};

export default function ApplicationFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ApplicationData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof ApplicationData>(k: K, v: ApplicationData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  // Scroll the form back to the top whenever the step changes.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [router]);

  const isSolo = data.applicantType === "solo";

  const canAdvance = (() => {
    switch (step) {
      case 0: return data.applicantType !== "";
      case 1: return isSolo
        ? !!(data.p1Name && Number(data.p1Age) >= 21)
        : !!(data.p1Name && data.p2Name && Number(data.p1Age) >= 21 && Number(data.p2Age) >= 21);
      case 2: return /\S+@\S+\.\S+/.test(data.email) && data.phone.length >= 7;
      case 3: {
        if (!data.photo) return false;
        if (data.p1Socials.trim().length < 2) return false;
        if (!isSolo && data.p2Socials.trim().length < 2) return false;
        return true;
      }
      case 4: return data.essay.trim().length >= 60;
      case 5: return data.referral.trim().length >= 2;
      case 6: return true;
      default: return true;
    }
  })();

  const next = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    await submit();
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async () => {
    if (!data.photo) {
      setSubmitError("Please attach a photo before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const form = new FormData();
      form.set("type", data.applicantType);
      form.set("p1Name", data.p1Name);
      form.set("p1Age", data.p1Age);
      if (data.applicantType === "couple") {
        form.set("p2Name", data.p2Name);
        form.set("p2Age", data.p2Age);
      }
      form.set("email", data.email);
      form.set("phone", data.phone);
      form.set("city", data.city);
      form.set("p1Socials", data.p1Socials);
      form.set("p2Socials", data.p2Socials);
      form.set("essay", data.essay);
      form.set("referral", data.referral);
      form.set("photo", data.photo.file);

      const res = await fetch("/api/applications", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message || "Submission failed");
      }
      setSubmittedRef(body.ref);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRef) {
    return <Submitted refId={submittedRef} data={data} />;
  }

  return (
    <div className="app-overlay" role="dialog" aria-modal="true">
      <div className="app-modal">
        <aside className="app-aside">
          <div>
            <div className="ah-mark">Divinity</div>
            <div className="ah-sub">Application · Membership</div>
            <div className="ah-count">
              <span className="ah-count-k">Next event</span>
              <span className="ah-count-v">{nightsUntil(NEXT_EVENT.date)} nights away</span>
            </div>
            <div className="app-steps">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={"app-step " + (i === step ? "active" : i < step ? "done" : "")}
                >
                  <div className="num">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="ah-foot">
            Your application is reviewed by hand.
            <br />
            You&apos;ll hear from a name, not a brand.
          </div>
        </aside>

        <main className="app-main" ref={mainRef}>
          <button
            className="app-close"
            onClick={() => router.push("/")}
            aria-label="Close"
          >
            ✕
          </button>

          {step === 0 && <StepType data={data} set={set} />}
          {step === 1 && (isSolo
            ? <StepSolo data={data} set={set} />
            : <StepCouple data={data} set={set} />)}
          {step === 2 && <StepContact data={data} set={set} />}
          {step === 3 && (isSolo
            ? <StepPresenceSolo data={data} set={set} />
            : <StepPresenceCouple data={data} set={set} />)}
          {step === 4 && <StepEssay data={data} set={set} />}
          {step === 5 && <StepReferral data={data} set={set} />}
          {step === 6 && <StepReview data={data} />}

          {submitError && (
            <div
              role="alert"
              style={{
                marginTop: 32,
                padding: "14px 18px",
                border: ".5px solid var(--wine)",
                background: "color-mix(in oklab, var(--wine) 12%, transparent)",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: ".12em",
              }}
            >
              {submitError}
            </div>
          )}

          <div className="app-nav">
            <div className="prog">
              Step {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
            </div>
            <div className="app-nav-row">
              {step > 0 && (
                <button className="btn-back" onClick={back}>← Back</button>
              )}
              <button
                className="btn-next"
                onClick={next}
                disabled={!canAdvance || submitting}
              >
                {step === STEPS.length - 1
                  ? (submitting ? "Submitting…" : "Submit Application")
                  : "Continue"}{" "}
                <span className="arr">→</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

type StepProps = {
  data: ApplicationData;
  set: <K extends keyof ApplicationData>(k: K, v: ApplicationData[K]) => void;
};

function StepType({ data, set }: StepProps) {
  return (
    <>
      <div className="app-step-eyebrow">01 · Applying As</div>
      <h2 className="app-step-title">Tell us who&apos;s at the <em>door</em>.</h2>
      <p className="app-step-sub">
        June 19 admits committed couples and individual women.
        Other solo applicants will not be considered for this evening.
      </p>

      <div className="type-grid">
        <button
          type="button"
          className={"type-card" + (data.applicantType === "couple" ? " on" : "")}
          onClick={() => set("applicantType", "couple")}
        >
          <div className="type-glyph">II</div>
          <div className="type-h">A Couple</div>
          <div className="type-p">Two of you, applying together. The standard door.</div>
        </button>
        <button
          type="button"
          className={"type-card" + (data.applicantType === "solo" ? " on" : "")}
          onClick={() => set("applicantType", "solo")}
        >
          <div className="type-glyph">I</div>
          <div className="type-h">A Woman, Alone</div>
          <div className="type-p">Solo women considered with the same care.</div>
        </button>
      </div>
    </>
  );
}

function StepSolo({ data, set }: StepProps) {
  return (
    <>
      <div className="app-step-eyebrow">02 · Who You Are</div>
      <h2 className="app-step-title">Tell us <em>you</em>.</h2>
      <p className="app-step-sub">
        A few essentials. Everything beyond this is held in confidence.
      </p>

      <div className="field-grid">
        <div className="field full">
          <label>Full Name <span className="req">*</span></label>
          <input
            type="text"
            placeholder="As it appears on ID"
            value={data.p1Name}
            onChange={(e) => set("p1Name", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Age <span className="req">*</span></label>
          <input
            type="number"
            placeholder="21+"
            min={21}
            value={data.p1Age}
            onChange={(e) => set("p1Age", e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

function StepCouple({ data, set }: StepProps) {
  return (
    <>
      <div className="app-step-eyebrow">02 · Who You Are</div>
      <h2 className="app-step-title">Divinity is for <em>two</em>.</h2>
      <p className="app-step-sub">
        Tell us who&apos;s coming — both of you, together.
      </p>

      <div className="couple-grid">
        <div className="couple-col">
          <h4>Partner One</h4>
          <div className="field" style={{ marginBottom: 24 }}>
            <label>Full Name <span className="req">*</span></label>
            <input
              type="text"
              placeholder="As it appears on ID"
              value={data.p1Name}
              onChange={(e) => set("p1Name", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Age <span className="req">*</span></label>
            <input
              type="number"
              placeholder="21+"
              min={21}
              value={data.p1Age}
              onChange={(e) => set("p1Age", e.target.value)}
            />
          </div>
        </div>
        <div className="couple-col">
          <h4>Partner Two</h4>
          <div className="field" style={{ marginBottom: 24 }}>
            <label>Full Name <span className="req">*</span></label>
            <input
              type="text"
              placeholder="As it appears on ID"
              value={data.p2Name}
              onChange={(e) => set("p2Name", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Age <span className="req">*</span></label>
            <input
              type="number"
              placeholder="21+"
              min={21}
              value={data.p2Age}
              onChange={(e) => set("p2Age", e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function StepContact({ data, set }: StepProps) {
  return (
    <>
      <div className="app-step-eyebrow">03 · Contact</div>
      <h2 className="app-step-title">A discreet line of <em>communion</em>.</h2>
      <p className="app-step-sub">
        We correspond by encrypted email and only after review.
        Your information is held in confidence — always.
      </p>

      <div className="field-grid">
        <div className="field full">
          <label>Email <span className="req">*</span></label>
          <input
            type="email"
            placeholder="you@discreet.com"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Mobile <span className="req">*</span></label>
          <input
            type="tel"
            placeholder="+1 (702) ..."
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Home City</label>
          <input
            type="text"
            placeholder="Las Vegas"
            value={data.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

function StepPresenceSolo({ data, set }: StepProps) {
  return (
    <>
      <div className="app-step-eyebrow">04 · Presence</div>
      <h2 className="app-step-title">Let us make sure you&apos;re <em>real</em>.</h2>
      <p className="app-step-sub">
        Any social media page where we can confirm you really exist —
        FetLife, Instagram, OnlyFans, etc. Privately reviewed; never shared.
      </p>

      <div className="field-grid" style={{ marginBottom: 32 }}>
        <div className="field full">
          <label>
            Social media <span className="req">*</span>
          </label>
          <input
            type="text"
            placeholder="FetLife, Instagram, OnlyFans, etc."
            value={data.p1Socials}
            onChange={(e) => set("p1Socials", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field full" style={{ maxWidth: 320 }}>
        <label style={{ marginBottom: 12 }}>
          Recent portrait <span className="req">*</span>
        </label>
        <PhotoUpload
          label="Upload portrait"
          value={data.photo}
          onChange={(p) => set("photo", p)}
        />
        <div className="field-help">A full-body, well-lit photo within the last six months.</div>
      </div>
    </>
  );
}

function StepPresenceCouple({ data, set }: StepProps) {
  return (
    <>
      <div className="app-step-eyebrow">04 · Presence</div>
      <h2 className="app-step-title">Let us make sure you&apos;re <em>real</em>.</h2>
      <p className="app-step-sub">
        Any social media page where we can confirm you really exist —
        FetLife, Instagram, OnlyFans, etc. Privately reviewed; never shared.
      </p>

      <div className="couple-grid" style={{ marginBottom: 40 }}>
        <div className="couple-col">
          <h4>Partner One</h4>
          <div className="field">
            <label>
              Social media <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="FetLife, Instagram, OnlyFans, etc."
              value={data.p1Socials}
              onChange={(e) => set("p1Socials", e.target.value)}
              required
            />
          </div>
        </div>
        <div className="couple-col">
          <h4>Partner Two</h4>
          <div className="field">
            <label>
              Social media <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="FetLife, Instagram, OnlyFans, etc."
              value={data.p2Socials}
              onChange={(e) => set("p2Socials", e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className="field full" style={{ maxWidth: 360 }}>
        <label style={{ marginBottom: 12 }}>
          One photo of the two of you <span className="req">*</span>
        </label>
        <PhotoUpload
          label="Upload together"
          value={data.photo}
          onChange={(p) => set("photo", p)}
        />
        <div className="field-help">A full-body, well-lit photo within the last six months.</div>
      </div>
    </>
  );
}

function StepEssay({ data, set }: StepProps) {
  return (
    <>
      <div className="app-step-eyebrow">05 · Why You</div>
      <h2 className="app-step-title">In your <em>own</em> words.</h2>
      <p className="app-step-sub">
        What draws you to a room like ours? What do you bring with you?
        Speak honestly — there is no right answer, only a true one.
      </p>

      <div className="field full">
        <label>Tell us <span className="req">*</span></label>
        <textarea
          rows={6}
          placeholder="We are drawn to..."
          value={data.essay}
          onChange={(e) => set("essay", e.target.value)}
        />
        <div className="field-help">
          {data.essay.trim().length} characters · 60 minimum
        </div>
      </div>
    </>
  );
}

function StepReferral({ data, set }: StepProps) {
  return (
    <>
      <div className="app-step-eyebrow">06 · Referral</div>
      <h2 className="app-step-title">Who sent <em>you</em>?</h2>
      <p className="app-step-sub">
        Most of our members come to us through someone they trust.
        If a current member referred you, their name moves you to the top
        of the queue. Without one, your file is reviewed on its own merit.
      </p>

      <div className="field full">
        <label>
          Referring member or &apos;Unreferred&apos; <span className="req">*</span>
        </label>
        <input
          type="text"
          placeholder="Their name, or how you found us"
          value={data.referral}
          onChange={(e) => set("referral", e.target.value)}
        />
      </div>
    </>
  );
}

function StepReview({ data }: { data: ApplicationData }) {
  return (
    <>
      <div className="app-step-eyebrow">07 · Submit</div>
      <h2 className="app-step-title">One last <em>look</em>.</h2>
      <p className="app-step-sub">
        Confirm what you&apos;ve shared. Once submitted, your file enters review.
      </p>

      <div>
        <ReviewRow k="Applying As" v={data.applicantType === "solo" ? "A woman, alone" : "A couple"} />
        <ReviewRow
          k="Name"
          v={
            data.applicantType === "solo"
              ? data.p1Name
              : `${data.p1Name} & ${data.p2Name}`
          }
        />
        <ReviewRow k="Contact" v={data.email} />
        <ReviewRow k="Home City" v={data.city} />
        <ReviewRow
          k="Socials"
          v={[data.p1Socials, data.p2Socials].filter(Boolean).join(" · ")}
        />
        <ReviewRow
          k="Photo"
          v={data.photo ? "Attached" : ""}
        />
        <ReviewRow k="Referral" v={data.referral} />
        <ReviewRow
          k="Essay"
          v={data.essay.slice(0, 140) + (data.essay.length > 140 ? "…" : "")}
        />
      </div>
    </>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 24,
        padding: "20px 0",
        borderTop: ".5px solid var(--line)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "var(--ink-dim)",
          paddingTop: 4,
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 22,
          fontWeight: 300,
          color: "var(--ink)",
          lineHeight: 1.4,
        }}
      >
        {v || <span style={{ color: "var(--ink-dim)" }}>—</span>}
      </div>
    </div>
  );
}

function Submitted({
  refId,
  data,
}: {
  refId: string;
  data: ApplicationData;
}) {
  const router = useRouter();
  const firstName = data.p1Name?.split(" ")[0] || "";
  const secondName =
    data.applicantType !== "solo" && data.p2Name ? data.p2Name.split(" ")[0] : "";

  return (
    <div className="app-overlay">
      <div className="app-modal" style={{ gridTemplateColumns: "1fr" }}>
        <main className="app-main" style={{ overflow: "hidden", position: "relative" }}>
          <button
            className="app-close"
            onClick={() => router.push("/")}
            aria-label="Close"
          >
            ✕
          </button>
          <div className="app-submitted">
            <div className="seal">D</div>
            <h2>
              Your file is under{" "}
              <em style={{ color: "var(--gold)", fontStyle: "italic" }}>review</em>.
            </h2>
            <p>
              Thank you, {firstName}
              {secondName && ` & ${secondName}`}.
              Our curators read every submission by hand. If your application moves
              forward, you&apos;ll receive a private correspondence within seven days —
              from a name, not a brand.
            </p>
            <div className="ref">Reference · {refId}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
