"use client";

// Final CTA band with the winged-heart SVG above it.
// Same gold button, copy switches based on member state.

import type { Event } from "@/lib/event";
import type { Member } from "./Nav";
import { formatShortDate } from "@/lib/format";
import { WingedHeart } from "./Ornaments";

export default function Whisper({
  event,
  member,
  onApply,
}: {
  event: Event;
  member: Member | null;
  onApply: () => void;
}) {
  const ticketsUrl = event.ticketUrl || "#";
  const dateLabel = formatShortDate(event.date);

  return (
    <section className="whisper" id="whisper" data-screen-label="Apply">
      <WingedHeart />
      <div className="whisper-cta">
        <div>
          <div className="mono" style={{ marginBottom: 12 }}>
            {member
              ? `The door is open for you, ${member.name.split(" ")[0]}`
              : `The next door opens ${dateLabel}`}
          </div>
          <h3 className="display whisper-title">
            {member ? (
              <>Claim your <em>seat</em>.</>
            ) : (
              <>If you&apos;ve read this far, <em>apply</em>.</>
            )}
          </h3>
        </div>
        {member ? (
          <a className="btn-gold" href={ticketsUrl} target="_blank" rel="noopener noreferrer">
            Purchase tickets <span className="arr">→</span>
          </a>
        ) : (
          <button className="btn-gold" onClick={onApply}>
            Begin your application <span className="arr">→</span>
          </button>
        )}
      </div>
    </section>
  );
}
