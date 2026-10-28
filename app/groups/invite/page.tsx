"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../../src/components/AppShell";
import { supabase } from "../../../src/lib/supabase";

type InvitePreview = {
  group_id: string;
  group_name: string;
  inviter_name: string;
  member_count: number;
  expires_at: string;
};

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function GroupInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tokenHash, setTokenHash] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadInvite() {
      const currentToken = new URLSearchParams(window.location.search).get("token") ?? "";
      setToken(currentToken);
      if (!/^[0-9a-f]{64}$/i.test(currentToken)) {
        setError("Dieser Einladungslink ist ungültig, abgelaufen oder wurde bereits verwendet.");
        setLoading(false);
        return;
      }
      try {
        const [hash, sessionResult] = await Promise.all([
          sha256Hex(currentToken.toLowerCase()),
          supabase.auth.getSession(),
        ]);
        if (!active) return;
        setTokenHash(hash);
        setSignedIn(Boolean(sessionResult.data.session));
        const { data, error: previewError } = await supabase.rpc("get_group_invite_preview", { p_token_hash: hash });
        if (!active) return;
        const item = (data?.[0] as InvitePreview | undefined) ?? null;
        if (previewError || !item) {
          setError("Dieser Einladungslink ist ungültig, abgelaufen oder wurde bereits verwendet.");
        } else {
          setPreview(item);
        }
      } catch {
        if (active) setError("Der Einladungslink konnte nicht geprüft werden. Prüfe deine Verbindung und öffne den Link erneut.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInvite();
    return () => { active = false; };
  }, []);

  async function joinGroup() {
    if (!tokenHash || joining) return;
    setJoining(true);
    setError("");
    if (!signedIn) {
      router.push(`/?returnTo=${encodeURIComponent(`/groups/invite?token=${token}`)}`);
      return;
    }
    const { data, error: joinError } = await supabase.rpc("accept_group_invite", { p_token_hash: tokenHash });
    setJoining(false);
    if (joinError || !data) {
      setError("Der Beitritt ist nicht möglich. Der Link könnte abgelaufen, widerrufen oder bereits verwendet worden sein.");
      return;
    }
    router.replace(`/groups/${data}`);
  }

  return (
    <AppShell>
      <main className="min-h-[calc(100vh-6rem)] px-4 py-10 text-white sm:px-6">
        <section className="glass-panel mx-auto w-full max-w-xl rounded-[26px] p-6 sm:p-8">
          <Link href="/groups" className="text-xs text-white/42 underline underline-offset-4">← Zu deinen Gruppen</Link>
          <div className="mt-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Private Einladung</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Einer Trainingscrew beitreten</h1>
          </div>

          {loading ? <p className="mt-6 text-sm text-white/45" aria-live="polite">Einladung wird geprüft …</p> : error ? <div role="alert" className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[0.05] p-4 text-sm leading-6 text-red-100/85">{error}<button type="button" onClick={() => window.location.reload()} className="ml-2 font-semibold underline underline-offset-4">Erneut prüfen</button></div> : preview ? <>
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/15 p-5">
              <h2 className="break-words text-xl font-semibold">{preview.group_name}</h2>
              <p className="mt-2 text-sm text-white/55">Einladung von {preview.inviter_name}</p>
              <p className="mt-1 text-xs text-white/38">Etwa {preview.member_count} {preview.member_count === 1 ? "Mitglied" : "Mitglieder"} · gültig bis {new Date(preview.expires_at).toLocaleDateString("de-DE")}</p>
            </div>
            <p className="mt-4 text-xs leading-5 text-white/45">Vor dem Beitritt werden keine Gruppenposts oder Trainings angezeigt. Nach deiner Bestätigung sehen Mitglieder nur Trainings, die ihre Besitzer ausdrücklich für diese Gruppe freigegeben haben.</p>
            <button type="button" onClick={() => void joinGroup()} disabled={joining} className="primary-button mt-6 w-full px-5 py-3 text-sm">{joining ? "Einen Moment …" : signedIn ? "Einladung annehmen und beitreten" : "Anmelden oder Konto erstellen"}</button>
            {!signedIn && <p className="mt-3 text-center text-[11px] leading-5 text-white/38">Nach der Anmeldung kehrst du zu dieser Einladung zurück und bestätigst den Beitritt dort.</p>}
          </> : null}
        </section>
      </main>
    </AppShell>
  );
}
