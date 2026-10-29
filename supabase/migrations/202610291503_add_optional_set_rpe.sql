alter table public.workout_sets
  add column if not exists rpe numeric check (rpe is null or (rpe >= 0 and rpe <= 10));
