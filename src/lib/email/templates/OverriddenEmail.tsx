// Generic email template used when an admin has saved an override
// for one of the lifecycle templates. Renders the brand shell
// (✦ DIVINITY ✦ header + footer) with the admin's headline + body.
//
// Template-specific extras (e.g. the gold "Enter the site" button
// for approval, the reference chip for received) are added via the
// `extras` prop so overrides keep the special UX without admins
// needing to know about React.

import type { ReactNode } from "react";
import { EmailShell, EmailBodyText, EmailButton, EmailRef } from "./Shell";

export type EmailExtras =
  | { kind: "button"; href: string; label: string }
  | { kind: "ref"; value: string }
  | { kind: "none" };

export function OverriddenEmail({
  preview,
  headline,
  body,
  extras = { kind: "none" },
  trailing,
}: {
  preview: string;
  headline: string;     // HTML allowed for <em>
  body: string;         // plain text, paragraphs separated by blank lines
  extras?: EmailExtras;
  trailing?: ReactNode; // optional content after extras (e.g. a closing paragraph)
}) {
  return (
    <EmailShell preview={preview} headline={headline}>
      {body.split(/\n\s*\n/).map((para, i) => (
        <EmailBodyText key={i}>{para}</EmailBodyText>
      ))}
      {extras.kind === "button" && (
        <EmailButton href={extras.href}>{extras.label}</EmailButton>
      )}
      {extras.kind === "ref" && <EmailRef value={extras.value} />}
      {trailing}
    </EmailShell>
  );
}
