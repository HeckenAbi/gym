"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "../../../src/components/AppShell";
import { supabase } from "../../../src/lib/supabase";

type GroupOverview = {
  id: string;
  name: string;
  description: string | null;
  timezone: string;
  created_at: string;
  member_count: number;
  my_role: "owner" | "admin" | "member";
};

type GroupMember = {
  user_id: string;
  display_name: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
};

type GroupInvite = {
  invite_id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  use_count: number;
};

type FeedExercise = {
  name: string;
  sets: Array<{ weight: number | string | null; reps: number | string | null }>;
};

type FeedItem = {
  share_id: string;
  workout_id: string;
  shared_by: string;
  display_name: string;
  workout_name: string;
  finished_at: string;
  shared_at: string;
  counts_for_points: boolean;
  exercise_count: number;
  set_count: number;
  total_volume: number | string;
  details: FeedExercise[];
  reaction_counts: Record<string, number>;
  my_reaction: string | null;
};

type Comment = {
  comment_id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
};

type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  points: number;
  workout_days: number;
  week_start: string;
  timezone: string;
};

type SeasonLeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  points: number;
  workout_days: number;
  weeks_counted: number;
  season_start: string;
  season_end: string;
  timezone: string;
};

type WeeklyChallenge = {
  week_start: string;
  timezone: string;
  active_members: number;
  members_at_goal: number;
  target_per_member: number;
  completed: boolean;
  progress_percent: number;
};

type TabName = "feed" | "leaderboard" | "members";
type ReactionName = "strong" | "clap" | "fire";

