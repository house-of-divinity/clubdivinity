// Event types + fallback. Pure module — no server imports — so
// client components can safely `import type { Event }` from here
// without dragging in next/headers or Supabase server code.
//
// The actual DB loader lives in src/app/page.tsx (server component
// only) so the server-only Supabase code never leaks into the
// client bundle.

export type Event = {
  id: string;
  slug: string;
  roman: string;
  name: string;
  tagline?: string;
  date: string;             // YYYY-MM-DD (Pacific date)
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

export const NEXT_EVENT_FALLBACK: Event = {
  id: "vi-the-lovers",
  slug: "vi-the-lovers",
  roman: "VI",
  name: "The Lovers",
  tagline: "A Wilde Night where the Sky's the limit",
  date: "2026-06-19",
  city: "Las Vegas",
  posterUrl: "/assets/lovers-poster.jpeg",
  ticketUrl: "https://divinity.ticketspice.com/vi-the-lovers",
  hosts: "Madison Wilde · Bree Sky",
  capacityNumber: 60,
  status: "upcoming",
};
