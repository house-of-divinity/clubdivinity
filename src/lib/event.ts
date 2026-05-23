// Static event data — replaced with a Supabase query once the
// database is wired. Mirrors the seeded VI · The Lovers row.

export type Event = {
  id: string;
  slug: string;
  roman: string;
  name: string;
  tagline?: string;
  date: string;             // YYYY-MM-DD
  time?: string;            // free-form door text
  city?: string;
  posterUrl?: string;
  ticketUrl?: string;
  hosts?: string;
  // Public-facing capacity label. Shown on the website if set.
  // Free-form: "Intimate", "By invitation only", etc.
  capacityLabel?: string;
  // Internal seat count — ADMIN ONLY, never shown publicly.
  // Used to draw the "room is filling" capacity bar in admin and
  // to detect sold-out when matched against event_tickets.
  capacityNumber?: number;
  status?: "upcoming" | "past" | "cancelled" | "sold-out";
};

export const NEXT_EVENT: Event = {
  id: "vi-the-lovers",
  slug: "vi-the-lovers",
  roman: "VI",
  name: "The Lovers",
  tagline: "A Wilde Night where the Sky's the limit",
  date: "2026-06-19",
  time: "Entry 10:30 PM – 12:30 AM · doors lock at 12:30 · room closes at 3 AM",
  city: "Las Vegas",
  posterUrl: "/assets/lovers-poster.jpeg",
  ticketUrl: "https://divinity.ticketspice.com/vi-the-lovers",
  hosts: "Madison Wilde · Bree Sky",
  capacityLabel: undefined,
  capacityNumber: 60,
  status: "upcoming",
};

export const UPCOMING_EVENTS: Event[] = [NEXT_EVENT];
