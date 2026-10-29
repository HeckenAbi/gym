"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

type Result = { user_id: string; display_name: string };
type FriendRequest = { request_id: string; other_user_id: string; display_name: string; direction: "incoming" | "outgoing"; status: "pending" | "accepted" | "declined"; created_at: string };

export default function FriendsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRequests() {
    const { data, error: requestError } = await supabase.rpc("get_my_friend_requests");
    if (requestError) setError(`Anfragen konnten nicht geladen werden: ${requestError.message}`);
    else setRequests((data ?? []) as FriendRequest[]);
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/"); return; }
      await loadRequests();
      setLoading(false);
    }
    void init();
  }, [router]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) { setError("Gib mindestens zwei Zeichen ein."); return; }
    setSearching(true); setError("");
    const { data, error: searchError } = await supabase.rpc("search_profiles", { p_query: query.trim() });
    if (searchError) setError(`Suche fehlgeschlagen: ${searchError.message}`);
    else setResults((data ?? []) as Result[]);
    setSearching(false);
  }

  async function sendRequest(userId: string) {
    const { error: requestError } = await supabase.rpc("send_friend_request", { p_receiver_id: userId });
    if (requestError) setError(requestError.message);
    else { setMessage("Freundschaftsanfrage gesendet."); await loadRequests(); }
  }

  async function respond(requestId: string, status: "accepted" | "declined") {
    const { error: responseError } = await supabase.rpc("respond_friend_request", { p_request_id: requestId, p_status: status });
    if (responseError) setError(`Anfrage konnte nicht aktualisiert werden: ${responseError.message}`);
    else { setMessage(status === "accepted" ? "Freundschaft angenommen." : "Anfrage abgelehnt."); await loadRequests(); }
  }

  const friends = requests.filter((request) => request.status === "accepted");
  const pendingIncoming = requests.filter((request) => request.status === "pending" && request.direction === "incoming");

  if (loading) return <main className="min-h-screen bg-[#090b10] p-8 text-white">Freunde werden geladen ...</main>;
  return <main className="min-h-screen bg-[#090b10] px-4 py-6 text-white sm:px-6 md:px-10"><div className="mx-auto max-w-4xl"><header className="flex items-center justify-between border-b border-white/10 pb-5"><button onClick={() => router.push("/dashboard")} className="text-xl font-black">GYM<span className="text-lime-400">BATTLE</span></button><button onClick={() => router.push("/profile")} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-gray-300">Profil</button></header><section className="py-10"><p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">Dein Netzwerk</p><h1 className="mt-2 text-4xl font-black">Freunde</h1><p className="mt-3 text-gray-400">Finde Trainingspartner und lade bestätigte Freunde später direkt in Crews ein.</p></section>{message && <p className="mb-5 rounded-xl border border-lime-400/20 bg-lime-400/10 p-4 text-sm text-lime-200">{message}</p>}{error && <p className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}<form onSubmit={search} className="rounded-2xl border border-white/10 bg-[#11141c] p-5"><label className="text-sm text-gray-300">Nach Anzeigename suchen<div className="mt-2 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-lime-400" placeholder="z. B. Alex" /><button type="submit" disabled={searching} className="rounded-xl bg-lime-400 px-4 py-3 font-bold text-black disabled:opacity-50">{searching ? "Sucht ..." : "Suchen"}</button></div></label>{results.length > 0 && <div className="mt-4 space-y-2">{results.map((result) => <div key={result.user_id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-400/15 text-xs font-bold text-lime-300">{result.display_name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1 truncate font-semibold">{result.display_name}</span><button type="button" onClick={() => void sendRequest(result.user_id)} className="rounded-lg border border-lime-400/40 px-3 py-2 text-xs font-bold text-lime-300">Anfragen</button></div>)}</div>}</form><div className="mt-5 grid gap-5 md:grid-cols-2"><section className="rounded-2xl border border-white/10 bg-[#11141c] p-5"><h2 className="text-xl font-black">Anfragen</h2><div className="mt-4 space-y-2">{pendingIncoming.length === 0 ? <p className="text-sm text-gray-500">Keine offenen Anfragen.</p> : pendingIncoming.map((request) => <div key={request.request_id} className="rounded-xl bg-white/[0.04] p-3"><p className="font-semibold">{request.display_name}</p><div className="mt-3 flex gap-2"><button onClick={() => void respond(request.request_id, "accepted")} className="rounded-lg bg-lime-400 px-3 py-2 text-xs font-bold text-black">Annehmen</button><button onClick={() => void respond(request.request_id, "declined")} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300">Ablehnen</button></div></div>)}</div></section><section className="rounded-2xl border border-white/10 bg-[#11141c] p-5"><h2 className="text-xl font-black">Bestätigte Freunde</h2><div className="mt-4 space-y-2">{friends.length === 0 ? <p className="text-sm text-gray-500">Noch keine bestätigten Freunde.</p> : friends.map((friend) => <div key={friend.request_id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{friend.display_name.slice(0, 2).toUpperCase()}</span><span className="font-semibold">{friend.display_name}</span></div>)}</div></section></div></div></main>;
}
