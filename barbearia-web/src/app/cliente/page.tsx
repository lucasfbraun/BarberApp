"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Shop = {
  id: string; name: string; slug: string; description: string | null;
  logoUrl: string | null; coverImageUrl: string | null;
  city: string | null; state: string | null; primaryColor: string | null;
};

export default function ClienteHomePage() {
  const [me, setMe] = useState<{ user: { name: string }; lastBarbershop: Shop | null } | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cliente/me").then(async (r) => {
      if (r.ok) setMe(await r.json());
      else setLoggedOut(true);
    });
  }, []);

  const loadShops = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/public/barbearias?${params}`);
    if (res.ok) setShops((await res.json()).barbershops);
    setLoading(false);
  }, [search]);

  useEffect(() => { loadShops(); }, [loadShops]);

  const last = me?.lastBarbershop ?? null;

  return (
    <div className="min-h-screen bg-white px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">lbraunapp</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {me ? `Olá, ${me.user.name.split(" ")[0]}!` : "Encontre sua barbearia"}
            </h1>
          </div>
          <div className="flex gap-2">
            {me ? (
              <>
                <Link href="/cliente/agendamentos"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:border-cyan-300 hover:text-slate-900">
                  Meus agendamentos
                </Link>
                <Link href="/api/auth/signout?callbackUrl=/cliente"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 transition hover:text-red-600">
                  Sair
                </Link>
              </>
            ) : loggedOut ? (
              <>
                <Link href="/login?callbackUrl=/cliente"
                  className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm text-cyan-700 transition hover:bg-cyan-100">
                  Entrar
                </Link>
                <Link href="/cliente/cadastro"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:text-slate-900">
                  Criar conta
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {/* Última barbearia */}
        {last && (
          <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-400/10 to-transparent">
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-4">
                {last.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={last.logoUrl} alt={last.name} className="h-14 w-14 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-xl font-bold text-cyan-700">
                    {last.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-cyan-700">Sua barbearia</p>
                  <h2 className="text-lg font-semibold text-slate-900">{last.name}</h2>
                  <p className="text-xs text-slate-500">{[last.city, last.state].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link href={`/s/${last.slug}/agendar`}
                  className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                  Agendar horário
                </Link>
                <Link href={`/s/${last.slug}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 transition hover:text-slate-900">
                  Ver página
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Busca */}
        <div>
          <h3 className="mb-3 text-lg font-semibold text-slate-900">
            {last ? "Procurar outras barbearias" : "Todas as barbearias"}
          </h3>
          <input
            placeholder="Buscar por nome ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400 sm:max-w-md"
          />
        </div>

        {/* Diretório */}
        {loading ? (
          <p className="text-sm text-slate-400">Carregando barbearias...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <Link key={s.id} href={`/s/${s.slug}`}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 transition hover:border-cyan-300 hover:bg-slate-100">
                {s.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.coverImageUrl} alt="" className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full" style={{ background: s.primaryColor ?? "#164e63" }} />
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-slate-900 group-hover:text-cyan-700">{s.name}</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {[s.city, s.state].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {s.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-400">{s.description}</p>
                  )}
                </div>
              </Link>
            ))}
            {shops.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-slate-400">
                Nenhuma barbearia encontrada{search ? ` para “${search}”` : ""}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
