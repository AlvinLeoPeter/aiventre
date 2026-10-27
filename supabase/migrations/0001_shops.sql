-- Aiventre: shops and their data, one shop per account for now (staff can be added later).
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- Safe to run once on a fresh project.
--
-- Shape: the phone keeps working offline and syncs. Each machine, job and buyer is one row
-- holding the app's own JSON for it; updated_at (set by the database) is what the phone uses
-- to fetch only what changed. Rows are never hard-deleted by the app: deleted = true, so a
-- deletion reaches every device.

-- ---------------------------------------------------------------- tables

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,          -- the shop profile (name, place, work, rates…)
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create index shop_members_user on public.shop_members (user_id);

-- Machines, jobs and buyers share one shape.
create table public.machines (
  shop_id uuid not null references public.shops (id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (shop_id, id)
);

create table public.jobs (like public.machines including all);
alter table public.jobs add foreign key (shop_id) references public.shops (id) on delete cascade;

create table public.leads (like public.machines including all);
alter table public.leads add foreign key (shop_id) references public.shops (id) on delete cascade;

create index machines_changes on public.machines (shop_id, updated_at);
create index jobs_changes on public.jobs (shop_id, updated_at);
create index leads_changes on public.leads (shop_id, updated_at);

-- ---------------------------------------------------------------- the clock

-- The database stamps every change, so phones with wrong clocks can't confuse syncing.
create function public.touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch before insert or update on public.shops for each row execute function public.touch();
create trigger touch before insert or update on public.machines for each row execute function public.touch();
create trigger touch before insert or update on public.jobs for each row execute function public.touch();
create trigger touch before insert or update on public.leads for each row execute function public.touch();

-- Whoever creates a shop becomes its owner.
create function public.add_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.shop_members (shop_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end $$;

create trigger add_owner after insert on public.shops for each row execute function public.add_owner();

-- ---------------------------------------------------------------- who can see what

-- True when the signed-in person belongs to the shop. Security definer so the check itself
-- isn't blocked by shop_members' own rules.
create function public.is_member(shop uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shop_members m where m.shop_id = shop and m.user_id = (select auth.uid()));
$$;

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.machines enable row level security;
alter table public.jobs enable row level security;
alter table public.leads enable row level security;

-- created_by too: an insert reads its row back before the owner trigger has added the membership.
create policy "members read their shop" on public.shops for select to authenticated using (public.is_member(id) or created_by = (select auth.uid()));
create policy "anyone signed in can start a shop" on public.shops for insert to authenticated with check (created_by = (select auth.uid()));
create policy "members update their shop" on public.shops for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy "people see their own memberships" on public.shop_members for select to authenticated using (user_id = (select auth.uid()));

create policy "members read" on public.machines for select to authenticated using (public.is_member(shop_id));
create policy "members add" on public.machines for insert to authenticated with check (public.is_member(shop_id));
create policy "members change" on public.machines for update to authenticated using (public.is_member(shop_id)) with check (public.is_member(shop_id));

create policy "members read" on public.jobs for select to authenticated using (public.is_member(shop_id));
create policy "members add" on public.jobs for insert to authenticated with check (public.is_member(shop_id));
create policy "members change" on public.jobs for update to authenticated using (public.is_member(shop_id)) with check (public.is_member(shop_id));

create policy "members read" on public.leads for select to authenticated using (public.is_member(shop_id));
create policy "members add" on public.leads for insert to authenticated with check (public.is_member(shop_id));
create policy "members change" on public.leads for update to authenticated using (public.is_member(shop_id)) with check (public.is_member(shop_id));

-- New tables aren't exposed automatically on this project, so grant exactly what the app needs.
-- Signed-out visitors get nothing; nobody can hard-delete through the API.
revoke all on public.shops, public.shop_members, public.machines, public.jobs, public.leads from anon;
grant select, insert, update on public.shops to authenticated;
grant select on public.shop_members to authenticated;
grant select, insert, update on public.machines, public.jobs, public.leads to authenticated;
revoke execute on function public.is_member(uuid) from anon, public;
grant execute on function public.is_member(uuid) to authenticated;
