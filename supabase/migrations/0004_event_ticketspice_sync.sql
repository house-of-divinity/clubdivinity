-- ─────────────────────────────────────────────────────────────
-- Club Divinity — TicketSpice sync columns
-- Apply in Supabase Dashboard → SQL Editor → New query.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────

-- TicketSpice form ID for each event. The /api/cron/sync-tickets
-- cron iterates over upcoming events with a non-null form_id and
-- polls TicketSpice's API for new tickets since `tickets_last_sync`.
alter table events
  add column if not exists ticketspice_form_id bigint;

alter table events
  add column if not exists tickets_last_sync timestamptz;
