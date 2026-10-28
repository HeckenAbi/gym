begin;

-- This migration targets the legacy tables currently used by the app.
-- Fail before changing anything if the checked-out app schema is not present.
do $$
begin
  if to_regclass('public.workouts') is null
     or to_regclass('public.workout_exercises') is null
     or to_regclass('public.workout_sets') is null
     or to_regclass('public.exercises') is null then
    raise exception 'Gym Battle core workout tables are missing; inspect the target schema before applying this migration.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workouts' and column_name='user_id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workouts' and column_name='name')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workouts' and column_name='started_at')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workouts' and column_name='finished_at')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workout_exercises' and column_name='workout_id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workout_exercises' and column_name='exercise_name')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workout_exercises' and column_name='position')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workout_sets' and column_name='workout_exercise_id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workout_sets' and column_name='set_number')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workout_sets' and column_name='weight')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='workout_sets' and column_name='reps')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='exercises' and column_name='user_id') then
    raise exception 'Gym Battle core workout columns differ from the repository; inspect the target schema before applying this migration.';
  end if;
end;
$$;

alter table public.workouts add column if not exists client_session_id uuid;
create unique index if not exists workouts_user_client_session_uidx
  on public.workouts (user_id, client_session_id)
  where client_session_id is not null;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 2 and 40)
);

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
  if v_display_name is null or char_length(v_display_name) < 2 then
    v_display_name := 'Athlet ' || upper(substr(replace(new.id::text, '-', ''), 1, 4));
  end if;
  insert into public.profiles (user_id, display_name)
  values (new.id, left(v_display_name, 40))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

insert into public.profiles (user_id, display_name)
select u.id,
       left(case
         when char_length(btrim(coalesce(u.raw_user_meta_data ->> 'display_name', ''))) between 2 and 40
           then btrim(u.raw_user_meta_data ->> 'display_name')
         else 'Athlet ' || upper(substr(replace(u.id::text, '-', ''), 1, 4))
       end, 40)
from auth.users u
on conflict (user_id) do nothing;

drop trigger if exists gym_battle_create_profile on auth.users;
create trigger gym_battle_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

create table if not exists public.gym_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  timezone text not null default 'Europe/Berlin',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint gym_groups_name_length check (char_length(btrim(name)) between 2 and 80),
  constraint gym_groups_description_length check (description is null or char_length(description) <= 280)
);

create table if not exists public.group_members (
  group_id uuid not null references public.gym_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create unique index if not exists group_members_one_active_owner_uidx
  on public.group_members(group_id) where role = 'owner' and status = 'active';
create index if not exists group_members_user_status_idx on public.group_members(user_id, status);
create index if not exists group_members_group_status_idx on public.group_members(group_id, status);

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.gym_groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses = 1),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint group_invites_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint group_invites_expiry check (expires_at > created_at)
);
create index if not exists group_invites_group_idx on public.group_invites(group_id, created_at desc);

create table if not exists public.group_workout_shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.gym_groups(id) on delete cascade,
  workout_id uuid not null unique references public.workouts(id) on delete cascade,
  shared_by uuid not null references auth.users(id) on delete restrict,
  shared_at timestamptz not null default now(),
  unique (group_id, id)
);
create index if not exists group_workout_shares_group_time_idx
  on public.group_workout_shares(group_id, shared_at desc);

create table if not exists public.group_comments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  share_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (group_id, share_id)
    references public.group_workout_shares(group_id, id) on delete cascade,
  constraint group_comments_body_length check (char_length(btrim(body)) between 1 and 500)
);
create index if not exists group_comments_share_time_idx on public.group_comments(share_id, created_at);

create table if not exists public.group_post_reactions (
  group_id uuid not null,
  share_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('strong', 'clap', 'fire')),
  created_at timestamptz not null default now(),
  primary key (share_id, user_id),
  foreign key (group_id, share_id)
    references public.group_workout_shares(group_id, id) on delete cascade
);

create table if not exists public.workout_autosaves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  client_session_id uuid not null unique,
  revision integer not null default 1 check (revision > 0),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.group_members gm
    join public.gym_groups g on g.id = gm.group_id and g.archived_at is null
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.group_members gm
    join public.gym_groups g on g.id = gm.group_id and g.archived_at is null
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
      and gm.role in ('owner', 'admin')
  );
$$;

-- Replace legacy policies on the workout tables with an explicit owner-only baseline.
-- The app still accesses these tables directly, so private rows must remain private.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('workouts', 'workout_exercises', 'workout_sets', 'exercises')
  loop
    execute format('drop policy %I on %I.%I', v_policy.policyname, v_policy.schemaname, v_policy.tablename);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.gym_groups enable row level security;
