// Static event data — will be replaced with a Supabase query
// once the database is wired up. Mirrors what the prototype's
// admin dashboard puts in localStorage (cd_events) by default,
// and what DATA_MODEL.md seeds for the first event.

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
  capacity?: string;        // free-form ("Intimate", "60 souls", etc.)
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
  capacity: "60 souls",
  status: "upcoming",
};

export const UPCOMING_EVENTS: Event[] = [NEXT_EVENT];
