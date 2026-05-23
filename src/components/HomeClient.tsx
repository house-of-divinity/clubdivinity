"use client";

// Top-level client component for the home page. Owns the
// gate/modal state, fetches the current member from /api/me,
// and subscribes to Supabase auth changes so sign-in / sign-out
// updates the UI live.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { NEXT_EVENT, UPCOMING_EVENTS } from "@/lib/event";
import EntranceGate from "./EntranceGate";
import Nav, { type Member } from "./Nav";
import Hero from "./Hero";
import Performance from "./Performance";
import EventSpotlight from "./EventSpotlight";
import Whisper from "./Whisper";
import Footer from "./Footer";
import SignInModal from "./SignInModal";
import TermsModal from "./TermsModal";
import { OrnamentDivider } from "./Ornaments";

export default function HomeClient() {
  const router = useRouter();
  const [gateOpen, setGateOpen] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [member, setMember] = useState<Member | null>(null);

  // Lock body scroll while the gate is up.
  useEffect(() => {
    document.body.style.overflow = gateOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [gateOpen]);

  // Pull the current member from the API on mount. Subscribe to
  // Supabase auth state changes so sign-in / sign-out updates the
  // nav and the section-level UI live.
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const { member } = await res.json();
        if (!cancelled) setMember(member);
      } catch {
        // ignore — stay anonymous
      }
    };

    refresh();

    const supabase = createSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        refresh();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const openApply = () => router.push("/apply");
  const openSignIn = () => setSignInOpen(true);
  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMember(null);
  };
  const replayGate = () => {
    setReplayKey((k) => k + 1);
    setGateOpen(true);
  };

  return (
    <>
      <Nav
        member={member}
        onApply={openApply}
        onSignIn={openSignIn}
        onSignOut={signOut}
        onReplayGate={replayGate}
      />

      <Hero event={NEXT_EVENT} member={member} onApply={openApply} />
      <OrnamentDivider />
      <Performance />
      <OrnamentDivider />
      <EventSpotlight
        event={NEXT_EVENT}
        member={member}
        onApply={openApply}
        onSignIn={openSignIn}
      />
      {UPCOMING_EVENTS.length > 1 && (
        <>{/* future calendar stack */}</>
      )}
      <OrnamentDivider />
      <Whisper event={NEXT_EVENT} member={member} onApply={openApply} />
      <Footer onOpenTerms={() => setTermsOpen(true)} />

      {signInOpen && (
        <SignInModal
          onClose={() => setSignInOpen(false)}
          onApply={openApply}
        />
      )}
      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
      {gateOpen && (
        <EntranceGate
          replayKey={replayKey}
          onEnter={() => setGateOpen(false)}
        />
      )}
    </>
  );
}
