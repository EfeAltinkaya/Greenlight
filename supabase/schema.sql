-- Greenlight database. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Security model (row-level security):
--   * a club officer reads and writes only their own club's records;
--   * a USG reviewer reads every application that has been submitted (never drafts) and can decide on it;
--   * a sponsor reads all offers, writes their own, and sees only deals addressed to their organization;
--   * roles are set by a server-side function; nobody can make themselves a USG reviewer without the invite code.

create table if not exists public.clubs (
  id text primary key,
  name text not null,
  school text not null default 'Other',
  startup_eligible boolean not null default false,
  received_this_year numeric not null default 0,
  events_this_semester int not null default 0,
  audience text[] not null default '{}',
  mission text not null default '',
  join_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

alter table public.clubs add column if not exists mission text not null default '';

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  role text not null check (role in ('club', 'usg', 'sponsor')),
  club_id text references public.clubs (id),
  org text,
  created_at timestamptz not null default now()
);

-- Every app object (applications, outreach, offers, deals, custom sponsors) as JSON, with the columns
-- the security rules need pulled out.
create table if not exists public.records (
  kind text not null check (kind in ('app', 'outreach', 'offer', 'deal', 'sponsor')),
  id text not null,
  club_id text references public.clubs (id),
  owner uuid default auth.uid(),
  status text,
  sponsor text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);

create table if not exists public.notices (
  id text primary key,
  to_role text not null check (to_role in ('club', 'usg', 'sponsor')),
  club_id text,
  sponsor text,
  title text not null,
  body text not null,
  href text not null,
  read boolean not null default false,
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (key text primary key, value text not null);
insert into public.settings (key, value) values ('usg_invite_code', 'TROJAN-USG-2026') on conflict (key) do nothing;

-- Helpers used by the policies (security definer so they can read profiles).
create or replace function public.my_role() returns text language sql stable security definer set search_path = public as $$ select role from profiles where id = auth.uid() $$;
create or replace function public.my_club() returns text language sql stable security definer set search_path = public as $$ select club_id from profiles where id = auth.uid() $$;
create or replace function public.my_org() returns text language sql stable security definer set search_path = public as $$ select org from profiles where id = auth.uid() $$;

-- One person can hold several roles (for example a club officer who also reviews for USG, or the demo owner).
-- roles lists what they may use; role is the one active now, and every permission above follows it.
alter table public.profiles add column if not exists roles text[] not null default '{}';
update public.profiles set roles = array[role] where roles = '{}';

create or replace function public.switch_role(p_role text) returns text language plpgsql security definer set search_path = public as $$
begin
  update profiles set role = p_role where id = auth.uid() and p_role = any(roles);
  if not found then raise exception 'This account does not have the % role', p_role; end if;
  return p_role;
end $$;
revoke all on function public.switch_role(text) from public;
grant execute on function public.switch_role(text) to authenticated;

-- Sign-up finishes here: creates or joins a club, or registers a sponsor or reviewer.
create or replace function public.complete_signup(p_role text, p_name text, p_club_name text, p_school text, p_join_code text, p_org text, p_invite text)
returns json language plpgsql security definer set search_path = public as $$
declare v_club text; v_code text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_role = 'usg' and coalesce(p_invite, '') <> (select value from settings where key = 'usg_invite_code') then
    raise exception 'That USG invite code is not right';
  end if;
  if p_role = 'club' then
    if coalesce(p_join_code, '') <> '' then
      select id into v_club from clubs where join_code = upper(p_join_code);
      if v_club is null then raise exception 'No club has that join code'; end if;
    else
      v_club := lower(regexp_replace(p_club_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 4);
      insert into clubs (id, name, school) values (v_club, p_club_name, coalesce(nullif(p_school, ''), 'Other'));
    end if;
  end if;
  insert into profiles (id, email, name, role, club_id, org)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), p_name, p_role, v_club, case when p_role = 'sponsor' then p_org else null end)
  on conflict (id) do update set name = excluded.name, role = excluded.role, club_id = excluded.club_id, org = excluded.org;
  update profiles set roles = array(select distinct unnest(roles || array[p_role])) where id = auth.uid();
  select join_code into v_code from clubs where id = v_club;
  return json_build_object('role', p_role, 'club_id', v_club, 'join_code', v_code);
