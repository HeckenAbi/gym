"use client";

import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Übersicht", short: "Home" },
  { href: "/training", label: "Training", short: "Training" },
  { href: "/groups", label: "Crews", short: "Crews" },
  { href: "/profile", label: "Profil", short: "Profil" },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/" || pathname.startsWith("/groups/invite")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d1017]/95 px-3 py-2 backdrop-blur md:hidden" aria-label="Hauptnavigation">
      <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <button key={item.href} onClick={() => router.push(item.href)} className={`rounded-xl px-2 py-2 text-center text-xs font-semibold transition ${active ? "bg-lime-400/15 text-lime-300" : "text-gray-500 hover:bg-white/5 hover:text-white"}`}>
              <span className="block text-[10px] uppercase tracking-widest">{active ? "●" : "○"}</span>
              {item.short}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
