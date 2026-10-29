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

revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.is_group_member(uuid) from public, anon, authenticated;
revoke all on function public.is_group_admin(uuid) from public, anon, authenticated;

commit;
