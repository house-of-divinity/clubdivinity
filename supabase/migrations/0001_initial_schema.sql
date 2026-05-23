-- ─────────────────────────────────────────────────────────────
-- Club Divinity — initial schema
-- Apply this in Supabase Dashboard → SQL Editor → New query
-- It is idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────

-- pgcrypto gives us gen_random_uuid()
create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────
do $$ begin
  create type application_type as enum ('couple', 'solo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum (
    'received', 'reviewing', 'approved', 'waitlisted',
    'declined', 'withdrawn', 'revoked'
  );
exception when duplicate_object then null; end $$;

-- ─── events ─────────────────────────────────────────────────
create table if not exists events (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  roman             text not null,
  name              text not null,
  tagline           text,
  starts_at         timestamptz not null,
  location_city     text not null default 'Las Vegas',
  location_hint     text,
  ticket_url        text,
  ticket_opens_at   timestamptz,
  ticket_closes_at  timestamptz,
  poster_url        text,
  capacity_souls    int,
  hosts             text[] default array['Madison Wilde', 'Bree Sky'],
  status            text not null default 'upcoming',
  -- Address fields are only ever exposed in the 48-hour email.
  venue_name        text,
  venue_address     text,
  venue_city        text,
  venue_state       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_events_status on events (status, starts_at);

-- ─── applications ───────────────────────────────────────────
create table if not exists applications (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,
  type            application_type not null,
  event_id        uuid references events(id),

  p1_name         text not null,
  p1_age          int  not null check (p1_age >= 21),
  p2_name         text,
  p2_age          int  check (p2_age is null or p2_age >= 21),

  email           text not null,
  phone           text not null,
  city            text not null,

  p1_socials      text,
  p2_socials      text,
  photo_url       text,

  essay           text not null,
  referral        text not null,

  status          application_status not null default 'received',
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  decision_reason text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_apps_status_created on applications (status, created_at desc);
create index if not exists idx_apps_event_status   on applications (event_id, status);
create index if not exists idx_apps_email          on applications (email);
create index if not exists idx_apps_ref            on applications (ref);

-- Bump updated_at on row update.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_applications_updated_at on applications;
create trigger trg_applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

drop trigger if exists trg_events_updated_at on events;
create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();

-- ─── review_notes ───────────────────────────────────────────
create table if not exists review_notes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references applications(id) on delete cascade,
  author_id       uuid not null references auth.users(id),
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_review_notes_app on review_notes (application_id, created_at desc);

-- ─── audit_log ──────────────────────────────────────────────
create table if not exists audit_log (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references applications(id) on delete cascade,
  actor_id        uuid references auth.users(id),
  from_status     application_status,
  to_status       application_status not null,
  reason          text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_audit_app on audit_log (application_id, created_at desc);

-- ─── members ────────────────────────────────────────────────
create table if not exists members (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid unique references auth.users(id),
  application_id  uuid references applications(id),
  pair_id         uuid,
  name            text not null,
  email           text not null unique,
  phone           text,
  admitted_at     timestamptz not null default now(),
  status          text not null default 'active',
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_members_email on members (email);
create index if not exists idx_members_pair  on members (pair_id);

-- ─── event_tickets ──────────────────────────────────────────
create table if not exists event_tickets (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id),
  member_id       uuid references members(id),
  ticketspice_id  text not null unique,
  buyer_email     text not null,
  quantity        int  not null default 1,
  purchased_at    timestamptz not null,
  raw             jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_tickets_event_member on event_tickets (event_id, member_id);
create index if not exists idx_tickets_email        on event_tickets (buyer_email);

-- ─── email_log ──────────────────────────────────────────────
create table if not exists email_log (
  id              uuid primary key default gen_random_uuid(),
  to_email        text not null,
  template        text not null,
  subject         text not null,
  application_id  uuid references applications(id),
  member_id       uuid references members(id),
  event_id        uuid references events(id),
  status          text not null default 'sent',
  provider_id     text,
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_email_log_to       on email_log (to_email, created_at desc);
create index if not exists idx_email_log_template on email_log (template, status);

-- ─── email_templates (admin-editable overrides) ─────────────
create table if not exists email_templates (
  id              text primary key,
  subject         text not null,
  headline        text not null,
  body            text not null,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id)
);

drop trigger if exists trg_email_templates_updated_at on email_templates;
create trigger trg_email_templates_updated_at
  before update on email_templates
  for each row execute function set_updated_at();

-- ─── Helper: is the current request an admin? ───────────────
-- Reads role from app_metadata. Set with:
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
--   where email in ('madison@...', 'bree@...');
create or replace function is_admin() returns boolean
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
$$;

-- ─── Row-level security ─────────────────────────────────────
alter table events           enable row level security;
alter table applications     enable row level security;
alter table review_notes     enable row level security;
alter table audit_log        enable row level security;
alter table members          enable row level security;
alter table event_tickets    enable row level security;
alter table email_log        enable row level security;
alter table email_templates  enable row level security;

-- events: public can read upcoming + past; admin can write.
drop policy if exists "events read public"  on events;
create policy "events read public" on events
  for select using (status in ('upcoming', 'past'));

drop policy if exists "events admin write" on events;
create policy "events admin write" on events
  for all using (is_admin()) with check (is_admin());

-- applications: anyone can insert; only admin can read/update.
-- Applicant lookup by ref happens via a server-side endpoint
-- using the service_role key — never via direct RLS.
drop policy if exists "applications insert public" on applications;
create policy "applications insert public" on applications
  for insert with check (true);

drop policy if exists "applications admin all" on applications;
create policy "applications admin all" on applications
  for all using (is_admin()) with check (is_admin());

-- review_notes, audit_log: admin only.
drop policy if exists "review_notes admin" on review_notes;
create policy "review_notes admin" on review_notes
  for all using (is_admin()) with check (is_admin());

drop policy if exists "audit_log admin" on audit_log;
create policy "audit_log admin" on audit_log
  for all using (is_admin()) with check (is_admin());

-- members: a member can read their own row + their pair partner's row.
drop policy if exists "members self read" on members;
create policy "members self read" on members
  for select using (
    auth_user_id = auth.uid()
    or pair_id in (
      select pair_id from members where auth_user_id = auth.uid()
    )
  );

drop policy if exists "members admin all" on members;
create policy "members admin all" on members
  for all using (is_admin()) with check (is_admin());

-- event_tickets: member reads own; admin reads all.
drop policy if exists "tickets self read" on event_tickets;
create policy "tickets self read" on event_tickets
  for select using (
    member_id in (select id from members where auth_user_id = auth.uid())
  );

drop policy if exists "tickets admin all" on event_tickets;
create policy "tickets admin all" on event_tickets
  for all using (is_admin()) with check (is_admin());

-- email_log + email_templates: admin only.
drop policy if exists "email_log admin" on email_log;
create policy "email_log admin" on email_log
  for all using (is_admin()) with check (is_admin());

drop policy if exists "email_templates admin" on email_templates;
create policy "email_templates admin" on email_templates
  for all using (is_admin()) with check (is_admin());

-- ─── Storage bucket for application photos ──────────────────
-- Private bucket. Admin reads via signed URLs generated server-side.
insert into storage.buckets (id, name, public)
values ('applications-photos', 'applications-photos', false)
on conflict (id) do nothing;

-- Public can upload only into the incoming/ prefix.
drop policy if exists "photos public upload incoming" on storage.objects;
create policy "photos public upload incoming" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'applications-photos'
    and (storage.foldername(name))[1] = 'incoming'
  );

-- Admin can do anything in the bucket.
drop policy if exists "photos admin all" on storage.objects;
create policy "photos admin all" on storage.objects
  for all to authenticated
  using (bucket_id = 'applications-photos' and is_admin())
  with check (bucket_id = 'applications-photos' and is_admin());

-- ─── Seed the first event ───────────────────────────────────
insert into events (
  slug, roman, name, tagline, starts_at,
  ticket_url, capacity_souls, status, poster_url
) values (
  'vi-the-lovers', 'VI', 'The Lovers',
  'A Wilde Night where the Sky''s the limit',
  '2026-06-19 20:30:00-07'::timestamptz,
  'https://divinity.ticketspice.com/vi-the-lovers',
  60, 'upcoming',
  '/assets/lovers-poster.jpeg'
)
on conflict (slug) do nothing;
