"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

/* Página pública da barbearia — navegação LIVRE (sem login).
   O login só é exigido no fluxo de agendar (/s/[slug]/agendar). */

type Service = {
  id: string; name: string; description: string | null;
  durationMinutes: number; price: number;
  category: { name: string } | null;
};
type Professional = {
  id: string; name: string; bio: string | null; photoUrl: string | null;
};
type Product = {
  id: string; name: string; description: string | null; category: string | null;
  salePrice: number; stockQuantity: number; unit: string;
};
type Review = {
  id: string; rating: number; comment: string | null; createdAt: string;
  customer: { name: string } | null; professional: { name: string } | null;
};
type Shop = {
  id: string; name: string; slug: string; description: string | null;
  primaryColor: string | null; accentColor: string | null;
  logoUrl: string | null; coverImageUrl: string | null;
  phone: string | null; whatsapp: string | null; email: string | null;
  address: string | null; city: string | null; state: string | null; zipCode: string | null;
  services: Service[]; professionals: Professional[];
  products: Product[]; reviews: Review[];
  ratingAverage: number | null; reviewCount: number;
};

type TabKey =
  | "servicos" | "detalhes" | "profissionais" | "produtos"
  | "fidelidade" | "pacotes" | "assinaturas" | "avaliacoes";

const TABS: { key: TabKey; label: string; soon?: boolean }[] = [
  { key: "servicos", label: "Serviços" },
  { key: "detalhes", label: "Detalhes" },
  { key: "profissionais", label: "Profissionais" },
  { key: "produtos", label: "Produtos" },
  { key: "fidelidade", label: "Fidelidade", soon: true },
  { key: "pacotes", label: "Pacotes", soon: true },
  { key: "assinaturas", label: "Assinaturas", soon: true },
  { key: "avaliacoes", label: "Avaliações" },
];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
function money(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-600">
      {"★".repeat(Math.round(rating))}<span className="text-slate-400">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
      <p className="text-2xl">🔜</p>
      <h3 className="mt-3 text-lg font-semibold text-slate-900">{title} em breve</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Esta barbearia ainda não ativou este recurso. Fique de olho — novidades chegando!
      </p>
    </div>
  );
}

