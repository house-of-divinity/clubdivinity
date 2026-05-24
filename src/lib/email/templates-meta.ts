// Metadata for all transactional email templates.
//
// Used by:
//   - /admin/emails UI (lists templates + shows available variables)
//   - sendEmail (defaults to fall back on when no override is set)
//
// Each entry describes one template the admin can edit. Admins
// override Subject + Headline + Body via the editor; the React
// Email components keep their special elements (buttons, ref chips)
// intact so styling stays consistent.

export type TemplateMeta = {
  id: TemplateId;
  label: string;          // shown in the admin sidebar
  trigger: string;        // when it fires (admin context line)
  vars: VarHint[];        // variables admins can use in their override body
  defaultSubject: string;
  defaultHeadline: string; // HTML with <em>...</em> allowed for gold italic
  defaultBody: string;     // plain text body (paragraphs separated by blank lines)
};

export type VarHint = {
  name: string;            // e.g. "ref"
  description: string;     // shown in the admin to explain what it interpolates
};

export type TemplateId =
  | "application-received"
  | "application-reviewing"
  | "application-approved"
  | "application-waitlisted"
  | "application-declined"
  | "event-reminder"
  | "event-address";

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  "application-received": {
    id: "application-received",
    label: "Application received",
    trigger: "Sent automatically when someone submits the application form.",
    vars: [
      { name: "ref", description: "The application reference shown to the applicant (e.g. DV-A3F9KX)." },
    ],
    defaultSubject: "Your file is in the room",
    defaultHeadline: "Your file is in the <em>room</em>.",
    defaultBody: `We have your file in hand.

Our curators read every submission by hand —
not by algorithm, not by template. You'll
hear from us within seven days.

Your reference, for your records:`,
  },

  "application-reviewing": {
    id: "application-reviewing",
    label: "Application reviewing",
    trigger: "Sent when a curator marks an application as 'reviewing' (and ticks Send email).",
    vars: [],
    defaultSubject: "A note from the room",
    defaultHeadline: "A note from the <em>room</em>.",
    defaultBody: `This is the moment you'd want to know about.
Your file has been opened. One of us is reading it now.

A decision is coming. Not today — but soon.`,
  },

  "application-approved": {
    id: "application-approved",
    label: "Application approved",
    trigger: "Sent when a curator approves an application.",
    vars: [
      { name: "siteUrl", description: "Link to clubdivinity.com (used by the gold 'Enter the site' button)." },
      { name: "partnerFirstName", description: "For couples, the second partner's first name. Empty for solo applicants." },
      { name: "eventLine", description: "Current next event display string, e.g. 'VI · The Lovers'." },
      { name: "eventDateLine", description: "Current event date, e.g. 'Friday, June 19 · Las Vegas'." },
      { name: "curatorNote", description: "Optional personal line the curator typed when approving. Empty if none." },
    ],
    defaultSubject: "Welcome to the room.",
    defaultHeadline: "Welcome to the <em>room</em>.",
    defaultBody: `The door opens for you.

You{{partnerInsert}} have been admitted to Club Divinity.
The room is yours from this moment forward.

Visit the site whenever you're ready —
tap "Member sign in" and we'll send you a
fresh one-time code to your inbox.`,
  },

  "application-waitlisted": {
    id: "application-waitlisted",
    label: "Application waitlisted",
    trigger: "Sent when a curator moves an application to waitlist.",
    vars: [
      { name: "eventName", description: "Name of the gathering they're waitlisted for." },
    ],
    defaultSubject: "Held for the next chair",
    defaultHeadline: "Held for the <em>next chair</em>.",
    defaultBody: `Your file is beautiful — and the room
for {{eventName}} is already full.

We are holding your application for the
next gathering. If a chair opens before then,
yours is the first we offer.

You don't need to do anything. We will
write again before the next door opens.`,
  },

  "application-declined": {
    id: "application-declined",
    label: "Application declined",
    trigger: "Sent when a curator declines an application.",
    vars: [],
    defaultSubject: "Not this room, not this night",
    defaultHeadline: "Not this <em>room</em>, not this night.",
    defaultBody: `Thank you for trusting us with your file.

This particular night isn't the right
fit — and that says nothing about you,
only about the room we're composing.

We will not retain your photo or
documents beyond ninety days.`,
  },

  "event-reminder": {
    id: "event-reminder",
    label: "Event reminder (14 days)",
    trigger: "Cron sends this 14 days before each upcoming event to all active members.",
    vars: [
      { name: "nights", description: "Number of nights away, e.g. 14." },
      { name: "eventName", description: "Just the name, e.g. 'The Lovers'." },
      { name: "eventLine", description: "Full event display, e.g. 'VI · The Lovers'." },
      { name: "eventDateLine", description: "Date string, e.g. 'Friday, June 19'." },
      { name: "ticketUrl", description: "TicketSpice URL (used by the gold 'Purchase tickets' button)." },
      { name: "hosts", description: "Hosts string, e.g. 'Madison Wilde and Bree Sky'." },
    ],
    defaultSubject: "{{nightsWord}} nights from now",
    defaultHeadline: "{{nightsWord}} <em>nights</em>.",
    defaultBody: `{{eventLine}} will be held in Las Vegas
on {{eventDateLine}}. Hosted by {{hosts}},
with a live performance the room is sworn
to silence on.

Members may secure their place now:`,
  },

  "event-address": {
    id: "event-address",
    label: "Event address (48 hours)",
    trigger: "Cron sends this 48 hours before each event, only to people with tickets.",
    vars: [
      { name: "eventLine", description: "Full event display, e.g. 'VI · The Lovers'." },
      { name: "eventDateLine", description: "Date + time, e.g. 'Friday, June 19 · 8:30 PM, sharp'." },
      { name: "venueName", description: "Venue name (admin-only field on the event)." },
      { name: "venueAddress", description: "Street address." },
      { name: "venueCity", description: "City." },
      { name: "venueState", description: "State." },
    ],
    defaultSubject: "For {{eventWeekday}} — the address",
    defaultHeadline: "For <em>{{eventWeekday}}</em> — the address.",
    defaultBody: `The room is set.

{{eventLine}}
{{eventDateLine}}

{{venueName}}
{{venueAddress}}
{{venueCity}}, {{venueState}}

Park valet at the front. Your name will
already be on the list.

A private dressing room is on the third
floor — arrive in whatever you'd like
to be seen in publicly; step into your
night-self inside.`,
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

// Interpolate {{key}} placeholders in a string using a vars map.
// Unknown keys are left as-is (so admins notice typos).
export function interpolate(
  template: string,
  vars: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    const v = vars[key];
    return v === undefined || v === null ? m : String(v);
  });
}
