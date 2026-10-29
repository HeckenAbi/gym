begin;

-- Fail safely when this migration is applied to an unexpected core schema.
do $$
begin
  if to_regclass('public.group_workout_shares') is null
     or to_regclass('public.group_members') is null
     or to_regclass('public.gym_groups') is null
     or to_regclass('public.workouts') is null
     or to_regclass('public.workout_exercises') is null
     or to_regclass('public.workout_sets') is null then
    raise exception 'Gym Battle community/workout schema is missing; inspect the target schema before applying league scoring.';
  end if;
end;
$$;

alter table public.group_workout_shares
  add column if not exists counts_for_points boolean not null default false;

create or replace function public.is_qualified_group_workout(p_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.workouts w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    where w.id = p_workout_id
      and w.finished_at is not null
      and ws.weight is not null
      and ws.weight >= 0
      and ws.reps between 1 and 10000
    group by w.id
    having count(*) >= 3 and sum(ws.reps) >= 10
  );
$$;

create or replace function public.capture_group_share_points()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_timezone text;
  v_owner uuid;
  v_finished_at timestamptz;
  v_joined_at timestamptz;
begin
  select g.timezone into v_timezone
  from public.gym_groups g
  where g.id = new.group_id and g.archived_at is null;
  if v_timezone is null then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;

  select w.user_id, w.finished_at into v_owner, v_finished_at
  from public.workouts w where w.id = new.workout_id;
  if v_owner is null or v_owner <> new.shared_by or v_finished_at is null then
    raise exception 'completed_workout_not_found' using errcode = '42501';
  end if;

  select gm.joined_at into v_joined_at
  from public.group_members gm
  where gm.group_id = new.group_id
    and gm.user_id = new.shared_by
    and gm.status = 'active';
  if v_joined_at is null then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;

  -- A point can only be earned when both completion and explicit sharing occur
  -- in the same group-local week and after the member joined. Historical shares
  -- can remain visible in the feed but cannot change a closed week's score.
  new.counts_for_points :=
    v_finished_at >= v_joined_at
    and date_trunc('week', v_finished_at at time zone v_timezone)::date
        = date_trunc('week', new.shared_at at time zone v_timezone)::date
    and v_finished_at <= now()
    and public.is_qualified_group_workout(new.workout_id);
  return new;
end;
$$;

-- Preserve valid historical shares only when they were shared in the same
-- group-local week as completion and meet the same set threshold.
update public.group_workout_shares s
set counts_for_points = (
  w.finished_at is not null
  and w.finished_at >= gm.joined_at
  and date_trunc('week', w.finished_at at time zone g.timezone)::date
      = date_trunc('week', s.shared_at at time zone g.timezone)::date
  and w.finished_at <= now()
  and public.is_qualified_group_workout(w.id)
)
from public.workouts w, public.gym_groups g, public.group_members gm
where w.id = s.workout_id
  and g.id = s.group_id
  and gm.group_id = s.group_id
  and gm.user_id = s.shared_by
  and gm.status = 'active';

 drop trigger if exists group_share_capture_points on public.group_workout_shares;
create trigger group_share_capture_points
before insert on public.group_workout_shares
for each row execute function public.capture_group_share_points();

-- A score's completion time is server-owned. Draft completion uses the
-- SECURITY DEFINER RPC; direct PostgREST inserts may only create unfinished rows.
create or replace function public.prevent_client_finished_at_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user = 'authenticated'
     and new.finished_at is distinct from old.finished_at then
    raise exception 'workout_completion_time_server_managed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists workouts_finished_at_server_managed on public.workouts;
create trigger workouts_finished_at_server_managed
before update of finished_at on public.workouts
for each row execute function public.prevent_client_finished_at_change();

drop policy if exists workouts_insert_own on public.workouts;
create policy workouts_insert_own on public.workouts
  for insert to authenticated
  with check (user_id = auth.uid() and finished_at is null);