alter table public.gym_groups force row level security;
alter table public.group_members enable row level security;
alter table public.group_members force row level security;
alter table public.group_invites enable row level security;
alter table public.group_invites force row level security;
alter table public.group_workout_shares enable row level security;
alter table public.group_workout_shares force row level security;
alter table public.group_comments enable row level security;
alter table public.group_comments force row level security;
alter table public.group_post_reactions enable row level security;
alter table public.group_post_reactions force row level security;
alter table public.workout_autosaves enable row level security;
alter table public.workout_autosaves force row level security;
alter table public.workouts enable row level security;
alter table public.workouts force row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_exercises force row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_sets force row level security;
alter table public.exercises enable row level security;
alter table public.exercises force row level security;

create policy profiles_read_self on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy gym_groups_read_members on public.gym_groups
  for select to authenticated using (public.is_group_member(id));
create policy gym_groups_update_admins on public.gym_groups
  for update to authenticated using (public.is_group_admin(id)) with check (public.is_group_admin(id));
create policy group_members_read_members on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy group_shares_read_members on public.group_workout_shares
  for select to authenticated using (public.is_group_member(group_id));
create policy group_comments_read_members on public.group_comments
  for select to authenticated using (public.is_group_member(group_id));
create policy group_comments_insert_members on public.group_comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
    and exists (select 1 from public.group_workout_shares s where s.id = group_comments.share_id and s.group_id = group_comments.group_id)
  );
create policy group_comments_update_own on public.group_comments
  for update to authenticated using (user_id = auth.uid() and public.is_group_member(group_id))
  with check (user_id = auth.uid() and public.is_group_member(group_id));
create policy group_comments_delete_own_or_admin on public.group_comments
  for delete to authenticated using (user_id = auth.uid() or public.is_group_admin(group_id));
create policy group_reactions_read_members on public.group_post_reactions
  for select to authenticated using (public.is_group_member(group_id));
create policy group_reactions_insert_members on public.group_post_reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
    and exists (select 1 from public.group_workout_shares s where s.id = group_post_reactions.share_id and s.group_id = group_post_reactions.group_id)
  );
create policy group_reactions_update_own on public.group_post_reactions
  for update to authenticated using (user_id = auth.uid() and public.is_group_member(group_id))
  with check (user_id = auth.uid() and public.is_group_member(group_id));
create policy group_reactions_delete_own on public.group_post_reactions
  for delete to authenticated using (user_id = auth.uid());

create policy workouts_select_own on public.workouts
  for select to authenticated using (user_id = auth.uid());
create policy workouts_insert_own on public.workouts
  for insert to authenticated with check (user_id = auth.uid());
create policy workouts_update_own on public.workouts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workouts_delete_own on public.workouts
  for delete to authenticated using (user_id = auth.uid());
create policy workout_exercises_select_own on public.workout_exercises
  for select to authenticated using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
create policy workout_exercises_insert_own on public.workout_exercises
  for insert to authenticated with check (
    exists (select 1 from public.workouts w where w.id = workout_exercises.workout_id and w.user_id = auth.uid())
    and (workout_exercises.exercise_id is null or exists (
      select 1 from public.exercises e where e.id = workout_exercises.exercise_id and e.user_id = auth.uid()
    ))
  );
create policy workout_exercises_update_own on public.workout_exercises
  for update to authenticated using (
    exists (select 1 from public.workouts w where w.id = workout_exercises.workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workouts w where w.id = workout_exercises.workout_id and w.user_id = auth.uid())
    and (workout_exercises.exercise_id is null or exists (
      select 1 from public.exercises e where e.id = workout_exercises.exercise_id and e.user_id = auth.uid()
    ))
  );
create policy workout_exercises_delete_own on public.workout_exercises
  for delete to authenticated using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
create policy workout_sets_select_own on public.workout_sets
  for select to authenticated using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );
create policy workout_sets_insert_own on public.workout_sets
  for insert to authenticated with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );
create policy workout_sets_update_own on public.workout_sets
  for update to authenticated using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );
create policy workout_sets_delete_own on public.workout_sets
  for delete to authenticated using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );
create policy exercises_select_own on public.exercises
  for select to authenticated using (user_id = auth.uid());
create policy exercises_insert_own on public.exercises
  for insert to authenticated with check (user_id = auth.uid());
create policy exercises_update_own on public.exercises
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exercises_delete_own on public.exercises
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.profiles, public.gym_groups, public.group_members, public.group_invites,
  public.group_workout_shares, public.group_comments, public.group_post_reactions,
  public.workout_autosaves from public, anon, authenticated;
revoke all on public.workouts, public.workout_exercises, public.workout_sets, public.exercises from public, anon;
grant select, insert, update, delete on public.workouts, public.workout_exercises, public.workout_sets, public.exercises to authenticated;

