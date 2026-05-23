import { EmailShell, EmailBodyText } from "./Shell";

export const APPLICATION_DECLINED_SUBJECT = "Not this room, not this night";

export function ApplicationDeclined() {
  return (
    <EmailShell
      preview="A note from Divinity."
      headline="Not this <em>room</em>, not this night."
    >
      <EmailBodyText>
        {`Thank you for trusting us with your file.

This particular night isn't the right
fit — and that says nothing about you,
only about the room we're composing.

We will not retain your photo or
documents beyond ninety days.`}
      </EmailBodyText>
    </EmailShell>
  );
}
