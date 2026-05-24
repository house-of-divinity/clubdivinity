// GET /api/cron/sync-tickets
//
// Hourly cron. For every upcoming event with a ticketspice_form_id,
// pull tickets from TicketSpice's API created/updated since the
// last sync timestamp. Insert new tickets into event_tickets,
// matching buyer_email to existing members where possible.
//
// Cron schedule (in .github/workflows/cron-sync-tickets.yml):
//   '0 * * * *'   — every hour on the hour
//
// API contract (Webconnex / TicketSpice):
//   GET https://api.webconnex.com/v2/public/search/tickets
//     ?product=ticketspice.com
//     &formId={form_id}
//     &dateUpdatedAfter={iso8601}
//     &limit=250
//     &startingAfter={cursor}
//   Header: apiKey: <TICKETSPICE_API_KEY>

import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = "https://api.webconnex.com/v2/public/search/tickets";

type TicketSpiceTicket = {
  id: number;
  orderId: number;
  orderEmail: string;
  orderNumber: string;
  total?: number;
  amount?: number;
  fee?: number;
  dateCreated: string;
  dateUpdated: string;
  billing?: {
    firstName?: string;
    lastName?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

export async function GET(req: Request) {
  const fail = checkCronAuth(req);
  if (fail) return fail;

  const apiKey = process.env.TICKETSPICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "TICKETSPICE_API_KEY not configured" },
      { status: 500 },
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id, slug, ticketspice_form_id, tickets_last_sync, capacity_souls, status")
    .in("status", ["upcoming", "sold-out"])
    .not("ticketspice_form_id", "is", null);

  if (evErr) {
    return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });
  }
  if (!events || events.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      reason: "no_upcoming_events_with_form_id",
    });
  }

  const summary: Array<{
    eventId: string;
    formId: number;
    fetched: number;
    inserted: number;
    matchedMembers: number;
    soldOut?: boolean;
    ticketsHeld?: number;
    error?: string;
  }> = [];

  for (const ev of events) {
    const formId = ev.ticketspice_form_id as number;
    const since =
      ev.tickets_last_sync ??
      // First-ever sync — pull tickets from the last 60 days.
      new Date(Date.now() - 60 * 86_400_000).toISOString();

    const result = await syncEventTickets({
      supabase,
      apiKey,
      eventId: ev.id,
      formId,
      since,
    });

    // After syncing, check if we've crossed capacity. If yes AND
    // the event isn't already marked sold-out/past/cancelled, flip
    // it to sold-out so the website + emails reflect that.
    let soldOut: boolean | undefined;
    let ticketsHeld: number | undefined;
    if (!result.error && ev.capacity_souls) {
      const { count } = await supabase
        .from("event_tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", ev.id);
      ticketsHeld = count ?? 0;
      if (ticketsHeld >= ev.capacity_souls && ev.status === "upcoming") {
        await supabase
          .from("events")
          .update({ status: "sold-out" })
          .eq("id", ev.id);
        soldOut = true;
      } else {
        soldOut = ev.status === "sold-out";
      }
    }

    summary.push({ eventId: ev.id, formId, ...result, soldOut, ticketsHeld });

    // Stamp the last sync time even on partial failure (we'll
    // catch the missed window on the next cron run anyway).
    if (!result.error) {
      await supabase
        .from("events")
        .update({ tickets_last_sync: new Date().toISOString() })
        .eq("id", ev.id);
    }
  }

  return NextResponse.json({ ok: true, events: summary });
}

async function syncEventTickets({
  supabase,
  apiKey,
  eventId,
  formId,
  since,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  apiKey: string;
  eventId: string;
  formId: number;
  since: string;
}): Promise<{
  fetched: number;
  inserted: number;
  matchedMembers: number;
  error?: string;
}> {
  let fetched = 0;
  let inserted = 0;
  let matchedMembers = 0;
  let startingAfter: number | null = null;
  const seenTicketIds = new Set<string>();

  try {
    // Paginate through all results since the last sync.
    for (let page = 0; page < 50; page++) {
      const params = new URLSearchParams({
        product: "ticketspice.com",
        formId: String(formId),
        dateUpdatedAfter: since,
        limit: "250",
        sort: "asc",
      });
      if (startingAfter !== null) params.set("startingAfter", String(startingAfter));

      const res = await fetch(`${API_BASE}?${params}`, {
        headers: { apiKey },
        cache: "no-store",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`TicketSpice ${res.status}: ${txt.slice(0, 200)}`);
      }
      const json = (await res.json()) as { data?: TicketSpiceTicket[] };
      const batch = json.data ?? [];
      if (batch.length === 0) break;

      fetched += batch.length;

      // Filter out tickets we've already seen (in case the API
      // returns the same one on page boundaries) and ones we
      // already have in the DB.
      const newTicketIds: string[] = [];
      for (const t of batch) {
        const tid = String(t.id);
        if (seenTicketIds.has(tid)) continue;
        seenTicketIds.add(tid);
        newTicketIds.push(tid);
      }

      const { data: existing } = await supabase
        .from("event_tickets")
        .select("ticketspice_id")
        .in("ticketspice_id", newTicketIds);
      const have = new Set(existing?.map((r) => r.ticketspice_id) ?? []);

      const toInsert = batch.filter((t) => !have.has(String(t.id)));

      // Match buyer emails to existing members
      const emails = Array.from(
        new Set(
          toInsert.map((t) => t.orderEmail?.toLowerCase()).filter(Boolean),
        ),
      );
      const memberByEmail = new Map<string, string>();
      if (emails.length > 0) {
        const { data: members } = await supabase
          .from("members")
          .select("id, email")
          .in("email", emails);
        members?.forEach((m) => {
          memberByEmail.set(m.email.toLowerCase(), m.id);
        });
      }

      // Insert rows. Use upsert on ticketspice_id so a re-run is safe.
      if (toInsert.length > 0) {
        const rows = toInsert.map((t) => {
          const memberId = memberByEmail.get(t.orderEmail.toLowerCase()) ?? null;
          if (memberId) matchedMembers++;
          return {
            event_id: eventId,
            member_id: memberId,
            ticketspice_id: String(t.id),
            buyer_email: t.orderEmail,
            quantity: 1,
            purchased_at: t.dateCreated,
            raw: t,
          };
        });
        const { error: insErr } = await supabase
          .from("event_tickets")
          .upsert(rows, { onConflict: "ticketspice_id", ignoreDuplicates: true });
        if (insErr) throw new Error(`insert: ${insErr.message}`);
        inserted += toInsert.length;
      }

      // Pagination: stop if we got fewer than the page limit (means
      // this was the last page). Otherwise advance the cursor.
      if (batch.length < 250) break;
      startingAfter = batch[batch.length - 1].id;
    }

    return { fetched, inserted, matchedMembers };
  } catch (e) {
    return {
      fetched,
      inserted,
      matchedMembers,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
