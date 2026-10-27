-- Aiventre: invoices and suppliers, synced like machines, jobs and buyers.
--
-- How to apply: Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- Run it once, after 0001_shops.sql.
--
-- Invoices are tax records (keep them for at least 8 years), so like everything else they are
-- never hard-deleted through the API; the app cancels an invoice instead.

create table public.invoices (like public.machines including all);
alter table public.invoices add foreign key (shop_id) references public.shops (id) on delete cascade;

create table public.suppliers (like public.machines including all);
alter table public.suppliers add foreign key (shop_id) references public.shops (id) on delete cascade;

-- (the (shop_id, updated_at) index comes along with "including all")

create trigger touch before insert or update on public.invoices for each row execute function public.touch();
create trigger touch before insert or update on public.suppliers for each row execute function public.touch();

alter table public.invoices enable row level security;
alter table public.suppliers enable row level security;

create policy "members read" on public.invoices for select to authenticated using (public.is_member(shop_id));
create policy "members add" on public.invoices for insert to authenticated with check (public.is_member(shop_id));
create policy "members change" on public.invoices for update to authenticated using (public.is_member(shop_id)) with check (public.is_member(shop_id));

create policy "members read" on public.suppliers for select to authenticated using (public.is_member(shop_id));
create policy "members add" on public.suppliers for insert to authenticated with check (public.is_member(shop_id));
create policy "members change" on public.suppliers for update to authenticated using (public.is_member(shop_id)) with check (public.is_member(shop_id));

revoke all on public.invoices, public.suppliers from anon;
grant select, insert, update on public.invoices, public.suppliers to authenticated;
