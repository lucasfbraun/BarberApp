"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ClienteBottomNav from "@/components/ClienteBottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import { Logo } from "@/components/Logo";
import { HEADING, LABEL, MUTED, TITLE } from "@/lib/ui";

/* Home da área do cliente. Linguagem visual em src/lib/ui.ts:
   listas com divisória fina no lugar de cartões, sem sombra, paleta neutra. */

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

function formatToday() {
  const s = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Marca da barbearia em quadrado, não em círculo. */
function ShopMark({ shop, size }: { shop: { name: string; logoUrl: string | null }; size: string }) {
  return shop.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shop.logoUrl} alt={shop.name} className={`${size} border border-slate-200 object-cover`} />
  ) : (
    <div className={`${size} flex items-center justify-center border border-slate-200 bg-slate-50 text-lg font-light text-slate-400`}>
      {shop.name.charAt(0).toUpperCase()}
    </div>
  );
}

/** Linha de barbearia — divisória fina, sem cartão. */
function ShopRow({ shop }: { shop: Shop }) {
  return (
    <li className="border-b border-slate-200">
      <Link href={`/s/${shop.slug}`} className="group flex items-center gap-4 py-4">
        <ShopMark shop={shop} size="h-14 w-14 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium tracking-tight text-slate-900 group-hover:underline group-hover:underline-offset-4">
            {shop.name}
          </span>
          <span className="mt-0.5 block truncate text-sm text-slate-500">
            {[shop.city, shop.state].filter(Boolean).join(" · ") || shop.description || ""}
          </span>
        </span>
        <span className="shrink-0 text-slate-300 transition group-hover:text-slate-900">→</span>
      </Link>
    </li>
  );
}

export default function ClienteHomePage() {
  const [me, setMe] = useState<{ user: { name: string }; lastBarbershop: Shop | null } | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
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
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <div className="mx-auto max-w-lg px-5">
        {/* Cabeçalho editorial: data pequena em cima, nome grande embaixo. */}
        <header className="pt-8">
          {/* Marca discreta acima da saudação: identifica o app instalado, sem
              competir com o nome do cliente, que é o que importa aqui. */}
          <Logo variant="light" size="sm" className="mb-6" />
          <p className={LABEL}>{formatToday()}</p>
          <h1 className={`${TITLE} mt-3`}>
            {firstName ? `Olá, ${firstName}` : "Encontre sua barbearia"}
          </h1>
        </header>

        {/* Busca: campo com linha embaixo, sem caixa. */}
        <div className="mt-8 flex items-center gap-3 border-b border-slate-300 pb-2 focus-within:border-blue-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            placeholder="Buscar por nome ou cidade"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent py-1.5 text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Limpar busca" className="text-sm text-slate-400 hover:text-slate-900">
              ✕
            </button>
          )}
        </div>

        {search.trim() ? (
          <section className="mt-10">
            <h2 className={LABEL}>Resultados</h2>
            {loading ? (
              <p className={`${MUTED} mt-4`}>Buscando…</p>
            ) : shops.length === 0 ? (
              <p className="mt-4 border-l-2 border-blue-600 py-1 pl-4 text-sm text-slate-500">
                Nada encontrado para “{search}”.
              </p>
            ) : (
              <ul className="mt-2 border-t border-slate-200">
                {shops.map((s) => <ShopRow key={s.id} shop={s} />)}
              </ul>
            )}
          </section>
        ) : (
          <>
            {/* Próximo agendamento em destaque tipográfico. */}
            {lastAppt && (
              <section className="mt-12">
                <h2 className={LABEL}>Seu último agendamento</h2>
                <Link href={`/s/${lastAppt.barbershop.slug}`} className="group mt-3 block">
                  <p className="text-2xl font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
                    {lastAppt.barbershop.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {lastAppt.service?.name ?? "Serviço"} ·{" "}
                    {new Date(lastAppt.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                    {" · "}
                    {new Date(lastAppt.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </Link>
              </section>
            )}

            {/* Últimos acessos: marcas quadradas em linha. */}
            {recentShops.length > 0 && (
              <section className="mt-12">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className={LABEL}>Você já esteve aqui</h2>
                  <Link href="/cliente/agendamentos" className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-900">
                    Ver tudo
                  </Link>
                </div>
                <div className="-mx-5 mt-4 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex gap-4">
                    {recentShops.map((s) => (
                      <Link key={s.id} href={`/s/${s.slug}`} className="w-20 shrink-0">
                        <ShopMark shop={s} size="h-20 w-20" />
                        <span className="mt-2 block line-clamp-2 text-xs text-slate-600">{s.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className="mt-12">
              <h2 className={HEADING}>Barbearias</h2>
              {loading ? (
                <p className={`${MUTED} mt-4`}>Carregando…</p>
              ) : shops.length === 0 ? (
                <p className="mt-4 border-l-2 border-blue-600 py-1 pl-4 text-sm text-slate-500">
                  Nenhuma barbearia cadastrada ainda.
                </p>
              ) : (
                <ul className="mt-4 border-t border-slate-200">
                  {shops.map((s) => <ShopRow key={s.id} shop={s} />)}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {/* Menu inferior */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/30" onClick={() => setMenuOpen(false)}>
          <div className="w-full border-t border-slate-200 bg-white px-5 pb-10 pt-6" onClick={(e) => e.stopPropagation()}>
            {me ? (
              <>
                <p className={LABEL}>Conectado como {me.user.name}</p>
                <div className="mt-4 border-t border-slate-200">
                  <Link href="/cliente/agendamentos" className="block border-b border-slate-200 py-4 text-base font-medium">
                    Meus agendamentos
                  </Link>
                  <Link href="/api/auth/signout?callbackUrl=/cliente" className="block py-4 text-base font-medium text-red-600">
                    Sair da conta
                  </Link>
                </div>
              </>
            ) : loggedOut ? (
              <div className="border-t border-slate-200">
                <Link href="/cliente/login?callbackUrl=/cliente" className="block border-b border-slate-200 py-4 text-base font-medium">
                  Entrar
                </Link>
                <Link href="/cliente/cadastro" className="block py-4 text-base font-medium">
                  Criar conta
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <InstallPrompt />
      <ClienteBottomNav active="inicio" onMenu={() => setMenuOpen(true)} onSearch={focusSearch} />
    </div>
  );
}
