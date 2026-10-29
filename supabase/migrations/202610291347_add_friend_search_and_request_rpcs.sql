create or replace function public.search_profiles(p_query text)
returns table(user_id uuid, display_name text)
language sql stable security definer set search_path = public
as $$
  select p.user_id, p.display_name
  from public.profiles p
  where auth.uid() is not null and p.user_id <> auth.uid()
    and length(trim(p_query)) >= 2
    and lower(p.display_name) like lower(trim(p_query)) || '%'
  order by p.display_name limit 10;
$$;

create or replace function public.get_my_friend_requests()
returns table(request_id uuid, other_user_id uuid, display_name text, direction text, status text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select fr.id, case when fr.sender_id = auth.uid() then fr.receiver_id else fr.sender_id end,
    coalesce(p.display_name, 'GymBattle Nutzer'),
    case when fr.sender_id = auth.uid() then 'outgoing' else 'incoming' end,
    fr.status, fr.created_at
  from public.friend_requests fr
  join public.profiles p on p.user_id = case when fr.sender_id = auth.uid() then fr.receiver_id else fr.sender_id end
  where auth.uid() = fr.sender_id or auth.uid() = fr.receiver_id
  order by fr.created_at desc limit 100;
$$;

create or replace function public.send_friend_request(p_receiver_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare request_id uuid;
begin
  if auth.uid() is null or p_receiver_id = auth.uid() then raise exception 'Ungültiger Empfänger'; end if;
  insert into public.friend_requests(sender_id, receiver_id, status) values (auth.uid(), p_receiver_id, 'pending') returning id into request_id;
  return request_id;
exception when unique_violation then raise exception 'Freundschaftsanfrage existiert bereits';
end;
$$;

create or replace function public.respond_friend_request(p_request_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('accepted', 'declined') then raise exception 'Ungültiger Status'; end if;
  update public.friend_requests set status = p_status where id = p_request_id and receiver_id = auth.uid() and status = 'pending';
  return found;
end;
$$;

revoke all on function public.search_profiles(text) from public, anon, authenticated;
revoke all on function public.get_my_friend_requests() from public, anon, authenticated;
revoke all on function public.send_friend_request(uuid) from public, anon, authenticated;
revoke all on function public.respond_friend_request(uuid, text) from public, anon, authenticated;
grant execute on function public.search_profiles(text) to authenticated;
grant execute on function public.get_my_friend_requests() to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
