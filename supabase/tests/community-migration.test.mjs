import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
const migrations = await Promise.all([
  "../migrations/20261028230000_community_and_workout_sync.sql",
  "../migrations/20261029001000_group_league_scoring.sql",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

async function asUser(userId, fn, role = "authenticated") {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role ${role};`);
  try { return await fn(); }
  finally { await db.exec("reset role;"); }
}
function one(result) {
  assert.ok(result.rows.length, "expected one row");
  return result.rows[0];
}
function addDays(day, amount) {
  const dateText = day instanceof Date ? day.toISOString().slice(0, 10) : String(day).slice(0, 10);
  return new Date(Date.parse(`${dateText}T00:00:00Z`) + amount * 86_400_000).toISOString().slice(0, 10);
}
async function seedQualifiedWorkout(groupId, userId, localDay, name, shareDay = localDay) {
  const workoutId = one(await db.query(
    `insert into public.workouts(user_id,name,started_at,finished_at)
     values ($1,$2,($3::date + time '11:00') at time zone 'Europe/Berlin',($3::date + time '12:00') at time zone 'Europe/Berlin')
     returning id`,
    [userId, name, localDay],
  )).id;
  const exerciseId = one(await db.query(
    "insert into public.workout_exercises(workout_id,exercise_name,position) values ($1,'Ligatest',0) returning id",
    [workoutId],
  )).id;
  for (const [index, reps] of [4, 3, 3].entries()) {
    await db.query(
      "insert into public.workout_sets(workout_exercise_id,set_number,weight,reps) values ($1,$2,0,$3)",
      [exerciseId, index + 1, reps],
    );
  }
  await db.query(
    `insert into public.group_workout_shares(group_id,workout_id,shared_by,shared_at)
     values ($1,$2,$3,($4::date + time '12:15') at time zone 'Europe/Berlin')`,
    [groupId, workoutId, userId, shareDay],
  );
  return workoutId;
}

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table public.exercises (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id),
      name text not null
    );
    create table public.workouts (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id),
      name text not null,
      started_at timestamptz not null default now(),
      finished_at timestamptz
    );
    create table public.workout_exercises (
      id uuid primary key default gen_random_uuid(),
      workout_id uuid not null references public.workouts(id) on delete cascade,
      exercise_id uuid references public.exercises(id),
      exercise_name text not null,
      position integer not null default 0
    );
    create table public.workout_sets (
      id uuid primary key default gen_random_uuid(),
      workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
      set_number integer not null,
      weight numeric,
      reps integer
    );
  `);
  for (const migration of migrations) await db.exec(migration);
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values ('${A}','{"display_name":"Alex"}'),('${B}','{"display_name":"Bo"}'),('${C}','{"display_name":"C"}');`);

  const profiles = await db.query("select user_id, display_name from public.profiles order by user_id");
  assert.equal(profiles.rows.length, 3);
  assert.match(profiles.rows.find((row) => row.user_id === C).display_name, /^Athlet /);

  const groupId = one(await asUser(A, () => db.query("select public.create_private_group('Test Crew','private','Europe/Berlin') as id"))).id;
  assert.equal(one(await asUser(A, () => db.query("select count(*)::int as n from public.get_my_groups()"))).n, 1);
  assert.equal(one(await asUser(B, () => db.query("select count(*)::int as n from public.get_my_groups()"))).n, 0);

  const hash = "a".repeat(64);
  await asUser(A, () => db.query("select * from public.create_group_invite($1,$2)", [groupId, hash]));
  const preview = one(await asUser(B, () => db.query("select * from public.get_group_invite_preview($1)", [hash])));
  assert.equal(preview.group_id, groupId);
  assert.equal(preview.group_name, "Test Crew");
  assert.equal("token_hash" in preview, false, "invite preview must not expose token hash");
  await asUser(B, () => db.query("select public.accept_group_invite($1)", [hash]));
  await assert.rejects(() => asUser(B, () => db.query("select public.accept_group_invite($1)", [hash])));

  const payload = {
    name: "Push A",
    startedAt: "2026-10-28T22:00:00.000Z",
    exercises: [{ exerciseId: null, name: "Bankdrücken", sets: [
      { weight: "30,5", reps: "4" },
      { weight: "30,5", reps: "3" },
      { weight: "30,5", reps: "3" },
    ] }],
  };
  const sessionId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const rev1 = one(await asUser(A, () => db.query("select public.save_workout_draft($1,0,$2::jsonb) as revision", [sessionId, JSON.stringify(payload)]))).revision;
  assert.equal(rev1, 1);
  const rev2 = one(await asUser(A, () => db.query("select public.save_workout_draft($1,1,$2::jsonb) as revision", [sessionId, JSON.stringify(payload)]))).revision;
  assert.equal(rev2, 2);
  await assert.rejects(() => asUser(A, () => db.query("select public.save_workout_draft($1,1,$2::jsonb)", [sessionId, JSON.stringify(payload)])));
  const replacementSessionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const rev3 = one(await asUser(A, () => db.query("select public.replace_my_workout_draft($1,2,$2,$3::jsonb) as revision", [sessionId, replacementSessionId, JSON.stringify(payload)]))).revision;
  assert.equal(rev3, 3);
  assert.equal(one(await asUser(A, () => db.query("select * from public.get_my_workout_draft()"))).client_session_id, replacementSessionId);
  const workoutId = one(await asUser(A, () => db.query("select public.complete_workout_session($1,3,$2::jsonb,$3) as id", [replacementSessionId, JSON.stringify(payload), groupId]))).id;
  await assert.rejects(() => asUser(A, () => db.query("update public.workouts set finished_at = now() - interval '7 days' where id = $1", [workoutId])));
  await assert.rejects(() => asUser(A, () => db.query("insert into public.workouts(user_id,name,started_at,finished_at) values ($1,'Fake',now(),now())", [A])));
  const savedSet = one(await asUser(A, () => db.query("select ws.weight, ws.reps from public.workout_sets ws join public.workout_exercises we on we.id=ws.workout_exercise_id where we.workout_id=$1", [workoutId])));
  assert.equal(Number(savedSet.weight), 30.5);
  const savedSets = await asUser(A, () => db.query("select ws.reps from public.workout_sets ws join public.workout_exercises we on we.id=ws.workout_exercise_id where we.workout_id=$1 order by ws.set_number", [workoutId]));
  assert.deepEqual(savedSets.rows.map((row) => row.reps), [4, 3, 3]);

  const feedA = await asUser(A, () => db.query("select * from public.get_group_feed($1,20)", [groupId]));
  assert.equal(feedA.rows.length, 1);
  assert.equal(feedA.rows[0].counts_for_points, true);
  assert.equal(feedA.rows[0].details[0].name, "Bankdrücken");
  assert.equal(feedA.rows[0].details[0].sets[0].weight, 30.5);
  const shareId = feedA.rows[0].share_id;
  const rank = one(await asUser(A, () => db.query("select * from public.get_group_leaderboard($1,0) where user_id=$2", [groupId, A])));
  assert.equal(rank.points, 1);
  assert.equal(rank.rank, 1);
  const currentChallenge = one(await asUser(A, () => db.query("select * from public.get_group_weekly_challenge($1,0)", [groupId])));
  assert.equal(currentChallenge.active_members, 2);
  assert.equal(currentChallenge.target_per_member, 2);
  assert.equal(currentChallenge.members_at_goal, 0);
  assert.equal(currentChallenge.completed, false);
  assert.equal(currentChallenge.progress_percent, 0);
  await assert.rejects(() => asUser(C, () => db.query("select * from public.get_group_season_leaderboard($1,0)", [groupId])));
  await asUser(B, () => db.query("select public.add_group_comment($1,$2,'Starkes Training')", [groupId, shareId]));
  await asUser(B, () => db.query("select public.toggle_group_reaction($1,$2,'strong')", [groupId, shareId]));
  assert.equal(one(await asUser(A, () => db.query("select count(*)::int as n from public.get_group_comments($1,$2)", [groupId, shareId]))).n, 1);
  await assert.rejects(() => asUser(C, () => db.query("select * from public.get_group_feed($1,20)", [groupId])));
  assert.equal(one(await asUser(B, () => db.query("select count(*)::int as n from public.workouts"))).n, 0);
  await asUser(A, () => db.query("select public.unshare_finished_workout($1)", [shareId]));
  assert.equal((await asUser(B, () => db.query("select * from public.get_group_feed($1,20)", [groupId]))).rows.length, 0);

  const oneSetPayload = {
    name: "Kurzer Testsatz",
    startedAt: "2026-10-28T22:00:00.000Z",
    exercises: [{ exerciseId: null, name: "Einzelner Satz", sets: [{ weight: "0", reps: "1" }] }],
  };
  const oneSetSessionId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const oneSetWorkoutId = one(await asUser(B, () => db.query(
    "select public.complete_workout_session($1,0,$2::jsonb,$3) as id",
    [oneSetSessionId, JSON.stringify(oneSetPayload), groupId],
  ))).id;
  const oneSetFeed = await asUser(B, () => db.query("select counts_for_points from public.get_group_feed($1,20) where workout_id=$2", [groupId, oneSetWorkoutId]));
  assert.equal(one(oneSetFeed).counts_for_points, false);
  assert.equal(one(await asUser(B, () => db.query("select * from public.get_group_leaderboard($1,0) where user_id=$2", [groupId, B]))).points, 0);

  await db.query("update public.group_members set joined_at='2000-01-01T00:00:00Z' where group_id=$1", [groupId]);
  const previousWeekStart = one(await db.query("select (date_trunc('week', now() at time zone 'Europe/Berlin')::date - 7)::date as day")).day;
  for (let day = 0; day < 7; day += 1) {
    await seedQualifiedWorkout(groupId, A, addDays(previousWeekStart, day), `Unlimited week ${day + 1}`);
  }
  await seedQualifiedWorkout(groupId, A, addDays(previousWeekStart, 0), "Same-day duplicate");
  await seedQualifiedWorkout(groupId, B, addDays(previousWeekStart, 0), "B challenge day 1");
  await seedQualifiedWorkout(groupId, B, addDays(previousWeekStart, 1), "B challenge day 2");
  const completedChallenge = one(await asUser(A, () => db.query("select * from public.get_group_weekly_challenge($1,1)", [groupId])));
  assert.equal(completedChallenge.active_members, 2);
  assert.equal(completedChallenge.members_at_goal, 2);
  assert.equal(completedChallenge.completed, true);
  assert.equal(completedChallenge.progress_percent, 100);
  const currentLocalDay = one(await db.query("select (now() at time zone 'Europe/Berlin')::date as day")).day;
  const lateWorkoutId = await seedQualifiedWorkout(groupId, A, addDays(previousWeekStart, 0), "Late share", currentLocalDay);
  const lateShare = await asUser(A, () => db.query("select counts_for_points from public.get_group_feed($1,50) where workout_id=$2", [groupId, lateWorkoutId]));
  assert.equal(one(lateShare).counts_for_points, false, "sharing from a later group week cannot award a retroactive point");
  const previousWeekRank = one(await asUser(A, () => db.query("select * from public.get_group_leaderboard($1,1) where user_id=$2", [groupId, A])));
  assert.equal(previousWeekRank.points, 7, "one point per day has no weekly points cap");

  const scoringGroup = one(await asUser(A, () => db.query("select public.create_private_group('Season Test Crew',null,'Europe/Berlin') as id"))).id;
  const scoringInviteHash = "d".repeat(64);
  await asUser(A, () => db.query("select * from public.create_group_invite($1,$2)", [scoringGroup, scoringInviteHash]));
  await asUser(B, () => db.query("select public.accept_group_invite($1)", [scoringInviteHash]));
  const previousSeasonStart = one(await db.query(`
    select (date '2000-01-03'
      + (((date_trunc('week', now() at time zone 'Europe/Berlin')::date - date '2000-01-03') / 28) * 28)
      - 28)::date as day
  `)).day;
  await db.query("update public.group_members set joined_at=$2::date::timestamp at time zone 'Europe/Berlin' - interval '1 day' where group_id=$1", [scoringGroup, previousSeasonStart]);
  const seasonDaysA = [4, 1, 2, 3];
  const seasonDaysB = [2, 2, 2, 2];
  for (let week = 0; week < 4; week += 1) {
    for (let day = 0; day < seasonDaysA[week]; day += 1) {
      await seedQualifiedWorkout(scoringGroup, A, addDays(previousSeasonStart, week * 7 + day), `A season ${week}-${day}`);
    }
    for (let day = 0; day < seasonDaysB[week]; day += 1) {
      await seedQualifiedWorkout(scoringGroup, B, addDays(previousSeasonStart, week * 7 + day), `B season ${week}-${day}`);
    }
  }
  const seasonRows = await asUser(A, () => db.query("select * from public.get_group_season_leaderboard($1,1)", [scoringGroup]));
  assert.equal(seasonRows.rows.find((row) => row.user_id === A).points, 9, "season uses the three best of four weeks");
  assert.equal(seasonRows.rows.find((row) => row.user_id === B).points, 6);
  assert.ok(seasonRows.rows.find((row) => row.user_id === A).rank < seasonRows.rows.find((row) => row.user_id === B).rank);

  const group2 = one(await asUser(A, () => db.query("select public.create_private_group('Second Crew',null,'Europe/Berlin') as id"))).id;
  const hash2 = "b".repeat(64);
  await asUser(A, () => db.query("select * from public.create_group_invite($1,$2)", [group2, hash2]));
  await asUser(B, () => db.query("select public.accept_group_invite($1)", [hash2]));
  await asUser(A, () => db.query("select public.transfer_group_ownership($1,$2)", [group2, B]));
  assert.equal(one(await asUser(B, () => db.query("select * from public.get_group_overview($1)", [group2]))).my_role, "owner");
  await asUser(B, () => db.query("select public.archive_group($1)", [group2]));
  await assert.rejects(() => asUser(A, () => db.query("select * from public.get_group_overview($1)", [group2])));

  const group3 = one(await asUser(A, () => db.query("select public.create_private_group('Third Crew',null,'Europe/Berlin') as id"))).id;
  const hash3 = "c".repeat(64);
  const inviteId3 = one(await asUser(A, () => db.query("select * from public.create_group_invite($1,$2)", [group3, hash3]))).invite_id;
  const inviteRows = await asUser(A, () => db.query("select * from public.get_group_invites($1)", [group3]));
  assert.equal(inviteRows.rows.length, 1);
  assert.equal("token_hash" in inviteRows.rows[0], false);
  await asUser(A, () => db.query("select public.revoke_group_invite($1)", [inviteId3]));
  assert.equal((await asUser(B, () => db.query("select * from public.get_group_invite_preview($1)", [hash3]))).rows.length, 0);
  await asUser(A, () => db.query("select public.archive_group($1)", [group3]));

  console.log("PASS: migrations apply; private groups and invites; draft revisions and atomic completion; 3-set/10-rep qualification; server-owned completion times; point snapshot and same-day deduplication; no weekly points cap; no retroactive shares; top-3-of-4 seasons; member-only weekly challenge; feed/comments/reactions and RLS isolation; ownership transfer and archive.");
} finally {
  await db.close();
}
