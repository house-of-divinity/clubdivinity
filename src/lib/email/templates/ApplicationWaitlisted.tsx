import { EmailShell, EmailBodyText } from "./Shell";

export type ApplicationWaitlistedVars = { eventName?: string };

export const APPLICATION_WAITLISTED_SUBJECT = "Held for the next chair";

export function ApplicationWaitlisted({
  eventName = "this gathering",
}: ApplicationWaitlistedVars) {
  return (
    <EmailShell
      preview="The room is full — your file is held for the next chair."
      headline="Held for the <em>next chair</em>."
    >
      <EmailBodyText>
        {`Your file is beautiful — and the room
for ${eventName} is already full.

We are holding your application for the
next gathering. If a chair opens before then,
yours is the first we offer.

You don't need to do anything. We will
write again before the next door opens.`}
      </EmailBodyText>
    </EmailShell>
  );
}
