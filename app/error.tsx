"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("GymBattle App-Fehler", error); }, [error]);
  return <main className="flex min-h-screen items-center justify-center bg-[#090b10] p-6 text-white"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11141c] p-8 text-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">Etwas ist schiefgelaufen</p><h1 className="mt-3 text-3xl font-black">Deine Daten sind nicht verloren.</h1><p className="mt-3 text-sm leading-6 text-gray-400">Versuche die Ansicht erneut zu laden. Nicht gespeicherte Eingaben können nur wiederhergestellt werden, wenn der Autosave bereits erfolgreich war.</p><button onClick={() => reset()} className="mt-6 rounded-xl bg-lime-400 px-5 py-3 font-bold text-black">Erneut versuchen</button></section></main>;
}