end $$;

alter table public.clubs enable row level security;
alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.notices enable row level security;
alter table public.settings enable row level security;

alter table public.clubs add column if not exists sample boolean not null default false;

-- Club ids that have at least one officer profile (used by the client to hide empty test clubs).
create or replace view public.club_officer_ids
  with (security_invoker = false)
  as select distinct club_id from public.profiles where club_id is not null and role = 'club';
grant select on public.club_officer_ids to authenticated;

drop policy if exists clubs_read on public.clubs;
-- Club officers see only their club; USG sees all; sponsors see clubs they have deals with or samples.
create policy clubs_read on public.clubs for select to authenticated using (
  id = my_club()
  or my_role() = 'usg'
  or sample = true
  or (my_role() = 'sponsor' and exists (
    select 1 from public.records r where r.kind = 'deal' and r.club_id = clubs.id and r.sponsor = my_org()
  ))
);
drop policy if exists clubs_write on public.clubs;
create policy clubs_write on public.clubs for update to authenticated using (id = my_club() or my_role() = 'usg');

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or my_role() = 'usg');

drop policy if exists records_read on public.records;
create policy records_read on public.records for select to authenticated using (
  kind = 'offer'
  or (club_id is not null and club_id = my_club())
  or (my_role() = 'usg' and kind = 'app' and status is distinct from 'draft')
  or (my_role() = 'sponsor' and kind = 'deal' and sponsor = my_org())
);
drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated with check (
  (club_id is not null and club_id = my_club())
  or (kind = 'offer' and my_role() = 'sponsor')
);
drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated using (
  (club_id is not null and club_id = my_club())
  or (my_role() = 'usg' and kind = 'app' and status is distinct from 'draft')
  or (my_role() = 'sponsor' and kind = 'deal' and sponsor = my_org())
  or (kind = 'offer' and owner = auth.uid())
);
drop policy if exists records_delete on public.records;
create policy records_delete on public.records for delete to authenticated using ((club_id is not null and club_id = my_club()) or (kind = 'offer' and owner = auth.uid()));

drop policy if exists notices_read on public.notices;
create policy notices_read on public.notices for select to authenticated using (
  (to_role = 'club' and my_role() = 'club' and club_id = my_club())
  or (to_role = 'usg' and my_role() = 'usg')
  or (to_role = 'sponsor' and my_role() = 'sponsor' and sponsor = my_org())
);
drop policy if exists notices_insert on public.notices;
create policy notices_insert on public.notices for insert to authenticated with check (true);
drop policy if exists notices_update on public.notices;
create policy notices_update on public.notices for update to authenticated using (
  (to_role = 'club' and club_id = my_club()) or (to_role = 'usg' and my_role() = 'usg') or (to_role = 'sponsor' and sponsor = my_org())
);

-- Live updates: club and USG screens refresh the moment the other side acts.
do $$ begin
  begin alter publication supabase_realtime add table public.records; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notices; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.clubs; exception when duplicate_object then null; end;
end $$;

-- Files (quotes, permits, vendor invoices). Paths:
--   apps/<club_id>/<app_id>/<file>   club reads and writes; USG reads
--   deals/<deal_id>/<file>           the club and the sponsor on that deal read; the club writes
insert into storage.buckets (id, name, public) values ('files', 'files', false) on conflict (id) do nothing;
drop policy if exists files_read on storage.objects;
create policy files_read on storage.objects for select to authenticated using (
  bucket_id = 'files' and (
    ((storage.foldername(name))[1] = 'apps' and ((storage.foldername(name))[2] = public.my_club() or public.my_role() = 'usg'))
    or ((storage.foldername(name))[1] = 'deals' and exists (
      select 1 from public.records r where r.kind = 'deal' and r.id = (storage.foldername(name))[2]
      and (r.club_id = public.my_club() or r.sponsor = public.my_org())))
  )
);
drop policy if exists files_write on storage.objects;
create policy files_write on storage.objects for insert to authenticated with check (
  bucket_id = 'files' and (
    ((storage.foldername(name))[1] = 'apps' and (storage.foldername(name))[2] = public.my_club())
    or ((storage.foldername(name))[1] = 'deals' and exists (
      select 1 from public.records r where r.kind = 'deal' and r.id = (storage.foldername(name))[2] and r.club_id = public.my_club()))
  )
);

