"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ClienteBottomNav from "@/components/ClienteBottomNav";
import InstallPrompt from "@/components/InstallPrompt";

type Shop = {
  id: string; name: string; slug: string; description: string | null;
  logoUrl: string | null; coverImageUrl: string | null;
  city: string | null; state: string | null; primaryColor: string | null;
};

type Appt = {
  id: string;
  startsAt: string;
  status: string;
  barbershop: { id: string; name: string; slug: string; logoUrl: string | null };
  service: { name: string } | null;
};

const BANNERS = [
  {
    title: "Agende sem ligar, direto pelo app",
    subtitle: "Escolha serviço, profissional e horário em poucos toques.",
    cls: "from-blue-600 to-cyan-500",
  },
  {
    title: "Seu horário fica reservado no carrinho",
    subtitle: "Nada é cobrado online — você paga na barbearia.",
    cls: "from-slate-800 to-slate-600",
  },
  {
    title: "Produtos da sua barbearia favorita",
    subtitle: "Reserve cosméticos e retire no balcão.",
    cls: "from-cyan-600 to-teal-500",
  },
];

function formatToday() {
  const s = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ShopAvatar({ shop, size }: { shop: { name: string; logoUrl: string | null }; size: string }) {
  return shop.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shop.logoUrl} alt={shop.name} className={`${size} rounded-full border border-slate-200 object-cover`} />
  ) : (
    <div className={`${size} flex items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700`}>
      {shop.name.charAt(0)}
    </div>
  );
}

