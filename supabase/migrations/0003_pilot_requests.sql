-- Aiventre: "Join the pilot" requests from the website.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- Run once, after 0001 and 0002.
--
-- Anyone visiting the website can add a request (that's the form), but nobody can read,
-- change or delete them through the API — not even signed-in shops. You see them in the
-- dashboard: Table Editor → pilot_requests. Tick `contacted` there once you've called them.

create table public.pilot_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  shop text not null default '' check (char_length(shop) <= 160),
  phone text not null check (char_length(btrim(phone)) between 5 and 40),
  city text not null default '' check (char_length(city) <= 120),
  message text not null default '' check (char_length(message) <= 2000),
  contacted boolean not null default false
);

create index pilot_requests_new on public.pilot_requests (created_at desc);

alter table public.pilot_requests enable row level security;

-- Sending is open to everyone; there are no select, update or delete policies, so reading is not.
create policy "anyone can send a pilot request"
  on public.pilot_requests for insert
  to anon, authenticated
  with check (contacted = false);

revoke all on public.pilot_requests from anon, authenticated;
grant insert on public.pilot_requests to anon, authenticated;
