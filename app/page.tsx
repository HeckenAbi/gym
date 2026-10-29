
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../src/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [pendingInvite] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("invite") || ""
      : ""
  );

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push(pendingInvite ? `/groups/invite?token=${encodeURIComponent(pendingInvite)}` : "/dashboard");
        return;
      } else {
        if (password !== passwordConfirm) throw new Error("Die Passwörter stimmen nicht überein.");
        if (!acceptedTerms) throw new Error("Bitte akzeptiere die Nutzungsbedingungen und den Datenschutzhinweis.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMessage(
          "Registrierung erfolgreich. Prüfe deine E-Mails, falls eine Bestätigung erforderlich ist."
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ein Fehler ist aufgetreten."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) { setMessage("Gib zuerst deine E-Mail-Adresse ein."); return; }
    setLoading(true); setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/profile?reset=1`,
    });
    setMessage(error ? "Die Anfrage konnte nicht gesendet werden. Prüfe die E-Mail-Adresse und versuche es erneut." : "Wenn ein Konto zu dieser Adresse existiert, erhältst du gleich eine E-Mail zum Zurücksetzen.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#090b10] text-white">
      <nav className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div className="text-xl font-black tracking-tight">
          GYM<span className="text-lime-400">BATTLE</span>
        </div>

        <button
          onClick={() => {
            setIsLogin(true);
            setShowAuth(true);
            setMessage("");
          }}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-gray-300"
        >
          Anmelden
        </button>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-lime-400">
          Train together. Get stronger.
        </p>

        <h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">
          Dein Training.
          <br />
          Deine Crew.
          <br />
          <span className="text-lime-400">Dein Fortschritt.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
          Protokolliere deine Workouts, tritt mit Freunden an und bleib
          gemeinsam am Ball. Jeder Trainingstag zählt.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setIsLogin(false);
              setShowAuth(true);
              setMessage("");
            }}
            className="rounded-xl bg-lime-400 px-6 py-3 font-bold text-black transition hover:bg-lime-300"
          >
            Kostenlos starten
          </button>

          <button
            onClick={() =>
              document.getElementById("features")?.scrollIntoView({
                behavior: "smooth",
              })
            }
            className="rounded-xl border border-white/15 px-6 py-3 font-semibold hover:bg-white/5"
          >
            So funktioniert&apos;s
          </button>
        </div>

        <div id="features" className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            {
              number: "01",
              title: "Training tracken",
              description:
                "Gewicht, Wiederholungen und persönliche Bestleistungen festhalten.",
            },
            {
              number: "02",
              title: "Crew aufbauen",
              description:
                "Private Gruppen erstellen und Trainings gezielt teilen.",
            },
            {
              number: "03",
              title: "Punkte sammeln",
              description:
                "Jeder geteilte Trainingstag zählt. Bis zu fünf Punkte pro Woche.",
            },
          ].map((item) => (
            <article
              key={item.number}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="mb-8 text-sm font-bold text-lime-400">
                {item.number}
              </div>
              <h2 className="text-xl font-bold">{item.title}</h2>
              <p className="mt-3 leading-7 text-gray-400">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-sm text-gray-500">
        GYMBATTLE · Gemeinsam stärker werden.
      </footer>

      {showAuth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11141c] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 id="auth-title" className="text-2xl font-black">
                {isLogin ? "Willkommen zurück" : "Konto erstellen"}
              </h2>

              <button
                onClick={() => setShowAuth(false)}
                className="rounded-lg px-3 py-1 text-gray-400 hover:bg-white/10"
                aria-label="Fenster schließen"
              >
                ✕
              </button>
            </div>

            <form onSubmit={forgotMode ? handleResetRequest : handleAuth} className="space-y-4">
              <label className="block text-sm text-gray-300">
                E-Mail
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-400"
                  placeholder="du@beispiel.de"
                />
              </label>

              {!forgotMode && <label className="block text-sm text-gray-300">
                Passwort
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={
                    isLogin ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-400"
                  placeholder="Mindestens 6 Zeichen"
                />
              </label>}

              {!forgotMode && isLogin && <button type="button" onClick={() => { setForgotMode(true); setMessage(""); }} className="text-sm text-lime-400 hover:underline">Passwort vergessen?</button>}

              {!forgotMode && !isLogin && <>
                <label className="block text-sm text-gray-300">Passwort wiederholen<input type="password" required minLength={6} autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-400" placeholder="Passwort erneut eingeben" /></label>
                <label className="flex items-start gap-3 text-sm text-gray-400"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 accent-lime-400" /> <span>Ich akzeptiere die Nutzungsbedingungen und den Datenschutzhinweis.</span></label>
              </>}

              {message && (
                <p
                  aria-live="polite"
                  className="break-words text-sm text-lime-300"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-lime-400 px-4 py-3 font-bold text-black hover:bg-lime-300 disabled:opacity-50"
              >
                {loading ? "Einen Moment ..." : forgotMode ? "Reset-Link senden" : isLogin ? "Anmelden" : "Kostenlos registrieren"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-400">
              {forgotMode ? "Zurück zur Anmeldung" : isLogin ? "Noch kein Konto?" : "Du hast schon ein Konto?"}{" "}
              <button
                onClick={() => {
                  if (forgotMode) { setForgotMode(false); setMessage(""); return; }
                  setIsLogin(!isLogin);
                  setMessage("");
                }}
                className="font-semibold text-lime-400 hover:underline"
              >
                {isLogin ? "Registrieren" : "Anmelden"}
              </button>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
