"use client";

// Top navigation. Adds blurred backdrop when scrolled. Shows
// member chip + dropdown when signed in, otherwise the sign-in
// link and the gold Apply CTA.

import { useEffect, useState } from "react";

export type Member = {
  name: string;
  email: string;
  isAdmin?: boolean;
};

export default function Nav({
  onApply,
  onSignIn,
  onReplayGate,
  onSignOut,
  member,
}: {
  onApply: () => void;
  onSignIn: () => void;
  onReplayGate: () => void;
  onSignOut: () => void;
  member: Member | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".nav-member")) setMenuOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  const initial = member?.name?.[0]?.toUpperCase() || "M";
  const firstName = member?.name?.split(" ")[0] || "";

  return (
    <nav className={"nav" + (scrolled ? " scrolled" : "")}>
      <button
        type="button"
        className="mark mark-btn"
        onClick={() => {
          onReplayGate();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        Divinity
      </button>
      <div className="links">
        <a href="#performance">The Performance</a>
        <a href="#event">Upcoming</a>
      </div>
      <div className="nav-cta-row">
        {member ? (
          <div className={"nav-member" + (menuOpen ? " open" : "")}>
            <button
              className="nav-member-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <span className="nav-member-chip">{initial}</span>
              <span className="nav-member-name">{firstName}</span>
              <span className="nav-member-caret">▾</span>
            </button>
            {menuOpen && (
              <div className="nav-member-menu" onClick={(e) => e.stopPropagation()}>
                <div className="nmm-head">
                  <div className="nmm-status">
                    {member.isAdmin ? "Curator · admin" : "Admitted member"}
                  </div>
                  <div className="nmm-name">{member.name}</div>
                  <div className="nmm-email">{member.email}</div>
                </div>
                <a className="nmm-link" href="#event">Purchase tickets →</a>
                <a className="nmm-link" href="#" onClick={(e) => e.preventDefault()}>My profile</a>
                <a className="nmm-link" href="#" onClick={(e) => e.preventDefault()}>Past gatherings</a>
                <button className="nmm-link nmm-out" onClick={() => { onSignOut(); setMenuOpen(false); }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button className="nav-signin" onClick={onSignIn}>Member sign in</button>
            <button className="cta" onClick={onApply}>Apply</button>
          </>
        )}
      </div>
    </nav>
  );
}
