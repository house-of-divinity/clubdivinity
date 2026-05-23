import { EmailShell, EmailBodyText, EmailButton } from "./Shell";

export type ApplicationApprovedVars = {
  siteUrl: string;             // homepage — opens the public site so they sign in fresh
  partnerFirstName?: string;
  eventLine?: string;          // e.g. "VI · The Lovers"
  eventDateLine?: string;      // e.g. "Friday, June 19 · Las Vegas"
  curatorNote?: string;        // optional personal line from the curator
};

export const APPLICATION_APPROVED_SUBJECT = "Welcome to the room.";

export function ApplicationApproved({
  siteUrl,
  partnerFirstName,
  eventLine,
  eventDateLine,
  curatorNote,
}: ApplicationApprovedVars) {
  const partnerLine = partnerFirstName ? ` and ${partnerFirstName}` : "";
  return (
    <EmailShell
      preview="Your application has been accepted. Welcome to the room."
      headline="Welcome to the <em>room</em>."
    >
      {curatorNote && (
        <EmailBodyText>
          {`"${curatorNote}"`}
        </EmailBodyText>
      )}
      <EmailBodyText>
        {`The door opens for you.

You${partnerLine} have been admitted to Club Divinity.
The room is yours from this moment forward.

Visit the site whenever you're ready —
tap "Member sign in" and we'll send you a
fresh one-time link to your inbox.`}
      </EmailBodyText>
      <EmailButton href={siteUrl}>Enter the site →</EmailButton>
      <EmailBodyText>
        {`Once you're inside, you'll see the next
gathering and can secure your place.${eventLine ? `

${eventLine}
${eventDateLine ?? ""}` : ""}`}
      </EmailBodyText>
    </EmailShell>
  );
}