-- Extend the member-only feed with a clear, snapshotted point result.
drop function if exists public.get_group_feed(uuid, integer);
create function public.get_group_feed(p_group_id uuid, p_limit integer default 20)
returns table (
  share_id uuid,
  workout_id uuid,
  shared_by uuid,
  display_name text,
  workout_name text,
  finished_at timestamptz,
  shared_at timestamptz,
  counts_for_points boolean,
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
  if not public.is_group_member(p_group_id) then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;
  return query
  select s.id, s.workout_id, s.shared_by, coalesce(p.display_name, 'Athlet'), w.name,
         w.finished_at, s.shared_at, s.counts_for_points,
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
  if not public.is_group_member(p_group_id) then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;
  if p_week_offset not in (0, 1) then
    raise exception 'week_offset_must_be_0_or_1' using errcode = '22023';
  end if;
  select g.timezone into v_timezone from public.gym_groups g
  where g.id = p_group_id and g.archived_at is null;
  if v_timezone is null then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;
  v_week_start := date_trunc('week', now() at time zone v_timezone)::date - (p_week_offset * 7);
  v_start := v_week_start::timestamp at time zone v_timezone;
  v_end := (v_week_start + 7)::timestamp at time zone v_timezone;
  return query
  with workout_days as (
    select w.user_id, (w.finished_at at time zone v_timezone)::date as local_day
    from public.group_workout_shares s
    join public.workouts w on w.id = s.workout_id
    join public.group_members gm on gm.group_id = s.group_id and gm.user_id = w.user_id and gm.status = 'active'
    where s.group_id = p_group_id
      and s.counts_for_points
      and w.finished_at is not null
      and w.finished_at >= gm.joined_at
      and w.finished_at >= v_start and w.finished_at < v_end and w.finished_at <= now()
    group by w.user_id, (w.finished_at at time zone v_timezone)::date
  ), scores as (
    select gm.user_id, coalesce(p.display_name, 'Athlet') as display_name,
           count(wd.local_day)::integer as workout_days,
           count(wd.local_day)::integer as points
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

create or replace function public.get_group_season_leaderboard(p_group_id uuid, p_season_offset integer default 0)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  points integer,
  workout_days integer,
  weeks_counted integer,
  season_start date,
  season_end date,
  timezone text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_timezone text;
  v_current_week date;
  v_season_start date;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;
  if p_season_offset not in (0, 1) then
    raise exception 'season_offset_must_be_0_or_1' using errcode = '22023';
  end if;
  select g.timezone into v_timezone from public.gym_groups g
  where g.id = p_group_id and g.archived_at is null;
  if v_timezone is null then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;

  v_current_week := date_trunc('week', now() at time zone v_timezone)::date;
  v_season_start := date '2000-01-03'
    + (((v_current_week - date '2000-01-03') / 28) * 28)
    - (p_season_offset * 28);
  v_start := v_season_start::timestamp at time zone v_timezone;
  v_end := (v_season_start + 28)::timestamp at time zone v_timezone;

  return query
  with qualifying_days as (
    select w.user_id,
           date_trunc('week', w.finished_at at time zone v_timezone)::date as week_start,
           (w.finished_at at time zone v_timezone)::date as local_day
    from public.group_workout_shares s
    join public.workouts w on w.id = s.workout_id
    join public.group_members gm on gm.group_id = s.group_id and gm.user_id = w.user_id and gm.status = 'active'
    where s.group_id = p_group_id
      and s.counts_for_points
      and w.finished_at is not null
      and w.finished_at >= gm.joined_at
      and w.finished_at >= v_start and w.finished_at < v_end and w.finished_at <= now()
    group by w.user_id,
             date_trunc('week', w.finished_at at time zone v_timezone)::date,
             (w.finished_at at time zone v_timezone)::date
  ), weekly_scores as (
    select q.user_id, q.week_start, count(*)::integer as points, count(*)::integer as workout_days
    from qualifying_days q
    group by q.user_id, q.week_start
  ), ranked_weeks as (
    select ws.*,
           row_number() over (partition by ws.user_id order by ws.points desc, ws.week_start desc) as week_rank
    from weekly_scores ws
  ), scores as (
    select gm.user_id,
           coalesce(p.display_name, 'Athlet') as display_name,
           coalesce(sum(rw.points) filter (where rw.week_rank <= 3), 0)::integer as points,
           coalesce(sum(rw.workout_days) filter (where rw.week_rank <= 3), 0)::integer as workout_days,
           count(rw.week_start) filter (where rw.week_rank <= 3)::integer as weeks_counted
    from public.group_members gm
    left join public.profiles p on p.user_id = gm.user_id
    left join ranked_weeks rw on rw.user_id = gm.user_id
    where gm.group_id = p_group_id and gm.status = 'active'
    group by gm.user_id, p.display_name
  )
  select rank() over (order by scores.points desc)::bigint,
         scores.user_id, scores.display_name, scores.points, scores.workout_days,
         scores.weeks_counted, v_season_start, v_season_start + 27, v_timezone
  from scores
  order by scores.points desc, lower(scores.display_name), scores.user_id;
end;
$$;

create or replace function public.get_group_weekly_challenge(p_group_id uuid, p_week_offset integer default 0)
returns table (
  week_start date,
  timezone text,
  active_members integer,
  members_at_goal integer,
  target_per_member integer,
  completed boolean,
  progress_percent integer
)
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
  if not public.is_group_member(p_group_id) then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;
  if p_week_offset not in (0, 1) then
    raise exception 'week_offset_must_be_0_or_1' using errcode = '22023';
  end if;
  select g.timezone into v_timezone from public.gym_groups g
  where g.id = p_group_id and g.archived_at is null;
  if v_timezone is null then
    raise exception 'group_not_found_or_not_available' using errcode = '42501';
  end if;
  v_week_start := date_trunc('week', now() at time zone v_timezone)::date - (p_week_offset * 7);
  v_start := v_week_start::timestamp at time zone v_timezone;
  v_end := (v_week_start + 7)::timestamp at time zone v_timezone;
  return query
  with member_days as (
    select gm.user_id,
           count(distinct (w.finished_at at time zone v_timezone)::date)::integer as day_count
    from public.group_members gm
    left join public.group_workout_shares s
      on s.group_id = gm.group_id and s.shared_by = gm.user_id and s.counts_for_points
    left join public.workouts w
      on w.id = s.workout_id
      and w.finished_at is not null
      and w.finished_at >= gm.joined_at
      and w.finished_at >= v_start and w.finished_at < v_end and w.finished_at <= now()
    where gm.group_id = p_group_id and gm.status = 'active'
    group by gm.user_id
  ), totals as (
    select count(*)::integer as active_members,
           count(*) filter (where day_count >= 2)::integer as members_at_goal
    from member_days
  )
  select v_week_start, v_timezone, totals.active_members, totals.members_at_goal,
         2,
         totals.active_members > 0 and totals.members_at_goal = totals.active_members,
         case when totals.active_members = 0 then 0
              else floor(totals.members_at_goal::numeric * 100 / totals.active_members)::integer end
  from totals;
end;
$$;

revoke all on function public.is_qualified_group_workout(uuid) from public, anon, authenticated;
revoke all on function public.capture_group_share_points() from public, anon, authenticated;
revoke all on function public.prevent_client_finished_at_change() from public, anon, authenticated;
revoke all on function public.get_group_feed(uuid, integer) from public, anon;
revoke all on function public.get_group_leaderboard(uuid, integer) from public, anon;
revoke all on function public.get_group_season_leaderboard(uuid, integer) from public, anon;
revoke all on function public.get_group_weekly_challenge(uuid, integer) from public, anon;
grant execute on function public.get_group_feed(uuid, integer) to authenticated;
grant execute on function public.get_group_leaderboard(uuid, integer) to authenticated;
grant execute on function public.get_group_season_leaderboard(uuid, integer) to authenticated;
grant execute on function public.get_group_weekly_challenge(uuid, integer) to authenticated;

commit;
