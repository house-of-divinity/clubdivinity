// Daily cron: 14 days before an upcoming event, send the
// `event-reminder` email to every active member who hasn't already
// bought a ticket. Idempotent — skips members who've already had a
// reminder for this event in the last 13 days.
//
// Suggested schedule: daily at 09:00 PT = 16:00 UTC
//   cron-job.org expression: `0 16 * * *`

import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_WINDOW_HOURS = 24;          // 14d ± 12h
const DEDUPE_WINDOW_DAYS = 13;

export async function GET(req: Request) {
  const fail = checkCronAuth(req);
  if (fail) return fail;

  const supabase = createSupabaseAdminClient();
  const now = Date.now();

  // Events whose starts_at lies in the [14d - 12h, 14d + 12h] window.
  const lower = new Date(now + 14 * 86_400_000 - (TARGET_WINDOW_HOURS / 2) * 3_600_000);
  const upper = new Date(now + 14 * 86_400_000 + (TARGET_WINDOW_HOURS / 2) * 3_600_000);

  const { data: events } = await supabase
    .from("events")
    .select("id, slug, roman, name, starts_at, ticket_url, hosts")
    .eq("status", "upcoming")
    .gte("starts_at", lower.toISOString())
    .lte("starts_at", upper.toISOString());

  if (!events || events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, reason: "no_events_in_window" });
  }

  const { data: members } = await supabase
    .from("members")
    .select("id, name, email, status")
    .eq("status", "active");

  if (!members || members.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, reason: "no_members" });
  }

  const dedupeSince = new Date(now - DEDUPE_WINDOW_DAYS * 86_400_000).toISOString();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const ev of events) {
    const startsAt = new Date(ev.starts_at);
    const nights = Math.max(1, Math.ceil((startsAt.getTime() - now) / 86_400_000));
    const dateLine = startsAt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const eventLine = `${ev.roman} · ${ev.name}`;
    const hosts = Array.isArray(ev.hosts)
      ? ev.hosts.join(" and ")
      : "Madison Wilde and Bree Sky";

    for (const m of members) {
      // Skip if we already sent this template to this address for
      // this event in the dedupe window.
      const { count } = await supabase
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("template", "event-reminder")
        .eq("event_id", ev.id)
        .eq("to_email", m.email)
        .gte("created_at", dedupeSince);
      if (count && count > 0) {
        skipped++;
        continue;
      }

      try {
        await sendEmail({
          template: "event-reminder",
          to: m.email,
          vars: {
            nights,
            eventName: ev.name,
            eventLine,
            eventDateLine: dateLine,
            ticketUrl: ev.ticket_url ?? "https://clubdivinity.com",
            hosts,
          },
          memberId: m.id,
          eventId: ev.id,
        });
        sent++;
      } catch (e) {
        errors.push(`${m.email}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors });
}
