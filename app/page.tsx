"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

type AuthMode = "login" | "signup" | "reset";

export default function Home() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).has("returnTo")) {
        setMode("login");
        setShowAuth(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function safeReturnPath() {
    const candidate = new URLSearchParams(window.location.search).get("returnTo");
    return candidate?.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\")
      ? candidate
      : "/dashboard";
  }

  function openAuth(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowAuth(true);
  }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setMessage("Wenn ein Konto mit dieser Adresse besteht, erhältst du eine E-Mail zum Zurücksetzen des Passworts.");
        setMessageKind("success");
        return;
      }

      if (mode === "signup") {
        if (password !== confirmPassword) {
          setMessage("Die Passwörter stimmen nicht überein.");
          setMessageKind("error");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          router.push(safeReturnPath());
          return;
        }
        setMessage("Konto angelegt. Prüfe dein Postfach, falls eine E-Mail-Bestätigung erforderlich ist.");
        setMessageKind("success");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(safeReturnPath());
    } catch {
      setMessage(
        mode === "login"
          ? "Anmeldung nicht möglich. Prüfe deine Zugangsdaten und versuche es erneut."
          : mode === "signup"
            ? "Konto konnte nicht angelegt werden. Prüfe deine Eingaben und versuche es erneut."
            : "Die Anfrage konnte nicht verarbeitet werden. Bitte versuche es später erneut."
      );
      setMessageKind("error");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "login" ? "Schön, dass du da bist." : mode === "signup" ? "Starte dein nächstes Kapitel." : "Passwort zurücksetzen.";

  return (
    <main className="min-h-screen overflow-hidden bg-[#090a0c] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_at_72%_4%,rgba(213,216,224,0.10),transparent_52%)]" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-white/[0.07] px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3 rounded-xl" aria-label="Gym Battle Startseite">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="text-[15px] font-extrabold tracking-[0.11em]">GYM<span className="text-white/45">BATTLE</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => openAuth("login")} className="rounded-xl px-3 py-2 text-sm font-medium text-white/65 transition hover:text-white">Anmelden</button>
          <button onClick={() => openAuth("signup")} className="primary-button px-4 py-2.5 text-sm">Konto erstellen</button>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 lg:pb-28 lg:pt-28">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.19em] text-white/60 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d8d9dd] shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
            Krafttraining · Verlauf · Fokus
          </div>
          <h1 className="max-w-[720px] text-[clamp(3.4rem,9vw,6.8rem)] font-semibold leading-[0.94] tracking-[-0.075em]">
            Jede Einheit.
            <span className="mt-1 block text-white/42">Macht dich stärker.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
            Protokolliere deine Übungen, Gewicht und Wiederholungen. Sieh deine Entwicklung klarer – direkt nach dem Training und am Smartphone.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={() => openAuth("signup")} className="primary-button px-6 py-3.5 text-sm">Kostenlos starten <span aria-hidden="true">↗</span></button>
            <button onClick={() => document.getElementById("produkt")?.scrollIntoView({ behavior: "smooth" })} className="secondary-button px-6 py-3.5 text-sm">Das steckt drin</button>
          </div>
          <p className="mt-5 text-xs text-white/35">Dein Trainingslog ist privat und an dein Konto gebunden.</p>
        </div>

        <div className="relative mx-auto w-full max-w-[530px] lg:ml-auto">
          <div className="absolute -inset-10 rounded-full bg-white/[0.04] blur-3xl" />
          <div className="glass-panel relative overflow-hidden rounded-[30px] p-5 sm:p-7">
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/[0.055] blur-3xl" />
            <div className="relative flex items-center justify-between">
              <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Vorschau · Trainingslog</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Oberkörper A</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-medium text-white/55">Beispieldaten</span>
            </div>
            <div className="relative mt-7 space-y-3">
              {[
                { name: "Bankdrücken", detail: "4 Sätze · 72,5 kg × 8", value: "+2,5 kg" },
                { name: "Schrägbank Kurzhantel", detail: "3 Sätze · 26 kg × 10", value: "Bestwert" },
                { name: "Kabelzug", detail: "3 Sätze · 42 kg × 12", value: "stabil" },
              ].map((exercise, index) => (
                <div key={exercise.name} className="flex items-center gap-3 rounded-2xl border border-white/[0.075] bg-black/20 p-3.5 sm:p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-xs font-semibold text-white/55">0{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white/90">{exercise.name}</p>
                    <p className="mt-1 text-xs text-white/40">{exercise.detail}</p>
                  </div>
                  <span className="whitespace-nowrap rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-[10px] font-medium text-white/55">{exercise.value}</span>
                </div>
              ))}
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/38">Trainings</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">24<span className="ml-1 text-sm font-medium text-white/35">gesamt</span></p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/38">Dranbleiben</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">Woche <span className="text-white/40">für Woche</span></p>
              </div>
            </div>
            <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4">
              <span className="text-xs text-white/40">Speichern soll sich leicht anfühlen.</span>
              <span className="flex items-center gap-2 text-xs font-medium text-white/65"><span className="h-1.5 w-1.5 rounded-full bg-[#d8d9dd]" /> Bereit fürs nächste Set</span>
            </div>
          </div>
        </div>
      </section>

      <section id="produkt" className="relative mx-auto max-w-7xl scroll-mt-8 px-5 pb-24 sm:px-8 lg:px-12 lg:pb-32">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Dein Training, in deinem Rhythmus</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Weniger suchen. Mehr bewegen.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/45">Ein ruhiger Ort für deine Einheiten und den Fortschritt, den du dir erarbeitest.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { number: "01", title: "Einfach protokollieren", body: "Übungen, Gewicht und Wiederholungen – übersichtlich festgehalten, auch wenn du gerade trainierst." },
            { number: "02", title: "Fortschritt verstehen", body: "Sieh deine abgeschlossenen Trainingstage, dein Volumen und deine Kraftentwicklung an einem Ort." },
            { number: "03", title: "Bei dir behalten", body: "Dein Trainingslog bleibt deinem Konto zugeordnet. Teile persönliche Trainingsdaten nicht versehentlich öffentlich." },
          ].map((item) => (
            <article key={item.number} className="glass-soft rounded-[22px] p-6 sm:p-7">
              <div className="mb-10 flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-white/42">{item.number}</span>
                <span className="h-px w-10 bg-white/20" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/48">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.07] px-5 py-6 text-center text-xs text-white/35 sm:px-8">
        GYM BATTLE <span className="mx-2 text-white/15">/</span> Dein Training. Deine Entwicklung.
      </footer>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAuth(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="glass-panel relative my-auto w-full max-w-[440px] rounded-[28px] p-6 sm:p-8">
            <button onClick={() => setShowAuth(false)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl text-white/50 transition hover:bg-white/[0.07] hover:text-white" aria-label="Fenster schließen">×</button>
            <div className="mb-7 pr-8">
              <span className="brand-mark mb-5" aria-hidden="true"><span /></span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">GYM BATTLE</p>
              <h2 id="auth-title" className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/48">{mode === "reset" ? "Wir senden dir einen sicheren Link an deine E-Mail-Adresse." : "Melde dich an und mach da weiter, wo du aufgehört hast."}</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <label className="block text-xs font-medium text-white/66">E-Mail-Adresse
                <input className="app-input mt-2 w-full px-4 text-sm" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="du@beispiel.de" />
              </label>
              {mode === "signup" && <label className="block text-xs font-medium text-white/66">Anzeigename für deine Gruppen <span className="text-white/35">(optional)</span>
                <input className="app-input mt-2 w-full px-4 text-sm" type="text" maxLength={40} autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="z. B. Alex" />
              </label>}
              {mode !== "reset" && <label className="block text-xs font-medium text-white/66">Passwort
                <input className="app-input mt-2 w-full px-4 text-sm" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mindestens 8 Zeichen" />
              </label>}
              {mode === "signup" && <label className="block text-xs font-medium text-white/66">Passwort wiederholen
                <input className="app-input mt-2 w-full px-4 text-sm" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Passwort bestätigen" />
              </label>}
              {message && <p role={messageKind === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm leading-5 ${messageKind === "error" ? "border-red-300/20 bg-red-300/[0.06] text-red-100/85" : "border-white/10 bg-white/[0.04] text-white/70"}`}>{message}</p>}
              <button type="submit" disabled={loading} className="primary-button w-full px-4 py-3 text-sm">{loading ? "Einen Moment …" : mode === "login" ? "Anmelden" : mode === "signup" ? "Konto erstellen" : "Link anfordern"}</button>
            </form>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs text-white/45">
              {mode === "login" && <><span>Noch kein Konto?</span><button onClick={() => { setMode("signup"); setMessage(""); }} className="font-semibold text-white/85 hover:underline">Registrieren</button><span className="text-white/20">·</span><button onClick={() => { setMode("reset"); setMessage(""); }} className="font-medium hover:text-white">Passwort vergessen?</button></>}
              {mode === "signup" && <><span>Schon dabei?</span><button onClick={() => { setMode("login"); setMessage(""); }} className="font-semibold text-white/85 hover:underline">Anmelden</button></>}
              {mode === "reset" && <button onClick={() => { setMode("login"); setMessage(""); }} className="font-semibold text-white/80 hover:underline">Zurück zur Anmeldung</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
