-- ─────────────────────────────────────────────────────────────
-- Club Divinity — capacity_label split
-- Apply in Supabase Dashboard → SQL Editor → New query.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────

-- Add the public-facing capacity label. This is what readers
-- see ("Intimate", "Limited to two dozen", whatever the curators
-- want to write). Optional — if NULL, nothing displays.
alter table events
  add column if not exists capacity_label text;

-- NOTE: capacity_souls remains as the int — but it is now
-- ADMIN-ONLY. Never display this number on the public site.
-- It exists purely to track sold-vs-capacity in the admin
-- dashboard and to gate sold-out flags.
