"use client";

// Hero — split layout (text left, poster right).
// Public state shows the Apply CTA; member state swaps to
// Purchase Tickets. Sun + moon ornaments float in the corners.

import type { Event } from "@/lib/event";
import type { Member } from "./Nav";
import { formatShortDate, formatWeekday } from "@/lib/format";
import { HeroSun, HeroMoon } from "./Ornaments";

export default function Hero({
  event,
  member,
  onApply,
}: {
  event: Event;
  member: Member | null;
  onApply: () => void;
}) {
  const titleLine = `${event.roman} · ${event.name}`;
  const dateLine = formatShortDate(event.date);
  const weekday = formatWeekday(event.date);
  const altLine = `${titleLine} — ${weekday}, ${dateLine}`;
  const ticketsUrl = event.ticketUrl || "#";

  return (
    <section id="top" className="hero" data-layout="split" data-screen-label="Hero">
      <div className="hero-bg" />
      <HeroSun />
      <HeroMoon />

      <div className="hero-content">
        <div className="hero-inner">
          <div className="hero-eyebrow eyebrow">
            <span className="dot" />
            {member ? (
              <span>
                Welcome back,{" "}
                <em style={{ fontStyle: "italic", color: "var(--ink)" }}>
                  {member.name.split(" ")[0]}
                </em>{" "}
                · Las Vegas
              </span>
            ) : (
              "A private society · Las Vegas"
            )}
          </div>
          <h1 className="display hero-title">
            A room for the <em>unrestrained</em>.
          </h1>
          <div className="hero-cta-row">
            {member ? (
              <>
                <a className="btn-gold" href={ticketsUrl} target="_blank" rel="noopener noreferrer">
                  Purchase tickets <span className="arr">→</span>
                </a>
                <a href="#event" className="btn-ghost">See the night</a>
              </>
            ) : (
              <>
                <button className="btn-gold" onClick={onApply}>
                  Club Divinity Application <span className="arr">→</span>
                </button>
                <a href="#event" className="btn-ghost">See the next night</a>
              </>
            )}
          </div>
        </div>

        <div className="hero-aside hero-poster">
          {/* Plain <img>: simplest path. Next.js Image optimisation comes later. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.posterUrl || "/assets/lovers-poster.jpeg"} alt={altLine} />
        </div>
      </div>

      <div className="hero-meta">
        <div className="col">
          <span>Next gathering</span>
          <span className="v">{titleLine}</span>
        </div>
        <div className="col" style={{ alignItems: "center" }}>
          <span>Hosted by</span>
          <span className="v">{event.hosts || "Madison Wilde · Bree Sky"}</span>
        </div>
        <div className="col" style={{ alignItems: "flex-end" }}>
          <span>{weekday}</span>
          <span className="v">{dateLine}</span>
        </div>
      </div>
    </section>
  );
}
