// sendEmail: render a React Email template, send via Resend, log
// the attempt in email_log (success or failure). Returns the
// Resend message id or throws on failure.
//
// The first arg `template` is one of the supported ids — the same
// strings the admin editor uses. Variables for each template are
// strongly typed via the union below.

import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ApplicationReceived,
  APPLICATION_RECEIVED_SUBJECT,
  type ApplicationReceivedVars,
} from "./templates/ApplicationReceived";
import {
  ApplicationReviewing,
  APPLICATION_REVIEWING_SUBJECT,
} from "./templates/ApplicationReviewing";
import {
  ApplicationApproved,
  APPLICATION_APPROVED_SUBJECT,
  type ApplicationApprovedVars,
} from "./templates/ApplicationApproved";
import {
  ApplicationWaitlisted,
  APPLICATION_WAITLISTED_SUBJECT,
  type ApplicationWaitlistedVars,
} from "./templates/ApplicationWaitlisted";
import {
  ApplicationDeclined,
  APPLICATION_DECLINED_SUBJECT,
} from "./templates/ApplicationDeclined";
import {
  EventReminder,
  EVENT_REMINDER_SUBJECT,
  type EventReminderVars,
} from "./templates/EventReminder";
import {
  EventAddress,
  EVENT_ADDRESS_SUBJECT,
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

export async function sendEmail(args: SendArgs): Promise<string | null> {
  // For local dev / test mode we silently redirect every email to
  // TEST_RECIPIENT so we don't get blocked by Resend's "test sender
  // can only deliver to the signup address" policy. Production sets
  // RESEND_FROM to a verified domain and we drop the redirect.
  const useTestRecipient =
    process.env.RESEND_FROM?.includes("@resend.dev") &&
    !!process.env.TEST_RECIPIENT;
  const realTo = args.to;
  const to = useTestRecipient ? process.env.TEST_RECIPIENT! : realTo;

  const { node, subject } = render(args);
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Prefix the subject in test mode so it's obvious which "real"
  // recipient the email was meant for.
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

  // Best-effort audit log. If email_log insert fails we don't
  // throw — the email itself either landed or didn't.
  try {
    const supabase = createSupabaseAdminClient();
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

function render(args: SendArgs): { node: React.ReactElement; subject: string } {
  switch (args.template) {
    case "application-received":
      return {
        node: <ApplicationReceived {...args.vars} />,
        subject: APPLICATION_RECEIVED_SUBJECT,
      };
    case "application-reviewing":
      return {
        node: <ApplicationReviewing />,
        subject: APPLICATION_REVIEWING_SUBJECT,
      };
    case "application-approved":
      return {
        node: <ApplicationApproved {...args.vars} />,
        subject: APPLICATION_APPROVED_SUBJECT,
      };
    case "application-waitlisted":
      return {
        node: <ApplicationWaitlisted {...(args.vars ?? {})} />,
        subject: APPLICATION_WAITLISTED_SUBJECT,
      };
    case "application-declined":
      return {
        node: <ApplicationDeclined />,
        subject: APPLICATION_DECLINED_SUBJECT,
      };
    case "event-reminder":
      return {
        node: <EventReminder {...args.vars} />,
        subject: EVENT_REMINDER_SUBJECT(args.vars.eventName, args.vars.nights),
      };
    case "event-address":
      return {
        node: <EventAddress {...args.vars} />,
        subject: EVENT_ADDRESS_SUBJECT(args.vars.eventWeekday),
      };
  }
}
