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
  join_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

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
  select join_code into v_code from clubs where id = v_club;
  return json_build_object('role', p_role, 'club_id', v_club, 'join_code', v_code);
end $$;

alter table public.clubs enable row level security;
alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.notices enable row level security;
alter table public.settings enable row level security;

drop policy if exists clubs_read on public.clubs;
create policy clubs_read on public.clubs for select to authenticated using (true);
drop policy if exists clubs_write on public.clubs;
create policy clubs_write on public.clubs for update to authenticated using (id = my_club() or my_role() = 'usg');

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid());

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
