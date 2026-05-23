import { EmailShell, EmailBodyText, EmailButton } from "./Shell";

export type EventReminderVars = {
  nights: number;
  eventLine: string;            // "VI · The Lovers"
  eventDateLine: string;        // "Friday, June 19"
  ticketUrl: string;
  hosts?: string;
};

export const EVENT_REMINDER_SUBJECT = (eventName: string, nights: number) =>
  `${eventName} — ${nights} nights from now`;

export function EventReminder({
  nights,
  eventLine,
  eventDateLine,
  ticketUrl,
  hosts = "Madison Wilde and Bree Sky",
}: EventReminderVars) {
  return (
    <EmailShell
      preview={`${eventLine} is ${nights} nights away. Secure your place.`}
      headline={`${spell(nights)} <em>nights</em>.`}
    >
      <EmailBodyText>
        {`${eventLine} will be held in Las Vegas
on ${eventDateLine}. Hosted by ${hosts},
with a live performance the room is sworn
to silence on.

Members may secure their place now:`}
      </EmailBodyText>
      <EmailButton href={ticketUrl}>Purchase tickets →</EmailButton>
      <EmailBodyText>
        {`Tickets close at capacity.
The address is sent forty-eight hours
before the door opens.`}
      </EmailBodyText>
    </EmailShell>
  );
}

// Spell small numbers — "Fourteen nights." > "14 nights."
function spell(n: number): string {
  const words = [
    "zero","one","two","three","four","five","six","seven","eight","nine",
    "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
    "seventeen","eighteen","nineteen","twenty",
  ];
  if (n <= 20) return cap(words[n]);
  return String(n);
}
function cap(s: string) { return s[0].toUpperCase() + s.slice(1); }
