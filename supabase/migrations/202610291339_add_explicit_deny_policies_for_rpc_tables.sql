-- These tables are intentionally accessed through SECURITY DEFINER RPCs only.
-- Explicit deny policies document and enforce that clients cannot access them directly.
create policy "Deny direct access to group invites"
  on public.group_invites
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Deny direct access to workout autosaves"
  on public.workout_autosaves
  for all
  to anon, authenticated
  using (false)
  with check (false);
