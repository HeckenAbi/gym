begin;

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

commit;
