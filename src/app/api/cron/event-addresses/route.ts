// Hourly cron: 48 hours before an upcoming event, send the
// `event-address` email to every ticket holder. Idempotent.
//
// Suggested schedule: hourly on the hour
//   cron-job.org expression: `0 * * * *`

import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = checkCronAuth(req);
  if (fail) return fail;

  const supabase = createSupabaseAdminClient();
  const now = Date.now();

  // 47-48h window so an hourly cron covers it exactly once.
  const lower = new Date(now + 47 * 3_600_000);
  const upper = new Date(now + 48 * 3_600_000);

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, roman, name, starts_at, venue_name, venue_address, venue_city, venue_state",
    )
    .eq("status", "upcoming")
    .gte("starts_at", lower.toISOString())
    .lte("starts_at", upper.toISOString());

  if (!events || events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, reason: "no_events_in_window" });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const ev of events) {
    if (!ev.venue_name || !ev.venue_address) {
      errors.push(`event ${ev.id}: missing venue fields`);
      continue;
    }

    const { data: tickets } = await supabase
      .from("event_tickets")
      .select("id, buyer_email")
      .eq("event_id", ev.id);

    if (!tickets) continue;

    const startsAt = new Date(ev.starts_at);
    const weekday = startsAt.toLocaleDateString("en-US", { weekday: "long" });
    const dateLine = startsAt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }) + ` · ${startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}, sharp`;
    const eventLine = `${ev.roman} · ${ev.name}`;

    for (const t of tickets) {
      // De-dupe: only send once per ticket.
      const { count } = await supabase
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("template", "event-address")
        .eq("event_id", ev.id)
        .eq("to_email", t.buyer_email);
      if (count && count > 0) {
        skipped++;
        continue;
      }

      try {
        await sendEmail({
          template: "event-address",
          to: t.buyer_email,
          vars: {
            eventLine,
            eventDateLine: dateLine,
            eventWeekday: weekday,
            venueName: ev.venue_name,
            venueAddress: ev.venue_address,
            venueCity: ev.venue_city ?? "",
            venueState: ev.venue_state ?? "",
          },
          eventId: ev.id,
        });
        sent++;
      } catch (e) {
        errors.push(`${t.buyer_email}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors });
}
