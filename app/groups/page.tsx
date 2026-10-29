"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

type Group = {
  id: string;
  name: string;
  description: string | null;
  timezone: string;
  member_count: number;
  created_at: string;
};

type Overview = Group & { my_role: string };
type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  points: number;
  workout_days: number;
  week_start: string;
  timezone: string;
};
type Member = { user_id: string; display_name: string; role: string; joined_at: string };
type FeedItem = {
  share_id: string;
  workout_id: string;
  shared_by: string;
  display_name: string;
  workout_name: string;
  finished_at: string | null;
  shared_at: string;
  counts_for_points: boolean;
  exercise_count: number;
  set_count: number;
  total_volume: number;
  details: unknown;
  reaction_counts: Record<string, number> | null;
  my_reaction: string | null;
};
type Invite = {
  invite_id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  use_count: number;
};
type GroupComment = {
  comment_id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
};
type WeeklyChallenge = {
  week_start: string;
  active_members: number;
  members_at_goal: number;
  target_per_member: number;
  completed: boolean;
  progress_percent: number;
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [commentsByShare, setCommentsByShare] = useState<Record<string, GroupComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentSaving, setCommentSaving] = useState("");
  const [challenge, setChallenge] = useState<WeeklyChallenge | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.replace("/");
      return;
    }
    setCurrentUserId(sessionData.session.user.id);
    const { data, error: queryError } = await supabase.rpc("get_my_groups");
    if (queryError) {
      setError(`Gruppen konnten nicht geladen werden: ${queryError.message}`);
    } else {
      const nextGroups = (data ?? []) as Group[];
      setGroups(nextGroups);
      setSelectedId((current) => current || nextGroups[0]?.id || "");
    }
    setLoading(false);
  }, [router]);

  const loadGroup = useCallback(async (groupId: string, offset = 0) => {
    if (!groupId) return;
    setDetailLoading(true);
    setError("");
    const [overviewResult, leaderboardResult, membersResult, feedResult, invitesResult] = await Promise.all([
      supabase.rpc("get_group_overview", { p_group_id: groupId }),
      supabase.rpc("get_group_leaderboard", { p_group_id: groupId, p_week_offset: offset }),
      supabase.rpc("get_group_members", { p_group_id: groupId }),
      supabase.rpc("get_group_feed", { p_group_id: groupId, p_limit: 20 }),
      supabase.rpc("get_group_invites", { p_group_id: groupId }),
    ]);
    const firstError = [overviewResult, leaderboardResult, membersResult, feedResult, invitesResult].find((result) => result.error)?.error;
    if (firstError) setError(`Gruppendaten konnten nicht geladen werden: ${firstError.message}`);
    setOverview(((overviewResult.data ?? [])[0] ?? null) as Overview | null);
    setLeaderboard((leaderboardResult.data ?? []) as LeaderboardRow[]);
    setMembers((membersResult.data ?? []) as Member[]);
    setFeed((feedResult.data ?? []) as FeedItem[]);
    setInvites((invitesResult.data ?? []) as Invite[]);
    const { data: challengeData, error: challengeError } = await supabase.rpc("get_group_weekly_challenge", { p_group_id: groupId, p_week_offset: offset });
    if (!challengeError) setChallenge(((challengeData ?? [])[0] ?? null) as WeeklyChallenge | null);
    setDetailLoading(false);
  }, []);

  useEffect(() => { void loadGroups(); }, [loadGroups]);
  useEffect(() => { if (selectedId) void loadGroup(selectedId, weekOffset); }, [selectedId, weekOffset, loadGroup]);

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!groupName.trim() || saving) return;
    setSaving(true); setError(""); setMessage("");
    const { data, error: createError } = await supabase.rpc("create_private_group", {
      p_name: groupName.trim(),
      p_description: groupDescription.trim() || null,
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
    });
    if (createError) setError(`Gruppe konnte nicht erstellt werden: ${createError.message}`);
    else {
      setGroupName(""); setGroupDescription(""); setShowCreate(false); setSelectedId(data as string); setMessage("Gruppe erstellt. Lade jetzt deine Crew ein."); await loadGroups();
    }
    setSaving(false);
  }

  async function createInvite() {
    if (!selectedId || saving) return;
    setSaving(true); setError(""); setMessage(""); setInviteLink("");
    const rawToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const tokenHash = await sha256(rawToken);
    const { error: inviteError } = await supabase.rpc("create_group_invite", { p_group_id: selectedId, p_token_hash: tokenHash });
    if (inviteError) setError(`Einladung konnte nicht erstellt werden: ${inviteError.message}`);
    else {
      const link = `${window.location.origin}/groups/invite?token=${encodeURIComponent(rawToken)}`;
      setInviteLink(link);
      try { await navigator.clipboard.writeText(link); setMessage("Einladungslink erstellt und in die Zwischenablage kopiert."); }
      catch { setMessage("Einladungslink erstellt. Kopiere ihn aus dem Feld."); }
      await loadGroup(selectedId, weekOffset);
    }
    setSaving(false);
  }

  async function revokeInvite(inviteId: string) {
    if (!window.confirm("Diesen Einladungslink wirklich widerrufen?")) return;
    const { error: revokeError } = await supabase.rpc("revoke_group_invite", { p_invite_id: inviteId });
    if (revokeError) setError(`Einladung konnte nicht widerrufen werden: ${revokeError.message}`);
    else { setMessage("Einladungslink widerrufen."); await loadGroup(selectedId, weekOffset); }
  }

  async function unshareWorkout(shareId: string) {
    if (!window.confirm("Dieses Training wirklich aus dem Crew-Feed entfernen?")) return;
    const { error: unshareError } = await supabase.rpc("unshare_finished_workout", { p_share_id: shareId });
    if (unshareError) setError(`Training konnte nicht entfernt werden: ${unshareError.message}`);
    else { setMessage("Training aus dem Crew-Feed entfernt."); await loadGroup(selectedId, weekOffset); }
  }

  async function leaveGroup() {
    if (!selectedId || !overview || !window.confirm(`Möchtest du „${overview.name}“ wirklich verlassen?`)) return;
    const { error: leaveError } = await supabase.rpc("leave_group", { p_group_id: selectedId });
    if (leaveError) setError(`Gruppe konnte nicht verlassen werden: ${leaveError.message}`);
    else { setSelectedId(""); setOverview(null); setMessage("Du hast die Gruppe verlassen."); await loadGroups(); }
  }

  async function toggleReaction(item: FeedItem, reaction: "strong" | "clap" | "fire") {
    if (!selectedId) return;
    const { error: reactionError } = await supabase.rpc("toggle_group_reaction", {
      p_group_id: selectedId,
      p_share_id: item.share_id,
      p_reaction: reaction,
    });
    if (reactionError) {
      setError(`Reaktion konnte nicht gespeichert werden: ${reactionError.message}`);
      return;
    }
    await loadGroup(selectedId, weekOffset);
  }

  async function toggleComments(shareId: string) {
    const nextOpen = !openComments[shareId];
    setOpenComments((current) => ({ ...current, [shareId]: nextOpen }));
    if (!nextOpen || commentsByShare[shareId]) return;
    const { data, error: commentsError } = await supabase.rpc("get_group_comments", {
      p_group_id: selectedId,
      p_share_id: shareId,
    });
    if (commentsError) setError(`Kommentare konnten nicht geladen werden: ${commentsError.message}`);
    else setCommentsByShare((current) => ({ ...current, [shareId]: (data ?? []) as GroupComment[] }));
  }

  async function addComment(shareId: string) {
    const body = commentDrafts[shareId]?.trim();
    if (!body || !selectedId || commentSaving) return;
    setCommentSaving(shareId);
    const { error: commentError } = await supabase.rpc("add_group_comment", {
      p_group_id: selectedId,
      p_share_id: shareId,
      p_body: body,
    });
    if (commentError) setError(`Kommentar konnte nicht gespeichert werden: ${commentError.message}`);
    else {
      setCommentDrafts((current) => ({ ...current, [shareId]: "" }));
      const { data } = await supabase.rpc("get_group_comments", { p_group_id: selectedId, p_share_id: shareId });
      setCommentsByShare((current) => ({ ...current, [shareId]: (data ?? []) as GroupComment[] }));
    }
    setCommentSaving("");
  }

  const activeInvite = useMemo(() => invites.find((invite) => !invite.revoked_at), [invites]);

  if (loading) return <main className="min-h-screen bg-[#090b10] p-8 text-white">Gruppen werden geladen ...</main>;

  return (
    <main className="min-h-screen bg-[#090b10] px-4 py-6 text-white sm:px-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <button onClick={() => router.push("/dashboard")} className="text-xl font-black tracking-tight">GYM<span className="text-lime-400">BATTLE</span></button>
          <nav className="flex items-center gap-2 text-sm">
            <button onClick={() => router.push("/dashboard")} className="rounded-xl px-3 py-2 text-gray-400 hover:bg-white/5 hover:text-white">Dashboard</button>
            <button onClick={() => router.push("/training")} className="rounded-xl bg-lime-400 px-3 py-2 font-bold text-black">Training starten</button>
          </nav>
        </header>

        <section className="flex flex-col justify-between gap-5 py-9 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">Gemeinsam stärker</p><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Deine Crews.</h1><p className="mt-3 max-w-xl text-gray-400">Teile abgeschlossene Trainings, bleib sichtbar am Ball und motiviere deine Leute ohne öffentlichen Druck.</p></div>
          <button onClick={() => setShowCreate(true)} className="rounded-xl bg-lime-400 px-5 py-3 font-bold text-black hover:bg-lime-300">+ Gruppe erstellen</button>
        </section>

        {message && <p className="mb-5 rounded-xl border border-lime-400/20 bg-lime-400/10 p-4 text-sm text-lime-200">{message}</p>}
        {error && <p className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}

        {groups.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/15 bg-[#11141c] p-8 text-center sm:p-14"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-400/10 text-3xl">+</div><h2 className="mt-5 text-2xl font-black">Noch keine Gruppe</h2><p className="mx-auto mt-2 max-w-md text-gray-400">Erstelle deine erste Crew und verschicke anschließend einen privaten Einladungslink.</p><button onClick={() => setShowCreate(true)} className="mt-6 rounded-xl bg-lime-400 px-5 py-3 font-bold text-black">Erste Gruppe erstellen</button></section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-[#11141c] p-4"><p className="text-xs font-bold uppercase tracking-widest text-gray-500">Meine Gruppen</p><div className="mt-3 space-y-2">{groups.map((group) => <button key={group.id} onClick={() => { setSelectedId(group.id); setWeekOffset(0); setInviteLink(""); }} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === group.id ? "border-lime-400/50 bg-lime-400/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"}`}><div className="flex items-center justify-between gap-3"><span className="font-bold">{group.name}</span><span className="text-xs text-gray-500">{group.member_count}</span></div><p className="mt-1 truncate text-xs text-gray-500">{group.description || "Private Trainingscrew"}</p></button>)}</div></div>
              <div className="rounded-2xl border border-white/10 bg-[#11141c] p-4"><p className="text-xs font-bold uppercase tracking-widest text-gray-500">Dein nächster Schritt</p><p className="mt-3 font-bold">Training protokollieren</p><p className="mt-1 text-sm text-gray-400">Teile es danach mit deiner Gruppe und sammle deinen Wochenpunkt.</p><button onClick={() => router.push("/training")} className="mt-4 text-sm font-bold text-lime-400">Training starten →</button></div>
            </aside>

            {detailLoading || !overview ? <section className="rounded-2xl border border-white/10 bg-[#11141c] p-8 text-gray-400">Gruppendaten werden geladen ...</section> : <section className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-widest text-lime-400">Private Crew</p><h2 className="mt-2 text-3xl font-black">{overview.name}</h2><p className="mt-2 max-w-2xl text-gray-400">{overview.description || "Trainiert zusammen, bleibt konstant und feiert jeden Trainingstag."}</p></div><button onClick={leaveGroup} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-400 hover:border-red-400/40 hover:text-red-300">Gruppe verlassen</button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white/[0.04] p-4"><p className="text-sm text-gray-500">Mitglieder</p><p className="mt-1 text-2xl font-black">{overview.member_count}</p></div><div className="rounded-xl bg-white/[0.04] p-4"><p className="text-sm text-gray-500">Deine Rolle</p><p className="mt-1 text-2xl font-black capitalize">{overview.my_role}</p></div><div className="rounded-xl bg-lime-400/10 p-4"><p className="text-sm text-gray-500">Woche</p><p className="mt-1 text-2xl font-black text-lime-400">{leaderboard.reduce((sum, row) => sum + row.points, 0)} Punkte</p></div></div></div>

              {challenge && <article className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.06] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-lime-400">Wochen-Challenge</p><h3 className="mt-2 text-2xl font-black">Gemeinsam konstant bleiben</h3><p className="mt-1 text-sm text-gray-400">Ziel: {challenge.target_per_member} Trainingstage pro Mitglied diese Woche.</p></div><strong className="text-3xl text-lime-400">{challenge.progress_percent}%</strong></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-lime-400 transition-all" style={{ width: `${Math.min(challenge.progress_percent, 100)}%` }} /></div><div className="mt-3 flex justify-between text-xs text-gray-500"><span>{challenge.members_at_goal} von {challenge.active_members} Mitgliedern am Ziel</span><span>{challenge.completed ? "Challenge geschafft" : "Noch nicht geschafft"}</span></div></article>}

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><article className="rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Wochenrangliste</h3><p className="mt-1 text-sm text-gray-400">Ein Trainingstag zählt. Nicht das schwerste Gewicht.</p></div><div className="flex gap-1"><button onClick={() => setWeekOffset(-1)} className={`rounded-lg px-3 py-2 text-xs ${weekOffset === -1 ? "bg-lime-400 text-black" : "bg-white/5 text-gray-400"}`}>Letzte Woche</button><button onClick={() => setWeekOffset(0)} className={`rounded-lg px-3 py-2 text-xs ${weekOffset === 0 ? "bg-lime-400 text-black" : "bg-white/5 text-gray-400"}`}>Diese Woche</button></div></div><div className="mt-5 space-y-2">{leaderboard.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">Noch keine geteilten Trainings in dieser Woche.</p> : leaderboard.map((row, index) => <div key={row.user_id} className={`flex items-center gap-3 rounded-xl p-3 ${index === 0 ? "bg-lime-400/10" : "bg-white/[0.03]"}`}><span className="w-7 text-center text-sm font-black text-gray-500">{row.rank}.</span><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{initials(row.display_name)}</span><span className="min-w-0 flex-1 truncate font-semibold">{row.display_name}</span><span className="text-right"><strong className="block text-lime-400">{row.points} P</strong><small className="text-gray-500">{row.workout_days} Tage</small></span></div>)}</div></article>

                <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">Crew einladen</h3><p className="mt-1 text-sm text-gray-400">Der Link ist 7 Tage gültig und einmal verwendbar.</p></div><span className="rounded-lg bg-lime-400/10 px-2 py-1 text-xs font-bold text-lime-400">Privat</span></div><button onClick={createInvite} disabled={saving} className="mt-5 w-full rounded-xl bg-lime-400 px-4 py-3 font-bold text-black disabled:opacity-50">{saving ? "Wird erstellt ..." : "Einladungslink erstellen"}</button>{inviteLink && <div className="mt-4"><label className="text-xs text-gray-500">Link zum Teilen</label><textarea readOnly value={inviteLink} className="mt-2 h-20 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-gray-300" /></div>}{activeInvite && <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-gray-500">Aktiver Link bis {formatDate(activeInvite.expires_at)} · {activeInvite.use_count}/1 verwendet</p><button onClick={() => void revokeInvite(activeInvite.invite_id)} className="text-xs font-semibold text-red-300 hover:text-red-200">Widerrufen</button></div>}</article></div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
                <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black">Crew-Aktivität</h3>
                      <p className="mt-1 text-sm text-gray-400">Geteilte Trainings aus deiner Gruppe</p>
                    </div>
                    <button onClick={() => void loadGroup(selectedId, weekOffset)} className="text-sm font-bold text-lime-400">Aktualisieren</button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {feed.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">Noch keine Aktivität. Teile dein erstes Training.</p>
                    ) : feed.map((item) => (
                      <div key={item.share_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-400/15 text-xs font-bold text-lime-300">{initials(item.display_name)}</span>
                          <div className="min-w-0 flex-1">
                            <p><strong>{item.display_name}</strong> hat <strong>{item.workout_name}</strong> geteilt.</p>
                            <p className="mt-1 text-xs text-gray-500">{formatDateTime(item.shared_at)} · {item.exercise_count} Übungen · {item.set_count} Sätze · {Math.round(item.total_volume || 0).toLocaleString("de-DE")} kg Volumen</p>
                            {item.shared_by === currentUserId && <button onClick={() => void unshareWorkout(item.share_id)} className="mt-2 text-xs font-semibold text-red-300 hover:text-red-200">Nicht mehr teilen</button>}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(["strong", "clap", "fire"] as const).map((reaction) => (
                            <button key={reaction} onClick={() => void toggleReaction(item, reaction)} className={`rounded-lg border px-3 py-2 text-xs ${item.my_reaction === reaction ? "border-lime-400/50 bg-lime-400/10 text-lime-300" : "border-white/10 text-gray-400"}`}>
                              {reaction === "strong" ? "Stark" : reaction === "clap" ? "Applaus" : "Starkes Training"}{item.reaction_counts?.[reaction] ? ` · ${item.reaction_counts[reaction]}` : ""}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => void toggleComments(item.share_id)} className="mt-3 text-xs font-semibold text-gray-400 hover:text-white">{openComments[item.share_id] ? "Kommentare schließen" : "Kommentare anzeigen"}</button>
                        {openComments[item.share_id] && (
                          <div className="mt-3 border-t border-white/10 pt-3">
                            <div className="space-y-2">
                              {(commentsByShare[item.share_id] ?? []).map((comment) => (
                                <div key={comment.comment_id} className="rounded-lg bg-black/20 p-3 text-sm">
                                  <p><strong>{comment.display_name}</strong> <span className="text-gray-500">· {formatDateTime(comment.created_at)}</span></p>
                                  <p className="mt-1 text-gray-300">{comment.body}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                              <input value={commentDrafts[item.share_id] ?? ""} maxLength={500} onChange={(event) => setCommentDrafts((current) => ({ ...current, [item.share_id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void addComment(item.share_id); } }} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-lime-400" placeholder="Kurze Nachricht ..." />
                              <button onClick={() => void addComment(item.share_id)} disabled={commentSaving === item.share_id || !(commentDrafts[item.share_id] ?? "").trim()} className="rounded-lg bg-lime-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-50">Senden</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6"><h3 className="text-xl font-black">Mitglieder</h3><p className="mt-1 text-sm text-gray-400">Wer ist dabei?</p><div className="mt-5 space-y-2">{members.map((member) => <div key={member.user_id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{initials(member.display_name)}</span><span className="min-w-0 flex-1 truncate font-semibold">{member.display_name}</span><span className="text-xs capitalize text-gray-500">{member.role}</span></div>)}</div></article></div>
            </section>}
          </div>
        )}
      </div>

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><form onSubmit={createGroup} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11141c] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">Neue Gruppe</h2><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-3 py-1 text-gray-400 hover:bg-white/10">✕</button></div><p className="mt-2 text-sm text-gray-400">Eine private Crew für eure gemeinsamen Trainingstage.</p><label className="mt-6 block text-sm text-gray-300">Gruppenname<input required minLength={2} maxLength={80} value={groupName} onChange={(event) => setGroupName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:border-lime-400" placeholder="z. B. Push Crew" /></label><label className="mt-4 block text-sm text-gray-300">Beschreibung <span className="text-gray-500">(optional)</span><textarea maxLength={300} value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} className="mt-2 h-24 w-full resize-none rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:border-lime-400" placeholder="Wofür trainiert ihr zusammen?" /></label><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-white/15 px-4 py-3 font-semibold text-gray-300">Abbrechen</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-lime-400 px-4 py-3 font-bold text-black disabled:opacity-50">{saving ? "Erstellt ..." : "Gruppe erstellen"}</button></div></form></div>}
    </main>
  );
}