export default function PublicBarbershopPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params?.slug ?? "");

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("servicos");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/barbershop/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(({ barbershop }) => setShop(barbershop ?? null))
      .catch(() => setShop(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-400">Carregando...</main>;
  }
  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white text-slate-500">
        <p>Barbearia não encontrada.</p>
        <Link href="/cliente" className="text-cyan-700 hover:underline">Ver todas as barbearias</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white"><div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-50 shadow-sm">
        {shop.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.coverImageUrl} alt="" className="h-44 w-full object-cover" />
        )}
        <div className="flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            {shop.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logoUrl} alt={shop.name} className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100 text-2xl font-bold text-cyan-700">
                {shop.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{shop.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {[shop.city, shop.state].filter(Boolean).join(" · ") || `/${shop.slug}`}
              </p>
              {shop.ratingAverage !== null && (
                <p className="mt-1 text-sm">
                  <Stars rating={shop.ratingAverage} />{" "}
                  <span className="text-slate-500">
                    {shop.ratingAverage.toFixed(1)} ({shop.reviewCount} avaliaç{shop.reviewCount === 1 ? "ão" : "ões"})
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <Link href={`/s/${shop.slug}/agendar`}
              className="rounded-2xl bg-cyan-400 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Agendar agora
            </Link>
            <Link href="/cliente"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-semibold text-slate-800 transition hover:border-cyan-300">
              Outras barbearias
            </Link>
          </div>
        </div>
      </section>

      {/* Abas */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={[
              "shrink-0 rounded-xl border px-4 py-2 text-sm transition",
              tab === t.key
                ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900",
            ].join(" ")}>
            {t.label}
            {t.soon && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] uppercase text-slate-400">breve</span>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "servicos" && (
          shop.services.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum serviço disponível no momento.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shop.services.map((service) => (
                <article key={service.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  {service.category && (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{service.category.name}</p>
                  )}
                  <p className="mt-2 text-lg font-semibold text-slate-900">{service.name}</p>
                  {service.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{service.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-sm text-slate-500">{formatDuration(service.durationMinutes)}</span>
                    <span className="text-sm font-semibold text-cyan-700">{money(service.price)}</span>
                  </div>
                  <Link href={`/s/${shop.slug}/agendar`}
                    className="mt-4 rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-center text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100">
                    Agendar este serviço
                  </Link>
                </article>
              ))}
            </div>
          )
        )}

        {tab === "detalhes" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="font-semibold text-slate-900">Sobre</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {shop.description || "Esta barbearia ainda não escreveu uma descrição."}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-3 text-sm">
              <h3 className="font-semibold text-slate-900">Contato e endereço</h3>
              {shop.address && (
                <p className="text-slate-600">📍 {shop.address}{shop.city ? ` — ${shop.city}` : ""}{shop.state ? `/${shop.state}` : ""}{shop.zipCode ? ` · CEP ${shop.zipCode}` : ""}</p>
              )}
              {!shop.address && (shop.city || shop.state) && (
                <p className="text-slate-600">📍 {[shop.city, shop.state].filter(Boolean).join("/")}</p>
              )}
              {shop.phone && <p className="text-slate-600">📞 {shop.phone}</p>}
              {shop.whatsapp && (
                <p>
                  <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                    className="text-green-600 hover:underline">💬 WhatsApp: {shop.whatsapp}</a>
                </p>
              )}
              {shop.email && <p className="text-slate-600">✉️ {shop.email}</p>}
              {!shop.phone && !shop.whatsapp && !shop.email && !shop.address && (
                <p className="text-slate-400">Sem informações de contato cadastradas.</p>
              )}
            </div>
          </div>
        )}

        {tab === "profissionais" && (
          shop.professionals.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shop.professionals.map((p) => (
                <article key={p.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-4">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.name} className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold text-slate-600">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400">Barbeiro</p>
                    </div>
                  </div>
                  {p.bio && <p className="mt-3 line-clamp-3 text-sm text-slate-500">{p.bio}</p>}
                  <Link href={`/s/${shop.slug}/agendar`}
                    className="mt-4 inline-block rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100">
                    Agendar com {p.name.split(" ")[0]}
                  </Link>
                </article>
              ))}
            </div>
          )
        )}

        {tab === "produtos" && (
          shop.products.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum produto à venda no momento.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shop.products.map((p) => (
                <article key={p.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  {p.category && (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{p.category}</p>
                  )}
                  <p className="mt-2 text-lg font-semibold text-slate-900">{p.name}</p>
                  {p.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className={`text-xs ${p.stockQuantity > 0 ? "text-green-600" : "text-red-600"}`}>
                      {p.stockQuantity > 0 ? "Disponível" : "Esgotado"}
                    </span>
                    <span className="text-sm font-semibold text-cyan-700">{money(p.salePrice)}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">Compre na barbearia — adicionado à sua comanda.</p>
                </article>
              ))}
            </div>
          )
        )}

        {tab === "fidelidade" && <ComingSoon title="Programa de fidelidade" />}
        {tab === "pacotes" && <ComingSoon title="Pacotes de serviços" />}
        {tab === "assinaturas" && <ComingSoon title="Assinaturas" />}

        {tab === "avaliacoes" && (
          shop.reviews.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-2xl">⭐</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Ainda sem avaliações</h3>
              <p className="mt-2 text-sm text-slate-500">Seja o primeiro a agendar e avaliar esta barbearia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shop.ratingAverage !== null && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-2xl font-bold text-slate-900">
                    {shop.ratingAverage.toFixed(1)} <Stars rating={shop.ratingAverage} />
                  </p>
                  <p className="text-sm text-slate-500">{shop.reviewCount} avaliaç{shop.reviewCount === 1 ? "ão" : "ões"}</p>
                </div>
              )}
              {shop.reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{r.customer?.name ?? "Cliente"}</p>
                    <Stars rating={r.rating} />
                  </div>
                  {r.professional && <p className="mt-0.5 text-xs text-slate-400">Atendido por {r.professional.name}</p>}
                  {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
                  <p className="mt-2 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      </div>
    </main>
  );
}
