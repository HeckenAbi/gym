begin;

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

revoke all on function public.validate_workout_payload(jsonb, boolean) from public, anon, authenticated;
revoke all on function public.save_workout_draft(uuid, integer, jsonb) from public, anon;
revoke all on function public.get_my_workout_draft() from public, anon;
revoke all on function public.replace_my_workout_draft(uuid, integer, uuid, jsonb) from public, anon;
revoke all on function public.discard_my_workout_draft(uuid) from public, anon;
revoke all on function public.complete_workout_session(uuid, integer, jsonb, uuid) from public, anon;

grant execute on function public.save_workout_draft(uuid, integer, jsonb) to authenticated;
grant execute on function public.get_my_workout_draft() to authenticated;
grant execute on function public.replace_my_workout_draft(uuid, integer, uuid, jsonb) to authenticated;
grant execute on function public.discard_my_workout_draft(uuid) to authenticated;
grant execute on function public.complete_workout_session(uuid, integer, jsonb, uuid) to authenticated;

commit;