function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function GroupDetailsContent() {
  const params = useParams<{ id: string }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [group, setGroup] = useState<GroupOverview | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<SeasonLeaderboardRow[]>([]);
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge | null>(null);
  const [leaderboardMode, setLeaderboardMode] = useState<"week" | "season">("week");
  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);
  const [seasonOffset, setSeasonOffset] = useState<0 | 1>(0);
  const [tab, setTab] = useState<TabName>("feed");
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentsByShare, setCommentsByShare] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postingShare, setPostingShare] = useState<string | null>(null);
  const [reactionBusy, setReactionBusy] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [adminActionBusy, setAdminActionBusy] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");
  const leaderboardRequestId = useRef(0);

  const loadOverview = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError("");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      router.replace("/");
      return;
    }
    setUserId(sessionData.session.user.id);
    const [overviewResult, membersResult, invitesResult] = await Promise.all([
      supabase.rpc("get_group_overview", { p_group_id: groupId }),
      supabase.rpc("get_group_members", { p_group_id: groupId }),
      supabase.rpc("get_group_invites", { p_group_id: groupId }),
    ]);
    if (overviewResult.error || !overviewResult.data?.[0]) {
      setError("Diese Gruppe ist nicht verfügbar oder die Community-Migration fehlt. Private Gruppeninhalte werden nur Mitgliedern angezeigt.");
      setGroup(null);
      setMembers([]);
    } else {
      setGroup(overviewResult.data[0] as GroupOverview);
      setMembers((membersResult.data ?? []) as GroupMember[]);
      setInvites(invitesResult.error ? [] : (invitesResult.data ?? []) as GroupInvite[]);
      if (membersResult.error) setError("Die Mitgliederliste konnte gerade nicht geladen werden.");
    }
    setLoading(false);
  }, [groupId, router]);

  const loadFeed = useCallback(async () => {
    if (!groupId) return;
    setTabLoading(true);
    setError("");
    const { data, error: feedError } = await supabase.rpc("get_group_feed", { p_group_id: groupId, p_limit: 30 });
    if (feedError) setError("Der Gruppenfeed konnte nicht geladen werden. Bitte versuche es erneut.");
    else setFeed((data ?? []) as FeedItem[]);
    setTabLoading(false);
  }, [groupId]);

  const loadLeaderboard = useCallback(async (mode: "week" | "season", offset: 0 | 1) => {
    if (!groupId) return;
    const requestId = ++leaderboardRequestId.current;
    setTabLoading(true);
    setError("");
    if (mode === "week") {
      const [ranking, challenge] = await Promise.all([
        supabase.rpc("get_group_leaderboard", { p_group_id: groupId, p_week_offset: offset }),
        supabase.rpc("get_group_weekly_challenge", { p_group_id: groupId, p_week_offset: offset }),
      ]);
      if (requestId !== leaderboardRequestId.current) return;
      if (ranking.error) setError("Die Wochenrangliste konnte nicht geladen werden.");
      else setLeaderboard((ranking.data ?? []) as LeaderboardRow[]);
      if (challenge.error) setError("Das Crew-Ziel konnte nicht geladen werden.");
      else setWeeklyChallenge((challenge.data?.[0] ?? null) as WeeklyChallenge | null);
    } else {
      const { data, error: seasonError } = await supabase.rpc("get_group_season_leaderboard", {
        p_group_id: groupId,
        p_season_offset: offset,
      });
      if (requestId !== leaderboardRequestId.current) return;
      if (seasonError) setError("Die Saisonrangliste konnte nicht geladen werden.");
      else setSeasonLeaderboard((data ?? []) as SeasonLeaderboardRow[]);
    }
    setTabLoading(false);
  }, [groupId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOverview(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOverview]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!group) return;
    const timer = window.setTimeout(() => {
      if (tab === "feed") void loadFeed();
      if (tab === "leaderboard") void loadLeaderboard(leaderboardMode, leaderboardMode === "week" ? weekOffset : seasonOffset);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      leaderboardRequestId.current += 1;
    };
  }, [group, tab, leaderboardMode, weekOffset, seasonOffset, loadFeed, loadLeaderboard]);

  const weekLabel = useMemo(() => {
    const start = leaderboard[0]?.week_start;
    if (!start) return "";
    const startDate = new Date(`${start}T12:00:00`);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return `${startDate.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} – ${endDate.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [leaderboard]);

  const seasonLabel = useMemo(() => {
    const start = seasonLeaderboard[0]?.season_start;
    const end = seasonLeaderboard[0]?.season_end;
    if (!start || !end) return "Vier-Wochen-Saison";
    const format = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    return `${format(start)} – ${new Date(`${end}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [seasonLeaderboard]);

  async function createInvite() {
    if (!group || inviteBusy || !["owner", "admin"].includes(group.my_role)) return;
    setInviteBusy(true);
    setError("");
    setMessage("");
    try {
      const token = makeToken();
      const tokenHash = await sha256Hex(token);
      const { data, error: inviteError } = await supabase.rpc("create_group_invite", {
        p_group_id: group.id,
        p_token_hash: tokenHash,
      });
      if (inviteError) throw inviteError;
      const createdInvite = (data?.[0] as { invite_id: string; expires_at: string } | undefined);
      if (createdInvite) {
        setInvites((current) => [{ invite_id: createdInvite.invite_id, created_at: new Date().toISOString(), expires_at: createdInvite.expires_at, revoked_at: null, use_count: 0 }, ...current].slice(0, 20));
      }
      const link = `${window.location.origin}/groups/invite?token=${encodeURIComponent(token)}`;
      setInviteLink(link);
      setMessage("Ein einmaliger Einladungslink ist erstellt. Er läuft in sieben Tagen ab; der Roh-Token wird nicht in der Datenbank gespeichert.");
    } catch {
      setError("Der Einladungslink konnte nicht erstellt werden. Prüfe deine Gruppenrolle und Verbindung.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage("Einladungslink in die Zwischenablage kopiert.");
    } catch {
      setMessage("Kopieren war nicht möglich. Markiere den Einladungslink und kopiere ihn manuell.");
    }
  }

  async function showComments(item: FeedItem) {
    if (openComments === item.share_id) {
      setOpenComments(null);
      return;
    }
    setOpenComments(item.share_id);
    setCommentsLoading((current) => ({ ...current, [item.share_id]: true }));
    const { data, error: commentsError } = await supabase.rpc("get_group_comments", {
      p_group_id: groupId,
      p_share_id: item.share_id,
    });
    setCommentsLoading((current) => ({ ...current, [item.share_id]: false }));
    if (commentsError) {
      setError("Kommentare konnten nicht geladen werden.");
      return;
    }
    setCommentsByShare((current) => ({ ...current, [item.share_id]: (data ?? []) as Comment[] }));
  }

  async function postComment(item: FeedItem) {
    const body = (commentDrafts[item.share_id] ?? "").trim();
    if (!body || postingShare) return;
    setPostingShare(item.share_id);
    setError("");
    const { error: postError } = await supabase.rpc("add_group_comment", {
      p_group_id: groupId,
      p_share_id: item.share_id,
      p_body: body,
    });
    setPostingShare(null);
    if (postError) {
      setError("Kommentar konnte nicht veröffentlicht werden. Er darf höchstens 500 Zeichen haben.");
      return;
    }
    setCommentDrafts((current) => ({ ...current, [item.share_id]: "" }));
    const { data } = await supabase.rpc("get_group_comments", { p_group_id: groupId, p_share_id: item.share_id });
    setCommentsByShare((current) => ({ ...current, [item.share_id]: (data ?? []) as Comment[] }));
  }

  async function toggleReaction(item: FeedItem, reaction: ReactionName) {
    if (reactionBusy) return;
    setReactionBusy(item.share_id);
    const { error: reactionError } = await supabase.rpc("toggle_group_reaction", {
      p_group_id: groupId,
      p_share_id: item.share_id,
      p_reaction: item.my_reaction === reaction ? null : reaction,
    });
    setReactionBusy(null);
    if (reactionError) setError("Reaktion konnte nicht gespeichert werden.");
    else await loadFeed();
  }

  async function unshare(item: FeedItem) {
    const pointNotice = item.counts_for_points ? " Der zugehörige Liga-Punkt wird ebenfalls entfernt." : "";
    if (!window.confirm(`Diese Einheit aus dem Gruppenfeed entfernen? Mitglieder verlieren danach auch den Zugriff auf Sätze und Kommentare.${pointNotice}`)) return;
    const { error: unshareError } = await supabase.rpc("unshare_finished_workout", { p_share_id: item.share_id });
    if (unshareError) setError("Freigabe konnte nicht zurückgezogen werden.");
    else {
      setMessage("Training ist wieder privat.");
      await loadFeed();
    }
  }

  async function leaveGroup() {
    if (!group || group.my_role === "owner" || leaving) return;
    if (!window.confirm(`Möchtest du „${group.name}“ wirklich verlassen? Du verlierst den Zugriff auf Feed und Rangliste.`)) return;
    setLeaving(true);
    const { error: leaveError } = await supabase.rpc("leave_group", { p_group_id: group.id });
    if (leaveError) {
      setError("Du konntest die Gruppe nicht verlassen. Ein Owner muss die Inhaberschaft zuerst übertragen.");
      setLeaving(false);
      return;
    }
    router.replace("/groups");
  }

  async function revokeInvite(invite: GroupInvite) {
    if (adminActionBusy) return;
    setAdminActionBusy(true);
    const { error: revokeError } = await supabase.rpc("revoke_group_invite", { p_invite_id: invite.invite_id });
    setAdminActionBusy(false);
    if (revokeError) setError("Einladung konnte nicht widerrufen werden.");
    else {
      setInvites((current) => current.map((item) => item.invite_id === invite.invite_id ? { ...item, revoked_at: new Date().toISOString() } : item));
      setMessage("Einladungslink widerrufen.");
    }
  }

  async function transferOwnership() {
    if (!group || group.my_role !== "owner" || !newOwnerId || adminActionBusy) return;
    const candidate = members.find((member) => member.user_id === newOwnerId);
    if (!candidate || !window.confirm(`„${candidate.display_name}“ wird Owner. Du wirst Admin und kannst die Gruppe weiterhin verwalten. Fortfahren?`)) return;
    setAdminActionBusy(true);
    const { error: transferError } = await supabase.rpc("transfer_group_ownership", {
      p_group_id: group.id,
      p_new_owner_id: candidate.user_id,
    });
    setAdminActionBusy(false);
    if (transferError) {
      setError("Owner-Übergabe fehlgeschlagen. Prüfe, ob das Mitglied noch aktiv ist.");
      return;
    }
    setNewOwnerId("");
    setMessage(`Owner-Übergabe an ${candidate.display_name} abgeschlossen.`);
    await loadOverview();
  }

  async function archiveGroup() {
    if (!group || group.my_role !== "owner" || adminActionBusy) return;
    if (!window.confirm(`Gruppe „${group.name}“ archivieren? Mitglieder verlieren den Zugriff; bestehende Trainings und Beiträge werden nicht gelöscht.`)) return;
    setAdminActionBusy(true);
    const { error: archiveError } = await supabase.rpc("archive_group", { p_group_id: group.id });
    setAdminActionBusy(false);
    if (archiveError) {
      setError("Die Gruppe konnte nicht archiviert werden.");
      return;
    }
    router.replace("/groups");
  }

  if (loading) {
    return <AppShell><main className="min-h-screen p-6 text-sm text-white/50" aria-live="polite">Gruppe wird geladen …</main></AppShell>;
  }

  if (!group) {
    return <AppShell><main className="min-h-screen px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-3xl glass-panel rounded-[22px] p-6"><p role="alert" className="text-sm text-white/70">{error || "Diese Gruppe ist nicht verfügbar."}</p><Link href="/groups" className="secondary-button mt-5 px-4 py-2.5 text-sm">Zur Gruppenübersicht</Link></div></main></AppShell>;
  }

  return (
    <AppShell>
      <main className="min-h-screen px-4 py-7 text-white sm:px-6 md:px-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-5 border-b border-white/[0.08] pb-6">
            <Link href="/groups" className="text-xs text-white/42 underline underline-offset-4">← Alle Gruppen</Link>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Private Trainingscrew · {group.timezone}</p>
                <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{group.name}</h1>
                {group.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">{group.description}</p>}
                <p className="mt-3 text-xs text-white/42">{group.member_count} {group.member_count === 1 ? "Mitglied" : "Mitglieder"} · Deine Rolle: {group.my_role === "owner" ? "Owner" : group.my_role === "admin" ? "Admin" : "Mitglied"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.my_role === "owner" && <button type="button" onClick={() => void archiveGroup()} disabled={adminActionBusy} className="secondary-button px-4 py-2.5 text-xs text-white/65">Gruppe archivieren</button>}
                {group.my_role !== "owner" && <button type="button" onClick={() => void leaveGroup()} disabled={leaving} className="secondary-button px-4 py-2.5 text-xs text-white/65">{leaving ? "Wird verlassen …" : "Gruppe verlassen"}</button>}
              </div>
            </div>
          </header>

          {error && <div role="alert" className="glass-soft mb-3 rounded-xl border-red-300/20 px-4 py-3 text-sm text-red-100/85">{error}<button type="button" onClick={() => { if (tab === "feed") void loadFeed(); else if (tab === "leaderboard") void loadLeaderboard(leaderboardMode, leaderboardMode === "week" ? weekOffset : seasonOffset); else void loadOverview(); }} className="ml-2 underline underline-offset-4">Erneut laden</button></div>}
          {message && <p role="status" className="glass-soft mb-3 rounded-xl px-4 py-3 text-sm text-white/72">{message}</p>}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1.5" role="tablist" aria-label="Gruppenbereiche">
                {([ ["feed", "Feed"], ["leaderboard", "Rangliste"], ["members", "Mitglieder"] ] as const).map(([name, label]) => (
                  <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-medium transition ${tab === name ? "bg-white/[0.12] text-white" : "text-white/48 hover:bg-white/[0.05] hover:text-white/80"}`}>{label}</button>
                ))}
              </div>

              {tab === "feed" && (
                <section aria-label="Geteilte Trainings im Gruppenfeed" className="space-y-3">
                  {tabLoading ? <div className="glass-soft rounded-[22px] p-6 text-sm text-white/45" aria-live="polite">Feed wird geladen …</div> : feed.length === 0 ? (
                    <div className="glass-panel rounded-[22px] p-6 sm:p-8">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Noch kein Feed</p>
                      <h2 className="mt-2 text-xl font-semibold">Teile ein Training, wenn du bereit bist.</h2>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-white/48">Dein Trainingslog bleibt privat, bis du beim Abschluss diese Gruppe auswählst. Dann sehen Mitglieder die freigegebenen Übungen, Sätze, Gewichte, Wiederholungen und den Abschlusszeitpunkt.</p>
                      <Link href="/training" className="primary-button mt-5 px-5 py-3 text-sm">Training protokollieren</Link>
                    </div>
                  ) : feed.map((item) => (
                    <article key={item.share_id} className="glass-panel rounded-[22px] p-4 sm:p-5">
                      <header className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white/75" aria-hidden="true">{item.display_name.slice(0, 1).toLocaleUpperCase("de-DE")}</span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">{item.display_name}<span className="font-normal text-white/45"> hat ein Training geteilt</span></p>
                          <p className="mt-1 text-[11px] text-white/38">Abgeschlossen {formatDateTime(item.finished_at)}</p>
                        </div>
                        {item.shared_by === userId && <button type="button" onClick={() => void unshare(item)} className="rounded-lg px-2 py-1 text-[11px] text-white/38 underline underline-offset-4 hover:text-white/75">Privat machen</button>}
                      </header>
                      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h2 className="text-lg font-semibold">{item.workout_name}</h2>
                          <span className="text-[11px] text-white/38">{formatDateTime(item.shared_at)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/48">
                          <span>{item.exercise_count} {item.exercise_count === 1 ? "Übung" : "Übungen"}</span>
                          <span>{item.set_count} {item.set_count === 1 ? "Satz" : "Sätze"}</span>
                          <span>{new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Number(item.total_volume) || 0)} kg Gesamtvolumen</span>
                          <span className={item.counts_for_points ? "font-semibold text-white/75" : "text-white/35"}>{item.counts_for_points ? "+1 Liga-Punkt" : "Ohne Liga-Punkt"}</span>
                        </div>
                        {item.details?.length > 0 && <div className="mt-4 space-y-2">
                          {item.details.map((exercise, index) => (
                            <div key={`${item.share_id}-${index}`} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                              <p className="text-xs font-semibold text-white/78">{exercise.name}</p>
                              <p className="mt-1 break-words text-[11px] leading-5 text-white/45">{exercise.sets.map((set) => `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(Number(set.weight) || 0)} kg × ${Number(set.reps) || 0}`).join(" · ")}</p>
                            </div>
                          ))}
                        </div>}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2" aria-label="Reaktionen">
                        {([ ["strong", "Stark"], ["clap", "Applaus"], ["fire", "Feuer"] ] as const).map(([value, label]) => (
                          <button key={value} type="button" disabled={reactionBusy === item.share_id} onClick={() => void toggleReaction(item, value)} aria-pressed={item.my_reaction === value} className={`min-h-10 rounded-xl border px-3 text-xs transition ${item.my_reaction === value ? "border-white/25 bg-white/[0.11] text-white" : "border-white/[0.08] bg-white/[0.025] text-white/52 hover:bg-white/[0.07]"}`}>
                            {label} <span className="ml-1 tabular-nums">{Number(item.reaction_counts?.[value]) || 0}</span>
                          </button>
                        ))}
                        <button type="button" onClick={() => void showComments(item)} aria-expanded={openComments === item.share_id} className="min-h-10 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-xs text-white/52 hover:bg-white/[0.07]">{openComments === item.share_id ? "Kommentare schließen" : "Kommentare"}</button>
                      </div>

                      {openComments === item.share_id && <section className="mt-3 rounded-2xl border border-white/[0.08] bg-black/15 p-3" aria-label="Kommentare">
                        {commentsLoading[item.share_id] ? <p className="text-xs text-white/42">Kommentare werden geladen …</p> : (commentsByShare[item.share_id] ?? []).length === 0 ? <p className="text-xs text-white/42">Noch keine Kommentare.</p> : <ul className="space-y-3">
                          {(commentsByShare[item.share_id] ?? []).map((comment) => <li key={comment.comment_id} className="flex gap-2 text-xs">
                            <div className="min-w-0 flex-1"><p className="font-semibold text-white/72">{comment.display_name}<span className="ml-2 font-normal text-white/32">{formatDateTime(comment.created_at)}</span></p><p className="mt-1 whitespace-pre-wrap break-words leading-5 text-white/58">{comment.body}</p></div>
                            {(comment.user_id === userId || group.my_role === "owner" || group.my_role === "admin") && <button type="button" onClick={async () => { const { error: deleteError } = await supabase.rpc("delete_group_comment", { p_comment_id: comment.comment_id }); if (deleteError) setError("Kommentar konnte nicht entfernt werden."); else { const { data, error: reloadError } = await supabase.rpc("get_group_comments", { p_group_id: groupId, p_share_id: item.share_id }); if (reloadError) setError("Kommentar wurde entfernt, die Liste konnte aber nicht aktualisiert werden."); else setCommentsByShare((current) => ({ ...current, [item.share_id]: (data ?? []) as Comment[] })); } }} className="h-8 shrink-0 px-2 text-white/32 hover:text-white/75" aria-label="Kommentar entfernen">×</button>}
                          </li>)}
                        </ul>}
                        <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void postComment(item); }}>
                          <input className="app-input min-w-0 flex-1 px-3 text-xs" value={commentDrafts[item.share_id] ?? ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [item.share_id]: event.target.value }))} maxLength={500} placeholder="Unterstützenden Kommentar schreiben" aria-label="Kommentar verfassen" />
                          <button type="submit" disabled={!commentDrafts[item.share_id]?.trim() || postingShare === item.share_id} className="secondary-button px-3 text-xs">{postingShare === item.share_id ? "…" : "Senden"}</button>
                        </form>
                      </section>}
                    </article>
                  ))}
                </section>
              )}

              {tab === "leaderboard" && (
                <section className="glass-panel rounded-[22px] p-4 sm:p-6" aria-label="Gruppenrangliste">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Trainingskonstanz</p>
                      <h2 className="mt-2 text-xl font-semibold">{leaderboardMode === "week" ? "Wochenrangliste" : "Saisonrangliste"}</h2>
                      <p className="mt-1 text-xs text-white/42">{leaderboardMode === "week" ? weekLabel || "Gruppenwoche" : seasonLabel} · {group.timezone}</p>
                    </div>
                    <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-black/15 p-1" role="group" aria-label="Ranglistenzeitraum">
                      <button type="button" onClick={() => setLeaderboardMode("week")} aria-pressed={leaderboardMode === "week"} className={`min-h-9 rounded-lg px-3 text-xs ${leaderboardMode === "week" ? "bg-white/[0.12] text-white" : "text-white/45"}`}>Woche</button>
                      <button type="button" onClick={() => setLeaderboardMode("season")} aria-pressed={leaderboardMode === "season"} className={`min-h-9 rounded-lg px-3 text-xs ${leaderboardMode === "season" ? "bg-white/[0.12] text-white" : "text-white/45"}`}>Saison</button>
                    </div>
                  </header>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs leading-5 text-white/48">{leaderboardMode === "week" ? "+1 Punkt pro qualifiziertem Trainingstag. Kein Wochenlimit; mehrere Einheiten am selben Tag zählen einmal. Mindestens 3 gültige Sätze und 10 Wiederholungen. Private Trainings zählen nicht." : "Vier Wochen pro Saison; gewertet werden deine drei punktstärksten Wochen. Keine Punkte für Gewicht oder Volumen."}</p>
                    <div className="flex shrink-0 gap-1 rounded-xl border border-white/[0.08] bg-black/15 p-1">
                      {leaderboardMode === "week" ? <>
                        <button type="button" onClick={() => setWeekOffset(0)} aria-pressed={weekOffset === 0} className={`min-h-9 rounded-lg px-3 text-xs ${weekOffset === 0 ? "bg-white/[0.12] text-white" : "text-white/45"}`}>Diese Woche</button>
                        <button type="button" onClick={() => setWeekOffset(1)} aria-pressed={weekOffset === 1} className={`min-h-9 rounded-lg px-3 text-xs ${weekOffset === 1 ? "bg-white/[0.12] text-white" : "text-white/45"}`}>Vorwoche</button>
                      </> : <>
                        <button type="button" onClick={() => setSeasonOffset(0)} aria-pressed={seasonOffset === 0} className={`min-h-9 rounded-lg px-3 text-xs ${seasonOffset === 0 ? "bg-white/[0.12] text-white" : "text-white/45"}`}>Aktuelle Saison</button>
                        <button type="button" onClick={() => setSeasonOffset(1)} aria-pressed={seasonOffset === 1} className={`min-h-9 rounded-lg px-3 text-xs ${seasonOffset === 1 ? "bg-white/[0.12] text-white" : "text-white/45"}`}>Vorige Saison</button>
                      </>}
                    </div>
                  </div>

                  {leaderboardMode === "week" && weeklyChallenge && <section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4" aria-label="Gemeinsames Crew-Wochenziel">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Gemeinsames Crew-Ziel</p><h3 className="mt-1 text-sm font-semibold">2 qualifizierte Trainingstage pro Mitglied</h3></div>
                      {weeklyChallenge.completed && <span className="rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[10px] font-semibold text-white/75">Crewziel geschafft · Abzeichen</span>}
                    </div>
                    <p className="mt-2 text-xs text-white/48">{weeklyChallenge.active_members === 0 ? "Noch keine aktiven Mitglieder." : `${weeklyChallenge.members_at_goal} von ${weeklyChallenge.active_members} Mitgliedern haben ihr Teilziel erreicht.`} Das Abzeichen bringt keine zusätzlichen Einzelpunkte.</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-label="Fortschritt des Crew-Ziels" aria-valuemin={0} aria-valuemax={100} aria-valuenow={weeklyChallenge.progress_percent}>
                      <div className="h-full rounded-full bg-white/65 transition-[width] duration-300" style={{ width: `${weeklyChallenge.progress_percent}%` }} />
                    </div>
                  </section>}

                  {tabLoading ? <p className="py-8 text-center text-sm text-white/42" aria-live="polite">Rangliste wird berechnet …</p> : (leaderboardMode === "week" ? leaderboard : seasonLeaderboard).length === 0 ? <div className="py-8 text-center"><p className="text-sm text-white/55">Noch keine Mitglieder in der Rangliste.</p><Link href="/training" className="mt-3 inline-flex text-xs underline underline-offset-4">Training protokollieren</Link></div> : <ol className="mt-4 space-y-2">
                    {(leaderboardMode === "week" ? leaderboard : seasonLeaderboard).map((row) => <li key={row.user_id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-sm font-semibold tabular-nums text-white/72">{row.rank}</span>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xs font-semibold text-white/72" aria-hidden="true">{row.display_name.slice(0, 1).toLocaleUpperCase("de-DE")}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.display_name}{row.user_id === userId && <span className="ml-2 text-[10px] text-white/35">Du</span>}</span>
                      <span className="text-right"><span className="block text-sm font-semibold tabular-nums">{row.points} {row.points === 1 ? "Punkt" : "Punkte"}</span><span className="block text-[10px] text-white/38">{leaderboardMode === "week" ? `${row.workout_days} Trainingstage` : `${"weeks_counted" in row ? row.weeks_counted : 0} gewertete Wochen`}</span></span>
                    </li>)}
                  </ol>}
                </section>
              )}

              {tab === "members" && (
                <section className="glass-panel rounded-[22px] p-4 sm:p-6" aria-label="Gruppenmitglieder">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Crew</p><h2 className="mt-2 text-xl font-semibold">Mitglieder</h2></div><span className="text-xs text-white/42">{members.length} aktiv</span></div>
                  <ul className="mt-4 divide-y divide-white/[0.07]">
                    {members.map((member) => <li key={member.user_id} className="flex items-center gap-3 py-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-sm font-semibold text-white/70" aria-hidden="true">{member.display_name.slice(0, 1).toLocaleUpperCase("de-DE")}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{member.display_name}{member.user_id === userId && <span className="ml-2 text-[10px] text-white/35">Du</span>}</span><span className="mt-1 block text-[10px] text-white/38">Dabei seit {new Date(member.joined_at).toLocaleDateString("de-DE")}</span></span>
                      <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] text-white/45">{member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Mitglied"}</span>
                    </li>)}
                  </ul>
                  {group.my_role === "owner" && members.some((member) => member.user_id !== userId) && <div className="mt-5 border-t border-white/[0.08] pt-4">
                    <h3 className="text-sm font-semibold">Owner übertragen</h3>
                    <p className="mt-1 text-xs leading-5 text-white/42">Du wirst anschließend Admin und kannst die Gruppe weiterhin verwalten.</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <select aria-label="Neuen Owner auswählen" value={newOwnerId} onChange={(event) => setNewOwnerId(event.target.value)} className="app-input min-w-0 flex-1 px-3 text-xs"><option value="">Aktives Mitglied auswählen</option>{members.filter((member) => member.user_id !== userId).map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name} · {member.role === "admin" ? "Admin" : "Mitglied"}</option>)}</select>
                      <button type="button" disabled={!newOwnerId || adminActionBusy} onClick={() => void transferOwnership()} className="secondary-button px-4 py-2.5 text-xs">{adminActionBusy ? "Wird gespeichert …" : "Übergabe bestätigen"}</button>
                    </div>
                  </div>}
                </section>
              )}
            </div>

            <aside className="space-y-4">
              <section className="glass-panel h-fit rounded-[22px] p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Einladen</p>
                <h2 className="mt-2 text-lg font-semibold">Crew erweitern</h2>
                <p className="mt-2 text-xs leading-5 text-white/45">Ein Link ist einmal verwendbar, läuft nach sieben Tagen ab und kann nur nach Anmeldung bestätigt werden. Der Link wird nur nach deiner Aktion erstellt.</p>
                {group.my_role === "owner" || group.my_role === "admin" ? <button type="button" onClick={() => void createInvite()} disabled={inviteBusy} className="primary-button mt-4 w-full px-4 py-2.5 text-xs">{inviteBusy ? "Wird erstellt …" : "Einladungslink erstellen"}</button> : <p className="mt-4 rounded-xl border border-white/[0.07] px-3 py-2 text-xs text-white/38">Nur Owner und Admins können einladen.</p>}
                {inviteLink && <div className="mt-3 space-y-2"><label htmlFor="invite-link" className="block text-[11px] text-white/48">Einmaliger Link</label><textarea id="invite-link" readOnly rows={3} value={inviteLink} className="app-input w-full resize-y break-all px-3 py-2 text-[11px]"/><button type="button" onClick={() => void copyInvite()} className="secondary-button w-full px-3 py-2 text-xs">Link kopieren</button></div>}
                {(group.my_role === "owner" || group.my_role === "admin") && invites.length > 0 && <div className="mt-5 border-t border-white/[0.08] pt-4">
                  <h3 className="text-xs font-semibold text-white/65">Letzte Einladungen</h3>
                  <ul className="mt-2 space-y-2">{invites.map((invite) => {
                    const expired = currentTime !== null && Date.parse(invite.expires_at) <= currentTime;
                    const status = invite.revoked_at ? "Widerrufen" : Number(invite.use_count) > 0 ? "Verwendet" : expired ? "Abgelaufen" : "Aktiv";
                    return <li key={invite.invite_id} className="rounded-xl border border-white/[0.07] bg-black/10 p-3">
                      <div className="flex items-center justify-between gap-2"><span className="text-xs text-white/62">{status}</span><span className="text-[10px] text-white/35">bis {new Date(invite.expires_at).toLocaleDateString("de-DE")}</span></div>
                      {!invite.revoked_at && Number(invite.use_count) === 0 && !expired && <button type="button" disabled={adminActionBusy} onClick={() => void revokeInvite(invite)} className="mt-2 text-[11px] text-white/42 underline underline-offset-4">Einladung widerrufen</button>}
                    </li>;
                  })}</ul>
                </div>}
              </section>
              <section className="glass-soft rounded-[22px] p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Privatsphäre</p>
                <p className="mt-2 text-xs leading-5 text-white/48">Gruppen sind nicht öffentlich durchsuchbar. Trainings erscheinen nur nach deiner Freigabe und nur in dieser Gruppe. E-Mail-Adressen werden nicht im Feed angezeigt.</p>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

export default function GroupDetailsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#090a0c] p-6 text-sm text-white/45">Gruppe wird vorbereitet …</main>}><GroupDetailsContent /></Suspense>;
}
