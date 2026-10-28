"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError || !data.session) {
        setError(true);
        setMessage("Der Link ist ungültig oder abgelaufen. Fordere einen neuen Link an.");
      }
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError(true);
      setMessage("Die Passwörter stimmen nicht überein.");
      return;
    }

    setSaving(true);
    setError(false);
    setMessage("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(true);
      setMessage("Das Passwort konnte nicht geändert werden. Fordere einen neuen Link an.");
      return;
    }
    setMessage("Dein Passwort wurde aktualisiert. Du wirst gleich weitergeleitet.");
    window.setTimeout(() => router.replace("/dashboard"), 1100);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#090a0c] px-4 py-10 text-white">
      <section className="glass-panel w-full max-w-md rounded-[28px] p-6 sm:p-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Gym Battle Startseite">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="text-sm font-extrabold tracking-[0.1em]">GYM<span className="text-white/45">BATTLE</span></span>
        </Link>
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">Konto-Sicherheit</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neues Passwort setzen</h1>
        {!ready ? <p className="mt-5 text-sm text-white/50">Link wird geprüft …</p> : error && !message ? <p className="mt-5 text-sm text-white/55">Dein Link konnte nicht geprüft werden.</p> : null}
        {ready && !error && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-medium text-white/65">Neues Passwort
              <input className="app-input mt-2 w-full px-4 text-sm" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label className="block text-xs font-medium text-white/65">Passwort wiederholen
              <input className="app-input mt-2 w-full px-4 text-sm" type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </label>
            <button disabled={saving} className="primary-button w-full px-4 py-3 text-sm">{saving ? "Wird gespeichert …" : "Passwort aktualisieren"}</button>
          </form>
        )}
        {message && <p role={error ? "alert" : "status"} className={`mt-4 rounded-xl border p-3 text-sm leading-5 ${error ? "border-red-300/20 bg-red-300/[0.06] text-red-100/85" : "border-white/10 bg-white/[0.04] text-white/70"}`}>{message}</p>}
        {error && <Link href="/" className="secondary-button mt-5 w-full px-4 py-3 text-sm">Zur Anmeldung</Link>}
      </section>
    </main>
  );
}
