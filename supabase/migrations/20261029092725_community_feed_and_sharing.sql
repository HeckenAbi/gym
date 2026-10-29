begin;

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

revoke all on function public.share_finished_workout(uuid, uuid) from public, anon;
revoke all on function public.unshare_finished_workout(uuid) from public, anon;
revoke all on function public.get_group_feed(uuid, integer) from public, anon;
revoke all on function public.get_group_comments(uuid, uuid) from public, anon;
revoke all on function public.add_group_comment(uuid, uuid, text) from public, anon;
revoke all on function public.delete_group_comment(uuid) from public, anon;
revoke all on function public.toggle_group_reaction(uuid, uuid, text) from public, anon;
revoke all on function public.get_group_leaderboard(uuid, integer) from public, anon;

grant execute on function public.share_finished_workout(uuid, uuid) to authenticated;
grant execute on function public.unshare_finished_workout(uuid) to authenticated;
grant execute on function public.get_group_feed(uuid, integer) to authenticated;
grant execute on function public.get_group_comments(uuid, uuid) to authenticated;
grant execute on function public.add_group_comment(uuid, uuid, text) to authenticated;
grant execute on function public.delete_group_comment(uuid) to authenticated;
grant execute on function public.toggle_group_reaction(uuid, uuid, text) to authenticated;
grant execute on function public.get_group_leaderboard(uuid, integer) to authenticated;

commit;