export default function ClienteHomePage() {
  const [me, setMe] = useState<{ user: { name: string }; lastBarbershop: Shop | null } | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/cliente/me").then(async (r) => {
      if (r.ok) setMe(await r.json());
      else setLoggedOut(true);
    });
    fetch("/api/cliente/agendamentos").then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setAppts([...(d.upcoming ?? []), ...(d.past ?? [])]);
      }
    }).catch(() => null);
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

  /* carrossel automático */
  useEffect(() => {
    const t = setInterval(() => setBanner((b) => (b + 1) % BANNERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const firstName = me?.user.name.split(" ")[0];
  const lastAppt = appts[0] ?? null;

  /* últimos acessos: barbearias distintas dos agendamentos (mais recentes primeiro) */
  const recentShops: { id: string; name: string; slug: string; logoUrl: string | null }[] = [];
  for (const a of appts) {
    if (!recentShops.some((s) => s.id === a.barbershop.id)) recentShops.push(a.barbershop);
    if (recentShops.length >= 6) break;
  }
  if (recentShops.length === 0 && me?.lastBarbershop) recentShops.push(me.lastBarbershop);

  function focusSearch() {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => searchRef.current?.focus(), 350);
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24 text-slate-800">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="bg-slate-100 px-4 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Olá {firstName ? <span className="text-blue-600">{firstName}</span> : <span className="text-blue-600">visitante</span>}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{formatToday()}</p>
            </div>
            <button aria-label="Notificações" className="mt-1 text-slate-500">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </button>
          </div>

          {/* Busca */}
          <div className="relative mt-4 pb-5">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={searchRef}
              placeholder="Encontre um estabelecimento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="space-y-6 px-4 pt-5">
          {/* Resultados da busca */}
          {search.trim() ? (
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">Resultados</h2>
              {loading ? (
                <p className="text-sm text-slate-400">Buscando...</p>
              ) : shops.length === 0 ? (
                <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">
                  Nenhum estabelecimento encontrado para “{search}”.
                </p>
              ) : (
                <div className="space-y-2">
                  {shops.map((s) => (
                    <Link key={s.id} href={`/s/${s.slug}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300">
                      <ShopAvatar shop={s} size="h-12 w-12 text-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{s.name}</p>
                        <p className="truncate text-xs text-slate-500">{[s.city, s.state].filter(Boolean).join(" · ") || s.description || ""}</p>
                      </div>
                      <span className="text-blue-600">›</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Último agendamento */}
              {lastAppt && (
                <section>
                  <h2 className="mb-3 text-lg font-bold text-slate-900">Último agendamento</h2>
                  <Link
                    href={`/s/${lastAppt.barbershop.slug}`}
                    className="flex items-center gap-3 rounded-full border-2 border-slate-900/80 bg-white p-2 pr-4 shadow-sm transition hover:border-blue-400"
                  >
                    <ShopAvatar shop={lastAppt.barbershop} size="h-12 w-12 text-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{lastAppt.barbershop.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {lastAppt.service?.name ?? "Serviço"} ·{" "}
                        {new Date(lastAppt.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-500 text-green-600">›</span>
                  </Link>
                </section>
              )}

              {/* Banner carrossel */}
              <section>
                <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${BANNERS[banner].cls} p-6 text-white shadow-sm`}>
                  <p className="max-w-[85%] text-lg font-bold leading-snug">{BANNERS[banner].title}</p>
                  <p className="mt-2 max-w-[85%] text-sm text-white/80">{BANNERS[banner].subtitle}</p>
                </div>
                <div className="mt-2 flex justify-center gap-1.5">
                  {BANNERS.map((_, i) => (
                    <button key={i} onClick={() => setBanner(i)} aria-label={`Banner ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${i === banner ? "w-4 bg-blue-600" : "w-2 bg-slate-300"}`} />
                  ))}
                </div>
              </section>

              {/* Últimos acessos */}
              {recentShops.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Últimos acessos</h2>
                    <Link href="/cliente/agendamentos" className="text-sm text-blue-600">Ver tudo</Link>
                  </div>
                  <div className="flex gap-5 overflow-x-auto pb-2">
                    {recentShops.map((s) => (
                      <Link key={s.id} href={`/s/${s.slug}`} className="flex w-20 shrink-0 flex-col items-center gap-2 text-center">
                        <ShopAvatar shop={s} size="h-16 w-16 text-xl" />
                        <span className="line-clamp-2 text-xs text-slate-700">{s.name}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Estabelecimentos */}
              <section>
                <h2 className="mb-3 text-lg font-bold text-slate-900">Estabelecimentos</h2>
                {loading ? (
                  <p className="text-sm text-slate-400">Carregando...</p>
                ) : (
                  <div className="space-y-2">
                    {shops.map((s) => (
                      <Link key={s.id} href={`/s/${s.slug}`}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300">
                        <ShopAvatar shop={s} size="h-12 w-12 text-lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{s.name}</p>
                          <p className="truncate text-xs text-slate-500">{[s.city, s.state].filter(Boolean).join(" · ") || s.description || ""}</p>
                        </div>
                        <span className="text-blue-600">›</span>
                      </Link>
                    ))}
                    {shops.length === 0 && (
                      <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">Nenhum estabelecimento cadastrado ainda.</p>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Menu (bottom sheet) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40" onClick={() => setMenuOpen(false)}>
          <div className="w-full rounded-t-3xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
            <div className="space-y-1">
              {me ? (
                <>
                  <p className="px-3 pb-2 text-sm text-slate-500">Conectado como <span className="font-semibold text-slate-800">{me.user.name}</span></p>
                  <Link href="/cliente/agendamentos" className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100">📅 Meus agendamentos</Link>
                  <Link href="/api/auth/signout?callbackUrl=/cliente" className="block rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50">Sair da conta</Link>
                </>
              ) : loggedOut ? (
                <>
                  <Link href="/cliente/login?callbackUrl=/cliente" className="block rounded-xl px-3 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50">Entrar</Link>
                  <Link href="/cliente/cadastro" className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100">Criar conta</Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <InstallPrompt />
      <ClienteBottomNav active="inicio" onMenu={() => setMenuOpen(true)} onSearch={focusSearch} />
    </div>
  );
}
