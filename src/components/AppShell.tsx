"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type IconName = "home" | "dumbbell" | "chart" | "user" | "users";

function NavIcon({ name }: { name: IconName }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-full w-full",
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  if (name === "home") {
    return <svg {...shared}><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></svg>;
  }
  if (name === "dumbbell") {
    return <svg {...shared}><path d="M6 9v6m12-6v6M3.5 10v4m17-4v4M6 12h12M8 8v8m8-8v8" /></svg>;
  }
  if (name === "chart") {
    return <svg {...shared}><path d="M4 19V5m0 14h17" /><path d="m7 15 4-4 3 2 6-7" /><path d="M17 6h3v3" /></svg>;
  }
  if (name === "users") {
    return <svg {...shared}><circle cx="9" cy="8" r="3" /><path d="M3 20c.4-3.2 2.4-5 6-5s5.6 1.8 6 5" /><path d="M16 5.4a3 3 0 0 1 0 5.8M17 15c2.3.6 3.6 2.2 4 5" /></svg>;
  }
  return <svg {...shared}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.5 3-5.5 7-5.5s6.5 2 7 5.5" /></svg>;
}

const items: { label: string; href: string; icon: IconName; match: "dashboard" | "training" | "history" | "groups" }[] = [
  { label: "Übersicht", href: "/dashboard", icon: "home", match: "dashboard" },
  { label: "Training", href: "/training", icon: "dumbbell", match: "training" },
  { label: "Verlauf", href: "/dashboard#verlauf", icon: "chart", match: "history" },
  { label: "Gruppen", href: "/groups", icon: "users", match: "groups" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [fragment, setFragment] = useState("");
  const isTraining = pathname === "/training" || pathname.startsWith("/training/");

  useEffect(() => {
    const syncFragment = () => setFragment(window.location.hash);
    syncFragment();
    window.addEventListener("hashchange", syncFragment);
    window.addEventListener("popstate", syncFragment);
    return () => {
      window.removeEventListener("hashchange", syncFragment);
      window.removeEventListener("popstate", syncFragment);
    };
  }, [pathname]);

  function isActive(match: (typeof items)[number]["match"]) {
    if (match === "training") return isTraining;
    if (match === "dashboard") return pathname === "/dashboard" && fragment !== "#verlauf";
    if (match === "history") return pathname === "/dashboard" && fragment === "#verlauf";
    if (match === "groups") return pathname.startsWith("/groups");
    return false;
  }

  function handleNavClick(match: (typeof items)[number]["match"]) {
    if (match === "history") setFragment("#verlauf");
    else if (match === "dashboard") setFragment("");
  }

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f4f4f5]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-white/[0.07] bg-[#0b0c0f]/85 px-5 py-7 backdrop-blur-2xl md:flex">
        <Link href="/dashboard" className="mb-11 flex items-center gap-3 rounded-xl px-2" aria-label="Gym Battle Übersicht">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="text-[15px] font-extrabold tracking-[0.1em] text-white">GYM<span className="text-white/45">BATTLE</span></span>
        </Link>

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Dein Bereich</p>
        <nav aria-label="Hauptnavigation" className="space-y-1">
          {items.map((item) => {
            const active = isActive(item.match);
            return (
              <Link
                key={item.match}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => handleNavClick(item.match)}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
              >
                <span className="h-5 w-5"><NavIcon name={item.icon} /></span>
                <span>{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d8d9dd]" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Heute zählt</p>
          <p className="mt-2 text-sm font-semibold text-white/85">Eine Einheit nach der anderen.</p>
          <div className="mt-4 h-px bg-white/[0.08]" />
          <p className="mt-3 text-[11px] leading-5 text-white/45">Deine Trainingsdaten bleiben privat, solange du sie nicht teilst.</p>
        </div>
      </aside>

      <div className="min-w-0 md:pl-[248px]">
        <div className="min-h-screen pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      </div>

      <nav aria-label="Mobile Hauptnavigation" className="mobile-bottom-nav fixed inset-x-3 bottom-[calc(0.65rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.11] bg-[#121316]/85 p-1.5 shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:hidden">
        {items.map((item) => {
          const active = isActive(item.match);
          return (
            <Link
              key={item.match}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => handleNavClick(item.match)}
              className={`mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`}
            >
              <span className="h-[19px] w-[19px]"><NavIcon name={item.icon} /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
