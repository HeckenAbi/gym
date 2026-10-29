begin;

create index if not exists group_comments_group_share_idx
  on public.group_comments(group_id, share_id);
create index if not exists group_comments_user_idx
  on public.group_comments(user_id);
create index if not exists group_invites_created_by_idx
  on public.group_invites(created_by);
create index if not exists group_post_reactions_group_share_idx
  on public.group_post_reactions(group_id, share_id);
create index if not exists group_post_reactions_user_idx
  on public.group_post_reactions(user_id);
create index if not exists group_workout_shares_shared_by_idx
  on public.group_workout_shares(shared_by);
create index if not exists gym_groups_created_by_idx
  on public.gym_groups(created_by);
create index if not exists workout_exercises_exercise_id_idx
  on public.workout_exercises(exercise_id);

commit;
