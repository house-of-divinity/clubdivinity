import { EmailShell, EmailBodyText, EmailRef } from "./Shell";

export type ApplicationReceivedVars = { ref: string };

export const APPLICATION_RECEIVED_SUBJECT = "Your file is in the room";

export function ApplicationReceived({ ref }: ApplicationReceivedVars) {
  return (
    <EmailShell
      preview={`Your application has been received. Reference ${ref}.`}
      headline="Your file is in the <em>room</em>."
    >
      <EmailBodyText>
        {`We have your file in hand.

Our curators read every submission by hand —
not by algorithm, not by template. You'll
hear from us within seven days.

Your reference, for your records:`}
      </EmailBodyText>
      <EmailRef value={ref} />
    </EmailShell>
  );
}
