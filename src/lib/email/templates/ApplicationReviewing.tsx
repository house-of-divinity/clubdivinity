import { EmailShell, EmailBodyText } from "./Shell";

export const APPLICATION_REVIEWING_SUBJECT = "A note from the room";

export function ApplicationReviewing() {
  return (
    <EmailShell
      preview="Your file has been opened. One of us is reading it now."
      headline="A note from the <em>room</em>."
    >
      <EmailBodyText>
        {`This is the moment you'd want to know about.
Your file has been opened. One of us is reading it now.

A decision is coming. Not today — but soon.`}
      </EmailBodyText>
    </EmailShell>
  );
}
