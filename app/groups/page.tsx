"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../src/components/AppShell";
import { supabase } from "../../src/lib/supabase";

type GymGroup = {
  id: string;
  name: string;
  description: string | null;
  timezone: string;
  member_count: number;
  created_at: string;
};

export default function GroupsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [groups, setGroups] = useState<GymGroup[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [profileInput, setProfileInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("Europe/Berlin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      router.replace(`/?returnTo=${encodeURIComponent("/groups")}`);
      return;
    }
    setUserId(sessionData.session.user.id);
    const [groupsResult, profileResult] = await Promise.all([
      supabase.rpc("get_my_groups"),
      supabase.rpc("get_my_profile"),
    ]);
    if (groupsResult.error) {
      setError("Deine Gruppen konnten nicht geladen werden. Prüfe, ob die Community-Migration auf dem Supabase-Projekt installiert ist, und versuche es erneut.");
    } else {
      setGroups((groupsResult.data ?? []) as GymGroup[]);
    }
    if (!profileResult.error) {
      const nameFromProfile = (profileResult.data?.[0] as { display_name?: string } | undefined)?.display_name ?? "";
      setDisplayName(nameFromProfile);
      setProfileInput(nameFromProfile);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTimezone) setTimezone(browserTimezone);
      } catch {
        // Use the German product default if the browser does not expose an IANA timezone.
      }
      void loadGroups();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadGroups]);

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    try {
      new Intl.DateTimeFormat("de-DE", { timeZone: timezone }).format(new Date());
    } catch {
      setError("Bitte gib eine gültige Zeitzone ein, zum Beispiel Europe/Berlin.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const { data, error: createError } = await supabase.rpc("create_private_group", {
      p_name: name.trim(),
      p_description: description.trim() || null,
      p_timezone: timezone,
    });
    setSaving(false);
    if (createError) {
      const errorText = `${createError.code ?? ""} ${createError.message ?? ""}`.toLowerCase();
      if (/pgrst202|schema cache|could not find the function|create_private_group.*does not exist/.test(errorText)) {
        setError("Die Gruppenfunktionen fehlen in Supabase noch. Die Community-Migration muss zuerst im verbundenen Projekt installiert werden.");
      } else if (/invalid_group_timezone|time zone|timezone/.test(errorText)) {
        setError("Supabase hat die Zeitzone abgelehnt. Verwende einen gültigen IANA-Namen, zum Beispiel Europe/Berlin.");
      } else if (/42501|authentication_required|permission denied/.test(errorText)) {
        setError("Deine Anmeldung ist abgelaufen oder hat keine Berechtigung. Bitte melde dich erneut an.");
      } else if (/fetch|network|enotfound|failed to reach|dns/.test(errorText)) {
        setError("Supabase ist nicht erreichbar oder diese Vorschau ist nicht mit einem echten Projekt verbunden. Prüfe die Hosting-Verbindung.");
      } else {
        setError(`Die Gruppe konnte nicht erstellt werden (Supabase-Code ${createError.code || "unbekannt"}). Prüfe die Projektmigration und versuche es erneut.`);
      }
      return;
    }
    if (!data) {
      setError("Supabase hat keine Gruppen-ID zurückgegeben. Bitte lade die Seite neu.");
      return;
    }
    router.push(`/groups/${data}`);
  }

  async function saveDisplayName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || profileInput.trim().length < 2) return;
    setSaving(true);
    setError("");
    setMessage("");
    const { data, error: profileError } = await supabase.rpc("set_my_display_name", {
      p_display_name: profileInput.trim(),
    });
    setSaving(false);
    if (profileError || !data) {
      setError("Der Anzeigename konnte nicht gespeichert werden. Verwende 2 bis 40 Zeichen.");
      return;
    }
    setDisplayName(String(data));
    setProfileInput(String(data));
    setMessage("Anzeigename gespeichert.");
  }

  return (
    <AppShell>
      <main className="min-h-screen px-4 py-7 text-white sm:px-6 md:px-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/42">Gemeinsam trainieren</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Deine Gruppen</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/48">Private Crews für geteilte Trainings und faire Wochenziele. Nichts wird geteilt, bevor du es auswählst.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/55">{groups.length} {groups.length === 1 ? "Gruppe" : "Gruppen"}</span>
          </header>

          {error && <div role="alert" className="glass-soft mb-4 rounded-2xl border-red-300/20 px-4 py-3 text-sm text-red-100/85">{error}<button type="button" onClick={() => void loadGroups()} className="ml-3 font-semibold underline underline-offset-4">Erneut laden</button></div>}
          {message && <p role="status" className="glass-soft mb-4 rounded-2xl px-4 py-3 text-sm text-white/72">{message}</p>}

          <section aria-labelledby="my-groups-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="my-groups-title" className="text-lg font-semibold">Mitgliedschaften</h2>
              <button type="button" onClick={() => void loadGroups()} className="text-xs text-white/50 underline underline-offset-4">Aktualisieren</button>
            </div>
            {loading ? (
              <div className="glass-soft rounded-[22px] p-6 text-sm text-white/45" aria-live="polite">Gruppen werden geladen …</div>
            ) : groups.length === 0 ? (
              <div className="glass-panel rounded-[22px] p-6 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Noch keine Crew</p>
                <h3 className="mt-2 text-xl font-semibold">Starte mit einer privaten Gruppe.</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/48">Erstelle eine Gruppe und teile anschließend einen einmaligen Einladungslink. Deine bisherigen Trainings bleiben privat.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`} className="glass-panel rounded-[22px] p-5 transition hover:border-white/20 hover:bg-white/[0.065] focus-visible:outline-offset-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold">{group.name}</h3>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-white/48">{group.description || "Private Trainingscrew"}</p>
                      </div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-sm font-semibold text-white/70" aria-hidden="true">{group.name.slice(0, 1).toLocaleUpperCase("de-DE")}</span>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs text-white/45">
                      <span>{group.member_count} {group.member_count === 1 ? "Mitglied" : "Mitglieder"}</span>
                      <span>{group.timezone}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <section className="glass-panel rounded-[22px] p-5 sm:p-6" aria-labelledby="create-group-title">
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Neue Crew</p>
              <h2 id="create-group-title" className="mt-2 text-xl font-semibold">Gruppe erstellen</h2>
              <form className="mt-5 space-y-3" onSubmit={(event) => void createGroup(event)}>
                <label className="block text-xs font-medium text-white/65">Gruppenname
                  <input className="app-input mt-2 w-full px-4 text-sm" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="z. B. Frühstarter Crew" />
                </label>
                <label className="block text-xs font-medium text-white/65">Beschreibung <span className="text-white/35">(optional)</span>
                  <textarea className="app-input mt-2 min-h-24 w-full resize-y px-4 py-3 text-sm" maxLength={280} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Was verbindet eure Crew?" />
                </label>
                <label className="block text-xs font-medium text-white/65">Gruppenzeitzone
                  <input className="app-input mt-2 w-full px-4 text-sm" required maxLength={80} value={timezone} onChange={(event) => setTimezone(event.target.value)} aria-describedby="timezone-help" />
                  <span id="timezone-help" className="mt-1 block text-[11px] text-white/35">IANA-Zone des Browsers vorausgefüllt; sie steuert den Wochenbeginn der Rangliste.</span>
                </label>
                <button type="submit" disabled={saving || name.trim().length < 2} className="primary-button w-full px-5 py-3 text-sm">{saving ? "Wird erstellt …" : "Private Gruppe erstellen"}</button>
              </form>
            </section>

            <section className="glass-soft h-fit rounded-[22px] p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Dein Profil in der Crew</p>
              <h2 className="mt-2 text-lg font-semibold">Anzeigename</h2>
              <p className="mt-2 text-sm leading-6 text-white/48">Nur Mitglieder deiner gemeinsamen Gruppe sehen diesen Namen. Deine E-Mail-Adresse wird nicht im Feed oder in der Rangliste angezeigt.</p>
              <form className="mt-4 space-y-3" onSubmit={(event) => void saveDisplayName(event)}>
                <label className="block text-xs font-medium text-white/65">Anzeigename
                  <input className="app-input mt-2 w-full px-4 text-sm" required minLength={2} maxLength={40} value={profileInput} onChange={(event) => setProfileInput(event.target.value)} placeholder={displayName || "Dein Name in der Crew"} />
                </label>
                <button type="submit" disabled={saving || profileInput.trim().length < 2 || profileInput.trim() === displayName} className="secondary-button w-full px-4 py-3 text-sm">Anzeigename speichern</button>
              </form>
              {userId && <p className="mt-4 text-[10px] text-white/25">Deine Gruppen sind privat und nicht öffentlich durchsuchbar.</p>}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