-- Gmail connections. Only the server (service key) reads this table; no policy gives the browser access.
create table if not exists public.gmail_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  email text,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.gmail_tokens enable row level security;

-- Append-only ledger events (hash-linked). History arrays in the client are views over this.
create table if not exists public.ledger_lines (
  id text primary key,
  club_id text not null references public.clubs (id),
  event_id text not null,
  event_title text not null,
  item text not null,
  vendor text not null default '',
  amount numeric not null default 0,
  category text not null default '',
  source text not null,
  source_ref text,
  status text not null,
  evidence text,
  sample boolean not null default false,
  example boolean not null default false,
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'
);
alter table public.ledger_lines enable row level security;
drop policy if exists ledger_lines_read on public.ledger_lines;
create policy ledger_lines_read on public.ledger_lines for select to authenticated using (
  club_id = my_club() or my_role() = 'usg'
);
drop policy if exists ledger_lines_write on public.ledger_lines;
create policy ledger_lines_write on public.ledger_lines for all to authenticated using (club_id = my_club()) with check (club_id = my_club());

create table if not exists public.ledger_events (
  id text primary key,
  at timestamptz not null default now(),
  club_id text not null references public.clubs (id),
  line_id text not null,
  kind text not null,
  detail text not null default '',
  prev_hash text,
  hash text not null
);
create unique index if not exists ledger_events_hash on public.ledger_events (hash);
alter table public.ledger_events enable row level security;
drop policy if exists ledger_events_read on public.ledger_events;
create policy ledger_events_read on public.ledger_events for select to authenticated using (
  club_id = my_club() or my_role() = 'usg'
);
drop policy if exists ledger_events_insert on public.ledger_events;
create policy ledger_events_insert on public.ledger_events for insert to authenticated with check (club_id = my_club() or my_role() = 'usg');

do $$ begin
  begin alter publication supabase_realtime add table public.ledger_lines; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.ledger_events; exception when duplicate_object then null; end;
end $$;

-- Campus-wide sponsor claims: one live ask per company (21-day hold).
create table if not exists public.campus_claims (
  id text primary key,
  company_id text not null,
  company_name text not null,
  club_id text not null references public.clubs (id),
  club_name text not null,
  event_date date,
  event_title text,
  held_until date not null,
  status text not null check (status in ('held', 'released', 'replied')) default 'held',
  created_at timestamptz not null default now()
);
-- At most one held claim per company across campus.
create unique index if not exists campus_claims_one_live
  on public.campus_claims (company_id) where (status = 'held');
alter table public.campus_claims enable row level security;
drop policy if exists campus_claims_read on public.campus_claims;
create policy campus_claims_read on public.campus_claims for select to authenticated using (true);
drop policy if exists campus_claims_write on public.campus_claims;
create policy campus_claims_write on public.campus_claims for all to authenticated
  using (club_id = my_club() or my_role() = 'usg')
  with check (club_id = my_club() or my_role() = 'usg');

-- Greenlight Models: officer corrections and confirmed labels for retraining.
create table if not exists public.training_examples (
  id text primary key,
  task text not null check (task in ('items', 'board', 'replies', 'vendor')),
  text text not null,
  label text not null,
  source text not null check (source in ('officer_correction', 'reviewer_decision', 'reply_confirmed')),
  club_id_hash text,
  created_at timestamptz not null default now()
);
alter table public.training_examples enable row level security;
drop policy if exists training_examples_insert on public.training_examples;
create policy training_examples_insert on public.training_examples for insert to authenticated
  with check (true);
drop policy if exists training_examples_read on public.training_examples;
create policy training_examples_read on public.training_examples for select to authenticated
  using (my_role() = 'usg');
