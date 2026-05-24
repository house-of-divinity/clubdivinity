"use client";

// Event Spotlight — flier on the left, ticketing CTA on the right.
// Members see the "Purchase tickets" gold button; applicants see
// the apply CTA and a sign-in nudge.

import type { Event } from "@/lib/event";
import type { Member } from "./Nav";
import { formatLongDate, nightsUntil } from "@/lib/format";

export default function EventSpotlight({
  event,
  member,
  onApply,
  onSignIn,
}: {
  event: Event;
  member: Member | null;
  onApply: () => void;
  onSignIn: () => void;
}) {
  const ticketsUrl = event.ticketUrl || "#";
  const posterSrc = event.posterUrl || "/assets/lovers-poster.jpeg";
  const fullDate = formatLongDate(event.date);
  const stampLine = `${fullDate} · ${event.city || "Las Vegas"}`;
  const isSoldOut = event.status === "sold-out";

  return (
    <section className="event" id="event" data-screen-label="Event spotlight">
      <div className="event-head">
        <div className="section-eyebrow">
          <span className="num">III</span>
          <span className="line" />
          <span className="lbl">
            {isSoldOut
              ? "At capacity"
              : member ? "Members · early access" : "The Next Gathering"}
          </span>
        </div>
        <span className="mono event-countdown">{nightsUntil(event.date)} nights away</span>
      </div>

      <div className="event-flier-wrap">
        <div className="event-flier" style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={posterSrc} alt={`${event.roman} · ${event.name}`} />
          {isSoldOut && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-8deg)",
                background: "rgba(91, 26, 35, 0.92)",
                color: "#fff",
                padding: "16px 36px",
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                border: "1px solid var(--gold)",
                boxShadow: "0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(200,163,82,.4)",
                whiteSpace: "nowrap",
              }}
            >
              ✦ Sold Out ✦
            </div>
          )}
        </div>
        <div className="event-flier-side">
          <div className="ef-stamp">{stampLine}</div>
          <h2 className="display ef-title">
            {event.roman} · <em>{event.name}</em>
          </h2>

          {isSoldOut ? (
            <>
              <div className="ef-soldout">
                <span className="status-chip s-waitlisted">Sold out</span>
                <span className="ef-soldout-note">
                  This gathering is at capacity. Watch for cancellations — we release
                  returned tickets to admitted members first.
                </span>
              </div>
              {!member && (
                <>
                  <p className="ef-lede" style={{ marginTop: 24 }}>
                    Apply now to be considered for the next gathering. Members
                    get first access when the next door opens.
                  </p>
                  <button className="btn-gold ef-cta" onClick={onApply}>
                    Begin your application <span className="arr">→</span>
                  </button>
                  <div className="ef-sep" />
                  <div className="ef-not-member">
                    Already admitted?
                    <button className="ef-apply-link" onClick={onSignIn}>Member sign in →</button>
                  </div>
                </>
              )}
              {member && (
                <div className="ef-meta">
                  <div><span className="k">Hosts</span><span className="v">{event.hosts}</span></div>
                  <div><span className="k">Attire</span><span className="v">Dress to impress</span></div>
                  <div><span className="k">Address</span><span className="v">Sent with ticket</span></div>
                </div>
              )}
            </>
          ) : member ? (
            <>
              <div className="ef-member-badge">
                <span className="ef-mb-mark">✦</span> Admitted member · {member.name}
              </div>
              <p className="ef-lede">
                Your seat is yours to claim. Tickets are released to members two weeks
                before the door opens to applicants.
              </p>
              <a className="btn-gold ef-cta" href={ticketsUrl} target="_blank" rel="noopener noreferrer">
                Purchase tickets <span className="arr">→</span>
              </a>
              <div className="ef-meta">
                <div><span className="k">Hosts</span><span className="v">{event.hosts}</span></div>
                <div><span className="k">Attire</span><span className="v">Dress to impress</span></div>
                <div><span className="k">Address</span><span className="v">Sent with ticket</span></div>
              </div>
            </>
          ) : (
            <>
              <p className="ef-lede">
                {event.tagline ? (
                  <em>{event.tagline}</em>
                ) : (
                  "A private gathering. Tickets are released to admitted members only."
                )}
              </p>
              <button className="btn-gold ef-cta" onClick={onApply}>
                Begin your application <span className="arr">→</span>
              </button>
              <div className="ef-sep" />
              <div className="ef-not-member">
                Already admitted?
                <button className="ef-apply-link" onClick={onSignIn}>Member sign in →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
