// sendEmail: render a React Email template, send via Resend, log
// the attempt in email_log.
//
// Two render paths:
//   1. Admin override exists in email_templates → render
//      OverriddenEmail with the admin's subject/headline/body
//      (variables interpolated from the call-site vars).
//   2. No override → render the hand-coded default template.
//
// The Reply-To header is always set to hello@clubdivinity.com so
// replies route into Workspace regardless of what the From address
// is. (Useful when we send from noreply@clubdivinity.com to keep
// Gmail from showing the Workspace user's avatar.)

import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { TEMPLATES, interpolate, type TemplateId } from "./templates-meta";
import { OverriddenEmail, type EmailExtras } from "./templates/OverriddenEmail";
import {
  ApplicationReceived,
  type ApplicationReceivedVars,
} from "./templates/ApplicationReceived";
import { ApplicationReviewing } from "./templates/ApplicationReviewing";
import {
  ApplicationApproved,
  type ApplicationApprovedVars,
} from "./templates/ApplicationApproved";
import {
  ApplicationWaitlisted,
  type ApplicationWaitlistedVars,
} from "./templates/ApplicationWaitlisted";
import { ApplicationDeclined } from "./templates/ApplicationDeclined";
import {
  EventReminder,
  type EventReminderVars,
} from "./templates/EventReminder";
import {
  EventAddress,
  type EventAddressVars,
} from "./templates/EventAddress";

type SendArgs =
  | { template: "application-received";    to: string; vars: ApplicationReceivedVars;     applicationId?: string }
  | { template: "application-reviewing";   to: string; vars?: Record<string, never>;       applicationId?: string }
  | { template: "application-approved";    to: string; vars: ApplicationApprovedVars;     applicationId?: string; memberId?: string }
  | { template: "application-waitlisted";  to: string; vars?: ApplicationWaitlistedVars;  applicationId?: string }
  | { template: "application-declined";    to: string; vars?: Record<string, never>;       applicationId?: string }
  | { template: "event-reminder";          to: string; vars: EventReminderVars & { eventName: string }; memberId?: string; eventId?: string }
  | { template: "event-address";           to: string; vars: EventAddressVars & { eventWeekday: string };  memberId?: string; eventId?: string };

const REPLY_TO = "hello@clubdivinity.com";

export async function sendEmail(args: SendArgs): Promise<string | null> {
  const useTestRecipient =
    process.env.RESEND_FROM?.includes("@resend.dev") &&
    !!process.env.TEST_RECIPIENT;
  const realTo = args.to;
  const to = useTestRecipient ? process.env.TEST_RECIPIENT! : realTo;

  const supabase = createSupabaseAdminClient();
  const { data: override } = await supabase
    .from("email_templates")
    .select("subject, headline, body")
    .eq("id", args.template)
    .maybeSingle();

  const { node, subject } = override
    ? renderOverride(args, override)
    : renderDefault(args);

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const finalSubject = useTestRecipient
    ? `[TEST → ${realTo}] ${subject}`
    : subject;

  let providerId: string | null = null;
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo: REPLY_TO,
      subject: finalSubject,
      react: node,
    });
    if (error) {
      status = "failed";
      errorMessage = error.message;
    } else {
      providerId = data?.id ?? null;
    }
  } catch (e) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : "unknown error";
  }

  try {
    await supabase.from("email_log").insert({
      to_email: realTo,
      template: args.template,
      subject,
      application_id: "applicationId" in args ? args.applicationId ?? null : null,
      member_id: "memberId" in args ? args.memberId ?? null : null,
      event_id: "eventId" in args ? args.eventId ?? null : null,
      status,
      provider_id: providerId,
      error: errorMessage,
    });
  } catch {
    /* swallow */
  }

  if (status === "failed") {
    throw new Error(errorMessage || "send failed");
  }
  return providerId;
}

function renderDefault(args: SendArgs): { node: React.ReactElement; subject: string } {
  const meta = TEMPLATES[args.template as TemplateId];
  switch (args.template) {
    case "application-received":
      return { node: <ApplicationReceived {...args.vars} />, subject: meta.defaultSubject };
    case "application-reviewing":
      return { node: <ApplicationReviewing />, subject: meta.defaultSubject };
    case "application-approved":
      return { node: <ApplicationApproved {...args.vars} />, subject: meta.defaultSubject };
    case "application-waitlisted":
      return { node: <ApplicationWaitlisted {...(args.vars ?? {})} />, subject: meta.defaultSubject };
    case "application-declined":
      return { node: <ApplicationDeclined />, subject: meta.defaultSubject };
    case "event-reminder": {
      return {
        node: <EventReminder {...args.vars} />,
        subject: `${args.vars.eventName} — ${args.vars.nights} nights from now`,
      };
    }
    case "event-address":
      return {
        node: <EventAddress {...args.vars} />,
        subject: `For ${args.vars.eventWeekday} — the address`,
      };
  }
}

function renderOverride(
  args: SendArgs,
  override: { subject: string; headline: string; body: string },
): { node: React.ReactElement; subject: string } {
  const vars = buildVarsMap(args);
  const subject = interpolate(override.subject, vars);
  const headline = interpolate(override.headline, vars);
  const body = interpolate(override.body, vars);
  const extras = extrasFor(args);

  return {
    node: (
      <OverriddenEmail
        preview={subject}
        headline={headline}
        body={body}
        extras={extras}
      />
    ),
    subject,
  };
}

function extrasFor(args: SendArgs): EmailExtras {
  switch (args.template) {
    case "application-received":
      return { kind: "ref", value: args.vars.ref };
    case "application-approved":
      return { kind: "button", href: args.vars.siteUrl, label: "Enter the site →" };
    case "event-reminder":
      return { kind: "button", href: args.vars.ticketUrl, label: "Purchase tickets →" };
    default:
      return { kind: "none" };
  }
}

function buildVarsMap(args: SendArgs): Record<string, string> {
  const m: Record<string, string> = {};
  if ("vars" in args && args.vars) {
    for (const [k, v] of Object.entries(args.vars)) {
      if (v !== null && v !== undefined) m[k] = String(v);
    }
  }
  if (args.template === "application-approved") {
    m.partnerInsert = args.vars.partnerFirstName
      ? ` and ${args.vars.partnerFirstName}`
      : "";
  }
  if (args.template === "event-reminder") {
    m.nightsWord = spellNights(args.vars.nights);
  }
  return m;
}

function spellNights(n: number): string {
  const words = [
    "Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
    "Seventeen","Eighteen","Nineteen","Twenty",
  ];
  return n <= 20 ? words[n] : String(n);
}
