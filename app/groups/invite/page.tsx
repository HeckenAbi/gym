"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";

 type Preview = { group_id: string; group_name: string; inviter_name: string; member_count: number; expires_at: string };

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function GroupInvitePage() {
  const router = useRouter();
  const tokenRef = useRef("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get("token") || "";
    tokenRef.current = urlToken;
    async function load() {
      if (!urlToken) { setError("Dieser Einladungslink ist unvollständig."); setLoading(false); return; }
      const hash = await sha256(urlToken);
      const { data, error: previewError } = await supabase.rpc("get_group_invite_preview", { p_token_hash: hash });
      if (previewError || !data?.[0]) setError("Dieser Einladungslink ist abgelaufen, widerrufen oder nicht gültig.");
      else setPreview(data[0] as Preview);
      setLoading(false);
    }
    void load();
  }, []);

  async function join() {
    setJoining(true); setError(""); setMessage("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push(`/?invite=${encodeURIComponent(tokenRef.current)}`);
      return;
    }
    const hash = await sha256(tokenRef.current);
    const { error: joinError } = await supabase.rpc("accept_group_invite", { p_token_hash: hash });
    if (joinError) setError(`Beitritt fehlgeschlagen: ${joinError.message}`);
    else { setMessage("Du bist der Gruppe beigetreten."); setTimeout(() => router.push("/groups"), 700); }
    setJoining(false);
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#090b10] p-4 text-white"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11141c] p-7 text-center shadow-2xl sm:p-9"><button onClick={() => router.push("/")} className="text-xl font-black tracking-tight">GYM<span className="text-lime-400">BATTLE</span></button>{loading ? <p className="mt-10 text-gray-400">Einladung wird geprüft ...</p> : error ? <><div className="mx-auto mt-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10 text-2xl">!</div><h1 className="mt-5 text-2xl font-black">Einladung nicht verfügbar</h1><p className="mt-2 text-sm text-gray-400">{error}</p><button onClick={() => router.push("/")} className="mt-7 w-full rounded-xl border border-white/15 px-4 py-3 font-semibold">Zur Startseite</button></> : preview ? <><div className="mx-auto mt-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10 text-2xl">◆</div><p className="mt-5 text-xs font-bold uppercase tracking-widest text-lime-400">Private Einladung</p><h1 className="mt-2 text-3xl font-black">{preview.group_name}</h1><p className="mt-3 text-gray-400"><strong className="text-white">{preview.inviter_name}</strong> lädt dich in die Crew ein.</p><div className="mt-6 rounded-2xl bg-white/[0.04] p-4 text-sm text-gray-400">{preview.member_count} Mitglieder · gültig bis {new Date(preview.expires_at).toLocaleDateString("de-DE")}</div>{message && <p className="mt-4 text-sm text-lime-300">{message}</p>}{error && <p className="mt-4 text-sm text-red-300">{error}</p>}<button onClick={join} disabled={joining} className="mt-6 w-full rounded-xl bg-lime-400 px-4 py-3 font-bold text-black disabled:opacity-50">{joining ? "Du trittst bei ..." : "Gruppe beitreten"}</button><p className="mt-4 text-xs leading-5 text-gray-500">Deine Trainings bleiben privat. Nur explizit geteilte abgeschlossene Trainings erscheinen in der Gruppe.</p></> : null}</section></main>;
}
