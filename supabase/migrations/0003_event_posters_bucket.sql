-- ─────────────────────────────────────────────────────────────
-- Club Divinity — event posters bucket
-- Apply in Supabase Dashboard → SQL Editor → New query.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────

-- Public bucket. Posters are public marketing material — every
-- visitor to the marketing site sees them on the Event Spotlight,
-- in the magic-link email (via /api/current-event-poster), and in
-- iMessage/Slack link previews via the OG image.
insert into storage.buckets (id, name, public)
values ('event-posters', 'event-posters', true)
on conflict (id) do nothing;

-- Anyone can read poster files (it's a public bucket but we still
-- want an explicit policy in case someone toggles the bucket
-- visibility later).
drop policy if exists "event-posters public read" on storage.objects;
create policy "event-posters public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'event-posters');

-- Only admins can write (upload, replace, delete) posters.
drop policy if exists "event-posters admin write" on storage.objects;
create policy "event-posters admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'event-posters' and is_admin())
  with check (bucket_id = 'event-posters' and is_admin());
