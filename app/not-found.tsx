import Link from "next/link";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-[#090b10] p-6 text-white"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11141c] p-8 text-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">404</p><h1 className="mt-3 text-3xl font-black">Diese Seite gibt es nicht.</h1><p className="mt-3 text-sm leading-6 text-gray-400">Der Link ist möglicherweise veraltet oder die Ansicht wurde verschoben.</p><Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-lime-400 px-5 py-3 font-bold text-black">Zum Dashboard</Link></section></main>;
}
