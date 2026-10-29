begin;

-- Normalize the manually-created legacy group tables used by the connected Gym Battle project.
-- On a fresh project these tables do not exist and this migration is a no-op.
do $$
declare
  v_policy record;
  v_constraint record;
begin
  if to_regclass('public.gym_groups') is not null then
    -- Remove legacy group policies before replacing the helper they depend on.
    for v_policy in
      select schemaname, tablename, policyname
      from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename in ('gym_groups', 'group_members', 'group_invites')
    loop
      execute format('drop policy %I on %I.%I', v_policy.policyname, v_policy.schemaname, v_policy.tablename);
    end loop;

    if to_regprocedure('public.is_group_member(uuid)') is not null then
      execute 'drop function public.is_group_member(uuid)';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'gym_groups' and column_name = 'owner_id'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'gym_groups' and column_name = 'created_by'
    ) then
      alter table public.gym_groups rename column owner_id to created_by;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'gym_groups' and column_name = 'created_by'
    ) then
      raise exception 'Legacy gym_groups table has neither owner_id nor created_by; inspect before migrating.';
    end if;

    alter table public.gym_groups add column if not exists description text;
    alter table public.gym_groups add column if not exists archived_at timestamptz;

    for v_constraint in
      select conname from pg_catalog.pg_constraint
      where conrelid = 'public.gym_groups'::regclass
        and contype = 'c'
        and pg_catalog.pg_get_constraintdef(oid) ilike '%name%'
    loop
      execute format('alter table public.gym_groups drop constraint %I', v_constraint.conname);
    end loop;
    alter table public.gym_groups
      add constraint gym_groups_name_length check (char_length(btrim(name)) between 2 and 80);
  end if;

  if to_regclass('public.group_members') is not null then
    alter table public.group_members
      add column if not exists role text not null default 'member' check (role in ('owner', 'admin', 'member'));
    alter table public.group_members
      add column if not exists status text not null default 'active' check (status in ('active', 'left', 'removed'));
    if to_regclass('public.gym_groups') is not null and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'gym_groups' and column_name = 'created_by'
    ) then
      update public.group_members gm
      set role = 'owner'
      from public.gym_groups g
      where gm.group_id = g.id and gm.user_id = g.created_by;
    end if;
    create unique index if not exists group_members_one_active_owner_uidx
      on public.group_members(group_id) where role = 'owner' and status = 'active';
    create index if not exists group_members_user_status_idx on public.group_members(user_id, status);
    create index if not exists group_members_group_status_idx on public.group_members(group_id, status);
  end if;

  if to_regclass('public.group_invites') is not null then
    alter table public.group_invites add column if not exists token_hash text;
    alter table public.group_invites add column if not exists max_uses integer not null default 1;
    alter table public.group_invites add column if not exists use_count integer not null default 0;
    alter table public.group_invites add column if not exists revoked_at timestamptz;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'group_invites' and column_name = 'token'
    ) and exists (select 1 from public.group_invites where token_hash is null) then
      if to_regprocedure('extensions.digest(text,text)') is null then
        raise exception 'pgcrypto digest(text,text) is required to hash legacy invite tokens safely.';
      end if;
      execute 'update public.group_invites set token_hash = encode(extensions.digest(token::text, ''sha256''), ''hex'') where token_hash is null';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'group_invites' and column_name = 'used_at'
    ) then
      execute 'update public.group_invites set use_count = greatest(use_count, case when used_at is null then 0 else 1 end)';
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'group_invites' and column_name = 'revoked'
    ) then
      execute 'update public.group_invites set revoked_at = coalesce(revoked_at, created_at) where revoked';
    end if;

    if exists (select 1 from public.group_invites where token_hash is null) then
      raise exception 'Legacy invite rows have no recoverable token; reissue them before migrating.';
    end if;
    alter table public.group_invites alter column token_hash set not null;
    create unique index if not exists group_invites_token_hash_uidx on public.group_invites(token_hash);

    if not exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = 'public.group_invites'::regclass and conname = 'group_invites_hash_format'
    ) then
      alter table public.group_invites
        add constraint group_invites_hash_format check (token_hash ~ '^[0-9a-f]{64}$');
    end if;
    if not exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = 'public.group_invites'::regclass and conname = 'group_invites_max_uses_one'
    ) then
      alter table public.group_invites add constraint group_invites_max_uses_one check (max_uses = 1);
    end if;
    if not exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = 'public.group_invites'::regclass and conname = 'group_invites_use_count_range'
    ) then
      alter table public.group_invites
        add constraint group_invites_use_count_range check (use_count between 0 and max_uses);
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'group_invites' and column_name = 'token'
    ) then
      alter table public.group_invites drop column token;
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'group_invites' and column_name = 'used_at'
    ) then
      alter table public.group_invites drop column used_at;
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'group_invites' and column_name = 'revoked'
    ) then
      alter table public.group_invites drop column revoked;
    end if;
  end if;
end;
$$;

commit;