create or replace function public.get_my_profile()
returns table (display_name text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.display_name from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.set_my_display_name(p_display_name text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_name text := btrim(coalesce(p_display_name, ''));
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'display_name_must_be_2_to_40_characters' using errcode = '22023';
  end if;
  insert into public.profiles(user_id, display_name, updated_at)
  values (auth.uid(), v_name, now())
  on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now();
  return v_name;
end;
$$;

create or replace function public.create_private_group(
  p_name text,
  p_description text default null,
  p_timezone text default 'Europe/Berlin'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_group_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_timezone text := coalesce(nullif(btrim(p_timezone), ''), 'Europe/Berlin');
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'group_name_must_be_2_to_80_characters' using errcode = '22023';
  end if;
  if v_description is not null and char_length(v_description) > 280 then
    raise exception 'group_description_too_long' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names t where t.name = v_timezone) then
    raise exception 'invalid_group_timezone' using errcode = '22023';
  end if;
  insert into public.gym_groups(name, description, timezone, created_by)
  values (v_name, v_description, v_timezone, auth.uid()) returning id into v_group_id;
  insert into public.group_members(group_id, user_id, role, status)
  values (v_group_id, auth.uid(), 'owner', 'active');
  return v_group_id;
end;
$$;

create or replace function public.get_my_groups()
returns table (
  id uuid,
  name text,
  description text,
  timezone text,
  member_count integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return query
  select g.id, g.name, g.description, g.timezone,
         (select count(*)::integer from public.group_members gm2 where gm2.group_id = g.id and gm2.status = 'active'),
         g.created_at
  from public.gym_groups g
  join public.group_members gm on gm.group_id = g.id
  where gm.user_id = auth.uid() and gm.status = 'active' and g.archived_at is null
  order by g.created_at desc;
end;
$$;

create or replace function public.get_group_overview(p_group_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  timezone text,
  created_at timestamptz,
  member_count integer,
  my_role text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_group_member(p_group_id) then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  return query
  select g.id, g.name, g.description, g.timezone, g.created_at,
         (select count(*)::integer from public.group_members gm2 where gm2.group_id = g.id and gm2.status = 'active'),
         gm.role
  from public.gym_groups g
  join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid() and gm.status = 'active'
  where g.id = p_group_id and g.archived_at is null;
end;
$$;

create or replace function public.get_group_members(p_group_id uuid)
returns table (user_id uuid, display_name text, role text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_group_member(p_group_id) then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  return query
  select gm.user_id, coalesce(p.display_name, 'Athlet'), gm.role, gm.joined_at
  from public.group_members gm
  left join public.profiles p on p.user_id = gm.user_id
  where gm.group_id = p_group_id and gm.status = 'active'
  order by case gm.role when 'owner' then 0 when 'admin' then 1 else 2 end, lower(coalesce(p.display_name, 'Athlet'));
end;
$$;

create or replace function public.create_group_invite(p_group_id uuid, p_token_hash text)
returns table (invite_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_expires timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_group_admin(p_group_id) then raise exception 'group_admin_required' using errcode = '42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_invite_token' using errcode = '22023'; end if;
  if not exists (select 1 from public.gym_groups g where g.id = p_group_id and g.archived_at is null) then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  insert into public.group_invites(group_id, created_by, token_hash, expires_at)
  values (p_group_id, auth.uid(), lower(p_token_hash), v_expires)
  returning id into v_id;
  return query select v_id, v_expires;
end;
$$;

create or replace function public.get_group_invite_preview(p_token_hash text)
returns table (group_id uuid, group_name text, inviter_name text, member_count integer, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return; end if;
  return query
  select g.id, g.name, coalesce(p.display_name, 'Ein Gruppenmitglied'),
         (select count(*)::integer from public.group_members gm2 where gm2.group_id = g.id and gm2.status = 'active'),
         i.expires_at
  from public.group_invites i
  join public.gym_groups g on g.id = i.group_id
  left join public.profiles p on p.user_id = i.created_by
  where i.token_hash = lower(p_token_hash)
    and i.revoked_at is null and i.expires_at > now() and i.use_count < i.max_uses
    and g.archived_at is null;
end;
$$;

create or replace function public.accept_group_invite(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_invite public.group_invites%rowtype;
  v_member_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invite_invalid_or_expired' using errcode = '22023'; end if;
  select * into v_invite from public.group_invites
  where token_hash = lower(p_token_hash) for update;
  if not found or v_invite.revoked_at is not null or v_invite.expires_at <= now()
     or v_invite.use_count >= v_invite.max_uses then
    raise exception 'invite_invalid_or_expired' using errcode = '22023';
  end if;
  if not exists (select 1 from public.gym_groups g where g.id = v_invite.group_id and g.archived_at is null) then
    raise exception 'invite_invalid_or_expired' using errcode = '22023';
  end if;
  select gm.status into v_member_status from public.group_members gm
  where gm.group_id = v_invite.group_id and gm.user_id = auth.uid() for update;
  if v_member_status = 'active' then return v_invite.group_id; end if;
  if v_member_status = 'removed' then raise exception 'membership_removed_contact_group_admin' using errcode = '42501'; end if;
  if v_member_status = 'left' then
    update public.group_members set status = 'active', role = 'member', joined_at = now()
    where group_id = v_invite.group_id and user_id = auth.uid();
  else
    insert into public.group_members(group_id, user_id, role, status)
    values (v_invite.group_id, auth.uid(), 'member', 'active');
  end if;
  update public.group_invites set use_count = use_count + 1 where id = v_invite.id;
  return v_invite.group_id;
end;
$$;

create or replace function public.revoke_group_invite(p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_group_id uuid;
begin
  select i.group_id into v_group_id from public.group_invites i where i.id = p_invite_id;
  if v_group_id is null or not public.is_group_admin(v_group_id) then raise exception 'invite_not_found_or_not_available' using errcode = '42501'; end if;
  update public.group_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite_id;
  return true;
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select gm.role into v_role from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.status = 'active' for update;
  if v_role is null then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  if v_role = 'owner' then raise exception 'owner_must_transfer_ownership_before_leaving' using errcode = '22023'; end if;
  update public.group_members set status = 'left' where group_id = p_group_id and user_id = auth.uid();
  return true;
end;
$$;

create or replace function public.transfer_group_ownership(p_group_id uuid, p_new_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_new_owner_id is null or p_new_owner_id = v_owner_id then raise exception 'invalid_new_owner' using errcode = '22023'; end if;
  perform 1 from public.gym_groups g where g.id = p_group_id and g.archived_at is null for update;
  if not found then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  perform 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = v_owner_id and gm.role = 'owner' and gm.status = 'active'
    for update;
  if not found then raise exception 'group_owner_required' using errcode = '42501'; end if;
  perform 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_new_owner_id and gm.status = 'active'
    for update;
  if not found then raise exception 'new_owner_must_be_active_member' using errcode = '22023'; end if;
  update public.group_members set role = 'admin'
    where group_id = p_group_id and user_id = v_owner_id and status = 'active';
  update public.group_members set role = 'owner'
    where group_id = p_group_id and user_id = p_new_owner_id and status = 'active';
  return true;
end;
$$;

create or replace function public.archive_group(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  perform 1 from public.gym_groups g where g.id = p_group_id and g.archived_at is null for update;
  if not found then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = v_owner_id and gm.role = 'owner' and gm.status = 'active'
  ) then raise exception 'group_owner_required' using errcode = '42501'; end if;
  update public.gym_groups set archived_at = now() where id = p_group_id;
  update public.group_invites set revoked_at = coalesce(revoked_at, now()) where group_id = p_group_id;
  return true;
end;
$$;

create or replace function public.get_group_invites(p_group_id uuid)
returns table (invite_id uuid, created_at timestamptz, expires_at timestamptz, revoked_at timestamptz, use_count integer)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_group_admin(p_group_id) then raise exception 'group_admin_required' using errcode = '42501'; end if;
  return query
  select i.id, i.created_at, i.expires_at, i.revoked_at, i.use_count
  from public.group_invites i
  where i.group_id = p_group_id
  order by i.created_at desc
  limit 20;
end;
$$;

create or replace function public.share_finished_workout(p_workout_id uuid, p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_share_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.workouts w
    where w.id = p_workout_id and w.user_id = auth.uid() and w.finished_at is not null
  ) then raise exception 'completed_workout_not_found' using errcode = '42501'; end if;
  insert into public.group_workout_shares(group_id, workout_id, shared_by)
  values (p_group_id, p_workout_id, auth.uid()) returning id into v_share_id;
  return v_share_id;
exception when unique_violation then
  raise exception 'workout_already_shared' using errcode = '23505';
end;
$$;

create or replace function public.unshare_finished_workout(p_share_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid;
begin
  select s.shared_by into v_owner from public.group_workout_shares s where s.id = p_share_id for update;
  if v_owner is null or v_owner <> auth.uid() then raise exception 'share_not_found_or_not_available' using errcode = '42501'; end if;
  delete from public.group_workout_shares where id = p_share_id;
  return true;
end;
$$;

create or replace function public.get_group_feed(p_group_id uuid, p_limit integer default 20)
returns table (
  share_id uuid,
  workout_id uuid,
  shared_by uuid,
  display_name text,
  workout_name text,
  finished_at timestamptz,
  shared_at timestamptz,
  exercise_count integer,
  set_count integer,
  total_volume numeric,
  details jsonb,
  reaction_counts jsonb,
  my_reaction text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_group_member(p_group_id) then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  return query
  select s.id, s.workout_id, s.shared_by, coalesce(p.display_name, 'Athlet'), w.name,
         w.finished_at, s.shared_at,
         coalesce(summary.exercise_count, 0)::integer,
         coalesce(summary.set_count, 0)::integer,
         coalesce(summary.total_volume, 0)::numeric,
         coalesce(summary.details, '[]'::jsonb),
         coalesce(reaction_summary.counts, '{}'::jsonb), my_reaction.reaction
  from public.group_workout_shares s
  join public.workouts w on w.id = s.workout_id and w.finished_at is not null
  left join public.profiles p on p.user_id = s.shared_by
  left join lateral (
    select count(we.id)::integer as exercise_count,
           coalesce(sum(set_summary.set_count), 0)::integer as set_count,
           coalesce(sum(set_summary.volume), 0)::numeric as total_volume,
           coalesce(jsonb_agg(jsonb_build_object('name', we.exercise_name, 'sets', set_summary.entries) order by we.position)
                    filter (where we.id is not null), '[]'::jsonb) as details
    from public.workout_exercises we
    left join lateral (
      select count(*)::integer as set_count,
             coalesce(sum(coalesce(ws.weight, 0) * coalesce(ws.reps, 0)), 0)::numeric as volume,
             coalesce(jsonb_agg(jsonb_build_object('weight', ws.weight, 'reps', ws.reps) order by ws.set_number), '[]'::jsonb) as entries
      from public.workout_sets ws where ws.workout_exercise_id = we.id
    ) set_summary on true
    where we.workout_id = w.id
  ) summary on true
  left join lateral (
    select coalesce(jsonb_object_agg(counts.reaction, counts.amount), '{}'::jsonb) as counts
    from (
      select r.reaction, count(*)::integer as amount
      from public.group_post_reactions r
      where r.share_id = s.id and r.group_id = p_group_id
      group by r.reaction
    ) counts
  ) reaction_summary on true
  left join lateral (
    select r.reaction from public.group_post_reactions r
    where r.share_id = s.id and r.group_id = p_group_id and r.user_id = auth.uid()
    limit 1
  ) my_reaction on true
  where s.group_id = p_group_id
  order by s.shared_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;

create or replace function public.get_group_comments(p_group_id uuid, p_share_id uuid)
returns table (comment_id uuid, user_id uuid, display_name text, body text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_group_member(p_group_id)
     or not exists (select 1 from public.group_workout_shares s where s.id = p_share_id and s.group_id = p_group_id) then
    raise exception 'share_not_found_or_not_available' using errcode = '42501';
  end if;
  return query
  select c.id, c.user_id, coalesce(p.display_name, 'Athlet'), c.body, c.created_at
  from public.group_comments c
  left join public.profiles p on p.user_id = c.user_id
  where c.group_id = p_group_id and c.share_id = p_share_id
  order by c.created_at asc
  limit 100;
end;
$$;

create or replace function public.add_group_comment(p_group_id uuid, p_share_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 500 then raise exception 'comment_must_be_1_to_500_characters' using errcode = '22023'; end if;
  if not public.is_group_member(p_group_id)
     or not exists (select 1 from public.group_workout_shares s where s.id = p_share_id and s.group_id = p_group_id) then
    raise exception 'share_not_found_or_not_available' using errcode = '42501';
  end if;
  insert into public.group_comments(group_id, share_id, user_id, body)
  values (p_group_id, p_share_id, auth.uid(), v_body) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_group_comment(p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid;
  v_group_id uuid;
begin
  select c.user_id, c.group_id into v_owner, v_group_id from public.group_comments c where c.id = p_comment_id for update;
  if v_owner is null or (v_owner <> auth.uid() and not public.is_group_admin(v_group_id)) then
    raise exception 'comment_not_found_or_not_available' using errcode = '42501';
  end if;
  delete from public.group_comments where id = p_comment_id;
  return true;
end;
$$;

create or replace function public.toggle_group_reaction(p_group_id uuid, p_share_id uuid, p_reaction text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_reaction is not null and p_reaction not in ('strong', 'clap', 'fire') then raise exception 'invalid_reaction' using errcode = '22023'; end if;
  if not public.is_group_member(p_group_id)
     or not exists (select 1 from public.group_workout_shares s where s.id = p_share_id and s.group_id = p_group_id) then
    raise exception 'share_not_found_or_not_available' using errcode = '42501';
  end if;
  select r.reaction into v_existing from public.group_post_reactions r
  where r.share_id = p_share_id and r.user_id = auth.uid() for update;
  if p_reaction is null or p_reaction = v_existing then
    delete from public.group_post_reactions where share_id = p_share_id and user_id = auth.uid();
    return null;
  end if;
  insert into public.group_post_reactions(group_id, share_id, user_id, reaction)
  values (p_group_id, p_share_id, auth.uid(), p_reaction)
  on conflict (share_id, user_id) do update set reaction = excluded.reaction, created_at = now();
  return p_reaction;
end;
$$;

create or replace function public.get_group_leaderboard(p_group_id uuid, p_week_offset integer default 0)
returns table (rank bigint, user_id uuid, display_name text, points integer, workout_days integer, week_start date, timezone text)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_timezone text;
  v_week_start date;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_group_member(p_group_id) then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  if p_week_offset not in (0, 1) then raise exception 'week_offset_must_be_0_or_1' using errcode = '22023'; end if;
  select g.timezone into v_timezone from public.gym_groups g where g.id = p_group_id and g.archived_at is null;
  if v_timezone is null then raise exception 'group_not_found_or_not_available' using errcode = '42501'; end if;
  v_week_start := (date_trunc('week', now() at time zone v_timezone)::date - (p_week_offset * 7));
  v_start := v_week_start::timestamp at time zone v_timezone;
  v_end := (v_week_start + 7)::timestamp at time zone v_timezone;
  return query
  with workout_days as (
    select w.user_id, (w.finished_at at time zone v_timezone)::date as local_day
    from public.group_workout_shares s
    join public.workouts w on w.id = s.workout_id
    where s.group_id = p_group_id and w.finished_at is not null
      and w.finished_at >= v_start and w.finished_at < v_end
    group by w.user_id, (w.finished_at at time zone v_timezone)::date
  ),
  scores as (
    select gm.user_id, coalesce(p.display_name, 'Athlet') as display_name,
           count(wd.local_day)::integer as workout_days,
           least(count(wd.local_day), 5)::integer as points
    from public.group_members gm
    left join public.profiles p on p.user_id = gm.user_id
    left join workout_days wd on wd.user_id = gm.user_id
    where gm.group_id = p_group_id and gm.status = 'active'
    group by gm.user_id, p.display_name
  )
  select rank() over (order by scores.points desc)::bigint,
         scores.user_id, scores.display_name, scores.points, scores.workout_days,
         v_week_start, v_timezone
  from scores
  order by scores.points desc, lower(scores.display_name), scores.user_id;
end;
$$;

create or replace function public.validate_workout_payload(p_payload jsonb, p_completed boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_exercise jsonb;
  v_set jsonb;
  v_weight_text text;
  v_reps_text text;
  v_weight numeric;
  v_reps integer;
  v_exercise_count integer;
  v_set_count integer;
begin
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_workout_payload' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_payload ->> 'name', ''))) not between 1 and 100 then raise exception 'invalid_workout_name' using errcode = '22023'; end if;
  if coalesce(p_payload ->> 'startedAt', '') = '' then raise exception 'invalid_workout_start_time' using errcode = '22023'; end if;
  perform (p_payload ->> 'startedAt')::timestamptz;
  if jsonb_typeof(p_payload -> 'exercises') is distinct from 'array' then raise exception 'invalid_workout_exercises' using errcode = '22023'; end if;
  v_exercise_count := jsonb_array_length(p_payload -> 'exercises');
  if v_exercise_count > 40 or (p_completed and v_exercise_count = 0) then raise exception 'invalid_workout_exercise_count' using errcode = '22023'; end if;
  for v_exercise in select value from jsonb_array_elements(p_payload -> 'exercises') loop
    if jsonb_typeof(v_exercise) is distinct from 'object' then raise exception 'invalid_exercise' using errcode = '22023'; end if;
    if char_length(btrim(coalesce(v_exercise ->> 'name', ''))) not between 1 and 120 then raise exception 'invalid_exercise_name' using errcode = '22023'; end if;
    if jsonb_typeof(v_exercise -> 'sets') is distinct from 'array' then raise exception 'invalid_exercise_sets' using errcode = '22023'; end if;
    v_set_count := jsonb_array_length(v_exercise -> 'sets');
    if v_set_count > 40 or (p_completed and v_set_count = 0) then raise exception 'invalid_set_count' using errcode = '22023'; end if;
    for v_set in select value from jsonb_array_elements(v_exercise -> 'sets') loop
      if jsonb_typeof(v_set) is distinct from 'object' then raise exception 'invalid_set' using errcode = '22023'; end if;
      v_weight_text := nullif(btrim(v_set ->> 'weight'), '');
      v_reps_text := nullif(btrim(v_set ->> 'reps'), '');
      if p_completed and (v_weight_text is null or v_weight_text !~ '^[0-9]+([.,][0-9]+)?$') then
        raise exception 'completed_set_requires_valid_weight' using errcode = '22023';
      end if;
      if v_weight_text is not null and v_weight_text ~ '^[0-9]+([.,][0-9]+)?$' then
        v_weight := replace(v_weight_text, ',', '.')::numeric;
        if v_weight < 0 or v_weight > 10000 then raise exception 'invalid_set_weight' using errcode = '22023'; end if;
      elsif char_length(coalesce(v_weight_text, '')) > 32 then
        raise exception 'invalid_set_weight_text' using errcode = '22023';
      end if;
      if p_completed and (v_reps_text is null or v_reps_text !~ '^[0-9]+$') then
        raise exception 'completed_set_requires_valid_repetitions' using errcode = '22023';
      end if;
      if v_reps_text is not null and v_reps_text ~ '^[0-9]+$' then
        v_reps := v_reps_text::integer;
        if v_reps < 1 or v_reps > 10000 then raise exception 'invalid_set_repetitions' using errcode = '22023'; end if;
      elsif char_length(coalesce(v_reps_text, '')) > 8 then
        raise exception 'invalid_set_repetitions_text' using errcode = '22023';
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.save_workout_draft(
  p_client_session_id uuid,
  p_expected_revision integer,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_draft public.workout_autosaves%rowtype;
  v_revision integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_client_session_id is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'invalid_draft_revision' using errcode = '22023'; end if;
  perform public.validate_workout_payload(p_payload, false);
  select * into v_draft from public.workout_autosaves where user_id = auth.uid() for update;
  if found then
    if v_draft.client_session_id <> p_client_session_id or v_draft.revision <> p_expected_revision then
      raise exception 'draft_revision_conflict' using errcode = '40001';
    end if;
    update public.workout_autosaves
      set payload = p_payload, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() returning revision into v_revision;
  else
    if p_expected_revision <> 0 then raise exception 'draft_revision_conflict' using errcode = '40001'; end if;
    begin
      insert into public.workout_autosaves(user_id, client_session_id, revision, payload)
      values (auth.uid(), p_client_session_id, 1, p_payload)
        returning revision into v_revision;
    exception when unique_violation then
      raise exception 'draft_revision_conflict' using errcode = '40001';
    end;
  end if;
  return v_revision;
end;
$$;

create or replace function public.replace_my_workout_draft(
  p_expected_session_id uuid,
  p_expected_revision integer,
  p_client_session_id uuid,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_draft public.workout_autosaves%rowtype;
  v_revision integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_expected_session_id is null or p_client_session_id is null or p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'invalid_draft_revision' using errcode = '22023';
  end if;
  perform public.validate_workout_payload(p_payload, false);
  select * into v_draft from public.workout_autosaves where user_id = auth.uid() for update;
  if not found or v_draft.client_session_id <> p_expected_session_id or v_draft.revision <> p_expected_revision then
    raise exception 'draft_revision_conflict' using errcode = '40001';
  end if;
  update public.workout_autosaves
    set client_session_id = p_client_session_id, payload = p_payload, revision = revision + 1, updated_at = now()
    where user_id = auth.uid()
    returning revision into v_revision;
  return v_revision;
end;
$$;

create or replace function public.get_my_workout_draft()
returns table (client_session_id uuid, revision integer, payload jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select d.client_session_id, d.revision, d.payload, d.updated_at
  from public.workout_autosaves d where d.user_id = auth.uid();
$$;

create or replace function public.discard_my_workout_draft(p_client_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  delete from public.workout_autosaves where user_id = auth.uid() and client_session_id = p_client_session_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create or replace function public.complete_workout_session(
  p_client_session_id uuid,
  p_expected_revision integer,
  p_payload jsonb,
  p_group_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_draft public.workout_autosaves%rowtype;
  v_workout_id uuid;
  v_existing_share_group uuid;
  v_exercise jsonb;
  v_set jsonb;
  v_exercise_id uuid;
  v_workout_exercise_id uuid;
  v_position integer := 0;
  v_set_number integer;
  v_weight numeric;
  v_reps integer;
  v_started_at timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_client_session_id is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'invalid_draft_revision' using errcode = '22023'; end if;
  perform public.validate_workout_payload(p_payload, true);
  v_started_at := (p_payload ->> 'startedAt')::timestamptz;

  -- A retry after a successful commit returns the same workout and never changes its share.
  select w.id into v_workout_id from public.workouts w
  where w.user_id = v_user_id and w.client_session_id = p_client_session_id and w.finished_at is not null;
  if v_workout_id is not null then
    select s.group_id into v_existing_share_group from public.group_workout_shares s where s.workout_id = v_workout_id;
    if v_existing_share_group is distinct from p_group_id then raise exception 'workout_already_completed_with_different_share_choice' using errcode = '40001'; end if;
    return v_workout_id;
  end if;

  select * into v_draft from public.workout_autosaves where user_id = v_user_id for update;
  if found then
    if v_draft.client_session_id <> p_client_session_id or v_draft.revision <> p_expected_revision then
      raise exception 'draft_revision_conflict' using errcode = '40001';
    end if;
  elsif p_expected_revision <> 0 then
    raise exception 'draft_revision_conflict' using errcode = '40001';
  end if;

  if p_group_id is not null and not public.is_group_member(p_group_id) then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;

  begin
    insert into public.workouts(user_id, name, started_at, finished_at, client_session_id)
    values (v_user_id, btrim(p_payload ->> 'name'), v_started_at, now(), p_client_session_id)
    returning id into v_workout_id;
  exception when unique_violation then
    select w.id into v_workout_id from public.workouts w
      where w.user_id = v_user_id and w.client_session_id = p_client_session_id and w.finished_at is not null;
    if v_workout_id is not null then
      select s.group_id into v_existing_share_group from public.group_workout_shares s where s.workout_id = v_workout_id;
      if v_existing_share_group is distinct from p_group_id then raise exception 'workout_already_completed_with_different_share_choice' using errcode = '40001'; end if;
      return v_workout_id;
    end if;
    raise exception 'workout_completion_conflict' using errcode = '40001';
  end;

  for v_exercise in select value from jsonb_array_elements(p_payload -> 'exercises') loop
    v_exercise_id := nullif(v_exercise ->> 'exerciseId', '')::uuid;
    if v_exercise_id is not null and not exists (
      select 1 from public.exercises e where e.id = v_exercise_id and e.user_id = v_user_id
    ) then
      raise exception 'exercise_not_owned' using errcode = '42501';
    end if;
    insert into public.workout_exercises(workout_id, exercise_id, exercise_name, position)
    values (v_workout_id, v_exercise_id, btrim(v_exercise ->> 'name'), v_position)
    returning id into v_workout_exercise_id;
    v_position := v_position + 1;
    v_set_number := 0;
    for v_set in select value from jsonb_array_elements(v_exercise -> 'sets') loop
      v_set_number := v_set_number + 1;
      v_weight := replace(v_set ->> 'weight', ',', '.')::numeric;
      v_reps := (v_set ->> 'reps')::integer;
      insert into public.workout_sets(workout_exercise_id, set_number, weight, reps)
      values (v_workout_exercise_id, v_set_number, v_weight, v_reps);
    end loop;
  end loop;

  if p_group_id is not null then
    insert into public.group_workout_shares(group_id, workout_id, shared_by)
    values (p_group_id, v_workout_id, v_user_id);
  end if;

  delete from public.workout_autosaves where user_id = v_user_id and client_session_id = p_client_session_id;
  return v_workout_id;
end;
$$;

-- Every definer function has a fixed search_path and performs its own auth.uid()/membership check.
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.is_group_member(uuid) from public, anon, authenticated;
revoke all on function public.is_group_admin(uuid) from public, anon, authenticated;
revoke all on function public.validate_workout_payload(jsonb, boolean) from public, anon, authenticated;

revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.set_my_display_name(text) from public, anon;
revoke all on function public.create_private_group(text, text, text) from public, anon;
revoke all on function public.get_my_groups() from public, anon;
revoke all on function public.get_group_overview(uuid) from public, anon;
revoke all on function public.get_group_members(uuid) from public, anon;
revoke all on function public.create_group_invite(uuid, text) from public, anon;
revoke all on function public.get_group_invite_preview(text) from public;
revoke all on function public.accept_group_invite(text) from public, anon;
revoke all on function public.revoke_group_invite(uuid) from public, anon;
revoke all on function public.leave_group(uuid) from public, anon;
revoke all on function public.transfer_group_ownership(uuid, uuid) from public, anon;
revoke all on function public.archive_group(uuid) from public, anon;
revoke all on function public.get_group_invites(uuid) from public, anon;
revoke all on function public.share_finished_workout(uuid, uuid) from public, anon;
revoke all on function public.unshare_finished_workout(uuid) from public, anon;
revoke all on function public.get_group_feed(uuid, integer) from public, anon;
revoke all on function public.get_group_comments(uuid, uuid) from public, anon;
revoke all on function public.add_group_comment(uuid, uuid, text) from public, anon;
revoke all on function public.delete_group_comment(uuid) from public, anon;
revoke all on function public.toggle_group_reaction(uuid, uuid, text) from public, anon;
revoke all on function public.get_group_leaderboard(uuid, integer) from public, anon;
revoke all on function public.save_workout_draft(uuid, integer, jsonb) from public, anon;
revoke all on function public.get_my_workout_draft() from public, anon;
revoke all on function public.replace_my_workout_draft(uuid, integer, uuid, jsonb) from public, anon;
revoke all on function public.discard_my_workout_draft(uuid) from public, anon;
revoke all on function public.complete_workout_session(uuid, integer, jsonb, uuid) from public, anon;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.set_my_display_name(text) to authenticated;
grant execute on function public.create_private_group(text, text, text) to authenticated;
grant execute on function public.get_my_groups() to authenticated;
grant execute on function public.get_group_overview(uuid) to authenticated;
grant execute on function public.get_group_members(uuid) to authenticated;
grant execute on function public.create_group_invite(uuid, text) to authenticated;
grant execute on function public.get_group_invite_preview(text) to anon, authenticated;
grant execute on function public.accept_group_invite(text) to authenticated;
grant execute on function public.revoke_group_invite(uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.archive_group(uuid) to authenticated;
grant execute on function public.get_group_invites(uuid) to authenticated;
grant execute on function public.share_finished_workout(uuid, uuid) to authenticated;
grant execute on function public.unshare_finished_workout(uuid) to authenticated;
grant execute on function public.get_group_feed(uuid, integer) to authenticated;
grant execute on function public.get_group_comments(uuid, uuid) to authenticated;
grant execute on function public.add_group_comment(uuid, uuid, text) to authenticated;
grant execute on function public.delete_group_comment(uuid) to authenticated;
grant execute on function public.toggle_group_reaction(uuid, uuid, text) to authenticated;
grant execute on function public.get_group_leaderboard(uuid, integer) to authenticated;
grant execute on function public.save_workout_draft(uuid, integer, jsonb) to authenticated;
grant execute on function public.get_my_workout_draft() to authenticated;
grant execute on function public.replace_my_workout_draft(uuid, integer, uuid, jsonb) to authenticated;
grant execute on function public.discard_my_workout_draft(uuid) to authenticated;
grant execute on function public.complete_workout_session(uuid, integer, jsonb, uuid) to authenticated;

commit;
