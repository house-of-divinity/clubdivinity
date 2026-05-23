import { EmailShell, EmailBodyText } from "./Shell";

export type EventAddressVars = {
  eventLine: string;            // "VI · The Lovers"
  eventDateLine: string;        // "Friday, June 19 · 8:30 PM, sharp"
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
};

export const EVENT_ADDRESS_SUBJECT = (eventWeekday: string) =>
  `For ${eventWeekday} — the address`;

export function EventAddress({
  eventLine,
  eventDateLine,
  venueName,
  venueAddress,
  venueCity,
  venueState,
}: EventAddressVars) {
  return (
    <EmailShell
      preview={`The address for ${eventLine}.`}
      headline="For the <em>night</em> — the address."
    >
      <EmailBodyText>
        {`The room is set.

${eventLine}
${eventDateLine}

${venueName}
${venueAddress}
${venueCity}, ${venueState}

Park valet at the front. Your name will
already be on the list.

A private dressing room is on the third
floor — arrive in whatever you'd like
to be seen in publicly; step into your
night-self inside.`}
      </EmailBodyText>
    </EmailShell>
  );
}
