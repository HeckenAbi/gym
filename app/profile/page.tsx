"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) { router.replace("/"); return; }
      setEmail(sessionData.session.user.email ?? "");
      setResetMode(new URLSearchParams(window.location.search).get("reset") === "1");
      const { data, error: profileError } = await supabase.rpc("get_my_profile");
      if (profileError) setError(`Profil konnte nicht geladen werden: ${profileError.message}`);
      else setDisplayName(data?.[0]?.display_name ?? "");
      setLoading(false);
    }
    void loadProfile();
  }, [router]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const name = displayName.trim();
    if (name.length < 2 || name.length > 40) { setError("Der Anzeigename muss zwischen 2 und 40 Zeichen lang sein."); return; }
    setSaving(true); setError(""); setMessage("");
    const { data, error: saveError } = await supabase.rpc("set_my_display_name", { p_display_name: name });
    if (saveError) setError(`Profil konnte nicht gespeichert werden: ${saveError.message}`);
    else { setDisplayName(data as string); setMessage("Profil gespeichert. Dein Name erscheint jetzt in Crews und Ranglisten."); }
    setSaving(false);
  }

  async function logout() { await supabase.auth.signOut(); router.replace("/"); }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 6 || newPassword !== confirmPassword) { setError("Die Passwörter müssen übereinstimmen und mindestens 6 Zeichen lang sein."); return; }
    setSaving(true); setError(""); setMessage("");
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError) setError("Passwort konnte nicht geändert werden. Bitte fordere einen neuen Link an.");
    else { setMessage("Passwort erfolgreich geändert."); setNewPassword(""); setConfirmPassword(""); setResetMode(false); router.replace("/profile"); }
    setSaving(false);
  }

  if (loading) return <main className="min-h-screen bg-[#090b10] p-8 text-white">Profil wird geladen ...</main>;

  return <main className="min-h-screen bg-[#090b10] px-4 py-6 text-white sm:px-6 md:px-10"><div className="mx-auto max-w-3xl"><header className="flex items-center justify-between border-b border-white/10 pb-5"><button onClick={() => router.push("/dashboard")} className="text-xl font-black">GYM<span className="text-lime-400">BATTLE</span></button><button onClick={logout} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">Abmelden</button></header><section className="py-10"><p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">Dein Account</p><h1 className="mt-2 text-4xl font-black">Profil & Einstellungen</h1><p className="mt-3 text-gray-400">Dein Anzeigename wird in privaten Gruppen, Ranglisten und Aktivitätsfeeds verwendet.</p></section>{resetMode && <form onSubmit={updatePassword} className="mb-5 rounded-2xl border border-lime-400/20 bg-lime-400/[0.06] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-lime-400">Passwort zurücksetzen</p><label className="mt-4 block text-sm text-gray-300">Neues Passwort<input required minLength={6} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:border-lime-400" /></label><label className="mt-4 block text-sm text-gray-300">Passwort wiederholen<input required minLength={6} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:border-lime-400" /></label><button type="submit" disabled={saving} className="mt-5 rounded-xl bg-lime-400 px-5 py-3 font-bold text-black disabled:opacity-50">{saving ? "Ändert ..." : "Passwort ändern"}</button></form>}<form onSubmit={saveProfile} className="rounded-2xl border border-white/10 bg-[#11141c] p-6 sm:p-8"><label className="block text-sm text-gray-300">Anzeigename<input required minLength={2} maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:border-lime-400" placeholder="z. B. Alex" /></label><p className="mt-3 text-xs text-gray-500">E-Mail: {email || "nicht verfügbar"}</p>{message && <p className="mt-5 text-sm text-lime-300">{message}</p>}{error && <p className="mt-5 text-sm text-red-300">{error}</p>}<button type="submit" disabled={saving} className="mt-6 rounded-xl bg-lime-400 px-5 py-3 font-bold text-black disabled:opacity-50">{saving ? "Speichert ..." : "Profil speichern"}</button></form><div className="mt-5 rounded-2xl border border-white/10 bg-[#11141c] p-6"><p className="text-xs font-bold uppercase tracking-widest text-lime-400">Privatsphäre</p><h2 className="mt-2 text-xl font-black">Du bestimmst, was geteilt wird.</h2><p className="mt-2 text-sm leading-6 text-gray-400">Trainings bleiben privat. Erst wenn du ein abgeschlossenes Training mit einer Crew teilst, werden die dafür ausgewählten Trainingsdaten in deren Aktivitätsfeed sichtbar.</p></div></div></main>;
}
