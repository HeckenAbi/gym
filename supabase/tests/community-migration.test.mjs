import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
const migration = await readFile(new URL("../migrations/20261028230000_community_and_workout_sync.sql", import.meta.url), "utf8");
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
  await db.exec(migration);
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
    exercises: [{ exerciseId: null, name: "Bankdrücken", sets: [{ weight: "30,5", reps: "10" }] }],
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
  const savedSet = one(await asUser(A, () => db.query("select ws.weight, ws.reps from public.workout_sets ws join public.workout_exercises we on we.id=ws.workout_exercise_id where we.workout_id=$1", [workoutId])));
  assert.equal(Number(savedSet.weight), 30.5);
  assert.equal(savedSet.reps, 10);

  const feedA = await asUser(A, () => db.query("select * from public.get_group_feed($1,20)", [groupId]));
  assert.equal(feedA.rows.length, 1);
  assert.equal(feedA.rows[0].details[0].name, "Bankdrücken");
  assert.equal(feedA.rows[0].details[0].sets[0].weight, 30.5);
  const shareId = feedA.rows[0].share_id;
  const rank = one(await asUser(A, () => db.query("select * from public.get_group_leaderboard($1,0) where user_id=$2", [groupId, A])));
  assert.equal(rank.points, 1);
  assert.equal(rank.rank, 1);
  await asUser(B, () => db.query("select public.add_group_comment($1,$2,'Starkes Training')", [groupId, shareId]));
  await asUser(B, () => db.query("select public.toggle_group_reaction($1,$2,'strong')", [groupId, shareId]));
  assert.equal(one(await asUser(A, () => db.query("select count(*)::int as n from public.get_group_comments($1,$2)", [groupId, shareId]))).n, 1);
  await assert.rejects(() => asUser(C, () => db.query("select * from public.get_group_feed($1,20)", [groupId])));
  assert.equal(one(await asUser(B, () => db.query("select count(*)::int as n from public.workouts"))).n, 0);
  await asUser(A, () => db.query("select public.unshare_finished_workout($1)", [shareId]));
  assert.equal((await asUser(B, () => db.query("select * from public.get_group_feed($1,20)", [groupId]))).rows.length, 0);

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

  console.log("PASS: migration applies; profile fallback; private membership; single-use/revoked invites; draft revisions/conflicts; atomic completion with decimal comma; member-only feed/comments/reactions; opt-in share and leaderboard; RLS isolation; ownership transfer; archive; admin invite listing.");
} finally {
  await db.close();
}
