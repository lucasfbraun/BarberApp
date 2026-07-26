"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import InstallPrompt from "@/components/InstallPrompt";
import { BUTTON, LABEL, MUTED, TITLE } from "@/lib/ui";

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

type CartAppointment = {
  id: string; startsAt: string;
  professional: { name: string } | null;
  service: { name: string; price: number } | null;
};
type CartItem = {
  id: string; name: string; quantity: number; unitPrice: number; total: number;
};
type Cart = {
  appointments: CartAppointment[];
  order: { id: string; items: CartItem[] } | null;
  totals: { services: number; products: number; estimated: number };
  count: number;
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
    <span className="text-neutral-900">
      {"★".repeat(Math.round(rating))}
      <span className="text-neutral-300">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}
function ComingSoon({ title }: { title: string }) {
  return (
    <p className="border-l-2 border-neutral-900 py-1 pl-4 text-sm leading-relaxed text-neutral-500">
      <span className="block font-medium text-neutral-900">{title} em breve</span>
      Esta barbearia ainda não ativou este recurso.
    </p>
  );
}

/** Linha de informação — rótulo à esquerda, valor à direita. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-neutral-200 py-3.5">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

export default function PublicBarbershopPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params?.slug ?? "");
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("servicos");

  // Carrinho (reservas): serviços agendados + produtos encomendados.
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartBusy, setCartBusy] = useState("");
  const [cartMsg, setCartMsg] = useState("");

  const loadCart = useCallback(async () => {
    if (!slug) return;
    const res = await fetch(`/api/cliente/carrinho?slug=${encodeURIComponent(slug)}`);
    if (res.ok) setCart(await res.json());
    else setCart(null); // deslogado: carrinho aparece vazio
  }, [slug]);

  useEffect(() => { loadCart(); }, [loadCart]);

  function goLogin() {
    router.push(`/cliente/login?callbackUrl=${encodeURIComponent(`/s/${slug}`)}`);
  }

  async function addToCart(productId: string) {
    setCartBusy(productId);
    setCartMsg("");
    const res = await fetch("/api/cliente/carrinho/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, productId, quantity: 1 }),
    });
    if (res.status === 401) { goLogin(); return; }
    if (res.ok) {
      await loadCart();
      setCartOpen(true);
    } else {
      setCartMsg((await res.json()).error ?? "Erro ao adicionar.");
      setCartOpen(true);
    }
    setCartBusy("");
  }

  async function removeProduct(itemId: string) {
    setCartBusy(itemId);
    setCartMsg("");
    const res = await fetch(`/api/cliente/carrinho/produtos?itemId=${encodeURIComponent(itemId)}`, {
      method: "DELETE",
    });
    if (!res.ok) setCartMsg((await res.json()).error ?? "Erro ao remover.");
    await loadCart();
    setCartBusy("");
  }

  async function removeAppointment(id: string) {
    setCartBusy(id);
    setCartMsg("");
    const res = await fetch(`/api/cliente/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (!res.ok) setCartMsg((await res.json()).error ?? "Erro ao remover reserva.");
    await loadCart();
    setCartBusy("");
  }

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/barbershop/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(({ barbershop }) => setShop(barbershop ?? null))
      .catch(() => setShop(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-white text-sm text-neutral-400">Carregando…</main>;
  }
  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white text-neutral-500">
        <p className="text-sm">Barbearia não encontrada.</p>
        <Link href="/cliente" className="text-sm text-neutral-900 underline underline-offset-4">Ver todas as barbearias</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900"><div className="mx-auto w-full max-w-3xl px-5 pb-24">
      {/* Capa em faixa larga, sem moldura arredondada */}
      {shop.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shop.coverImageUrl} alt="" className="-mx-5 h-40 w-[calc(100%+2.5rem)] max-w-none object-cover" />
      )}

      <section className={shop.coverImageUrl ? "pt-8" : "pt-12"}>
        <Link href="/cliente" className={`${LABEL} transition hover:text-neutral-900`}>
          ← Barbearias
        </Link>

        <div className="mt-5 flex items-start gap-5">
          {shop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logoUrl} alt={shop.name} className="h-16 w-16 shrink-0 border border-neutral-200 object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-2xl font-light text-neutral-400">
              {shop.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className={TITLE}>{shop.name}</h1>
            <p className={`${MUTED} mt-1`}>
              {[shop.city, shop.state].filter(Boolean).join(" · ") || `/${shop.slug}`}
            </p>
            {shop.ratingAverage !== null && (
              <p className="mt-1 text-sm text-neutral-500">
                <Stars rating={shop.ratingAverage} />{" "}
                {shop.ratingAverage.toFixed(1)} · {shop.reviewCount} avaliaç{shop.reviewCount === 1 ? "ão" : "ões"}
              </p>
            )}
          </div>
        </div>

        <Link href={`/s/${shop.slug}/agendar`} className={`${BUTTON} mt-7 block text-center`}>
          Agendar horário
        </Link>
      </section>

      {/* Abas: texto sublinhado, não pílulas */}
      <div className="-mx-5 mt-10 overflow-x-auto border-b border-neutral-200 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-7">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={[
                "shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm transition",
                tab === t.key
                  ? "border-neutral-900 font-medium text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-900",
              ].join(" ")}>
              {t.label}
              {t.soon && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-neutral-300">breve</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {tab === "servicos" && (
          shop.services.length === 0 ? (
            <p className={MUTED}>Nenhum serviço disponível no momento.</p>
          ) : (
            <ul className="border-t border-neutral-200">
              {shop.services.map((service) => (
                <li key={service.id} className="border-b border-neutral-200">
                  <Link href={`/s/${shop.slug}/agendar`} className="group flex items-baseline justify-between gap-6 py-5">
                    <span className="min-w-0">
                      {service.category && <span className={`${LABEL} block`}>{service.category.name}</span>}
                      <span className="mt-1 block text-lg font-medium tracking-tight group-hover:underline group-hover:underline-offset-4">
                        {service.name}
                      </span>
                      {service.description && (
                        <span className="mt-1 block line-clamp-1 text-sm text-neutral-500">{service.description}</span>
                      )}
                      <span className="mt-2 block text-xs text-neutral-400">{formatDuration(service.durationMinutes)}</span>
                    </span>
                    <span className="shrink-0 text-base font-medium tabular-nums">{money(service.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "detalhes" && (
          <div className="space-y-10">
            <div>
              <h3 className={LABEL}>Sobre</h3>
              <p className="mt-3 text-base leading-relaxed text-neutral-600">
                {shop.description || "Esta barbearia ainda não escreveu uma descrição."}
              </p>
            </div>
            <div>
              <h3 className={LABEL}>Contato e endereço</h3>
              <dl className="mt-3 border-t border-neutral-200 text-sm">
                {shop.address && (
                  <InfoRow label="Endereço" value={`${shop.address}${shop.city ? ` — ${shop.city}` : ""}${shop.state ? `/${shop.state}` : ""}${shop.zipCode ? ` · CEP ${shop.zipCode}` : ""}`} />
                )}
                {!shop.address && (shop.city || shop.state) && (
                  <InfoRow label="Cidade" value={[shop.city, shop.state].filter(Boolean).join("/")} />
                )}
                {shop.phone && <InfoRow label="Telefone" value={shop.phone} />}
                {shop.whatsapp && (
                  <div className="flex items-baseline justify-between gap-6 border-b border-neutral-200 py-3.5">
                    <dt className="shrink-0 text-neutral-500">WhatsApp</dt>
                    <dd className="text-right">
                      <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                        className="font-medium text-neutral-900 underline underline-offset-4">{shop.whatsapp}</a>
                    </dd>
                  </div>
                )}
                {shop.email && <InfoRow label="E-mail" value={shop.email} />}
                {!shop.phone && !shop.whatsapp && !shop.email && !shop.address && (
                  <p className="py-3.5 text-neutral-400">Sem informações de contato cadastradas.</p>
                )}
              </dl>
            </div>
          </div>
        )}

        {tab === "profissionais" && (
          shop.professionals.length === 0 ? (
            <p className={MUTED}>Nenhum profissional cadastrado.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
              {shop.professionals.map((p) => (
                <div key={p.id}>
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrl} alt={p.name} className="aspect-[3/4] w-full border border-neutral-200 object-cover grayscale transition hover:grayscale-0" />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center border border-neutral-200 bg-neutral-50 text-3xl font-light text-neutral-400">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="mt-3 text-sm font-medium tracking-tight">{p.name}</p>
                  {p.bio && <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{p.bio}</p>}
                  <Link href={`/s/${shop.slug}/agendar`}
                    className="mt-2 inline-block text-xs text-neutral-500 underline underline-offset-4 transition hover:text-neutral-900">
                    Agendar
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "produtos" && (
          shop.products.length === 0 ? (
            <p className={MUTED}>Nenhum produto à venda no momento.</p>
          ) : (
            <ul className="border-t border-neutral-200">
              {shop.products.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-6 border-b border-neutral-200 py-5">
                  <div className="min-w-0">
                    {p.category && <p className={LABEL}>{p.category}</p>}
                    <p className="mt-1 text-base font-medium tracking-tight">{p.name}</p>
                    {p.description && <p className="mt-1 line-clamp-1 text-sm text-neutral-500">{p.description}</p>}
                    <p className={`mt-2 text-xs ${p.stockQuantity > 0 ? "text-neutral-400" : "text-red-600"}`}>
                      {p.stockQuantity > 0 ? "Disponível · reserve e pague na barbearia" : "Esgotado"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-medium tabular-nums">{money(p.salePrice)}</p>
                    <button
                      disabled={p.stockQuantity <= 0 || cartBusy === p.id}
                      onClick={() => addToCart(p.id)}
                      className="mt-2 border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:border-neutral-900 disabled:opacity-30">
                      {cartBusy === p.id ? "Reservando…" : "Reservar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "fidelidade" && <ComingSoon title="Programa de fidelidade" />}
        {tab === "pacotes" && <ComingSoon title="Pacotes de serviços" />}
        {tab === "assinaturas" && <ComingSoon title="Assinaturas" />}

        {tab === "avaliacoes" && (
          shop.reviews.length === 0 ? (
            <p className="border-l-2 border-neutral-900 py-1 pl-4 text-sm text-neutral-500">
              Ainda sem avaliações. Seja o primeiro a agendar e avaliar esta barbearia.
            </p>
          ) : (
            <div>
              {shop.ratingAverage !== null && (
                <div className="pb-6">
                  <p className="text-5xl font-semibold tracking-tight tabular-nums">
                    {shop.ratingAverage.toFixed(1)}
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">
                    <Stars rating={shop.ratingAverage} /> · {shop.reviewCount} avaliaç
                    {shop.reviewCount === 1 ? "ão" : "ões"}
                  </p>
                </div>
              )}
              <ul className="border-t border-neutral-200">
                {shop.reviews.map((r) => (
                  <li key={r.id} className="border-b border-neutral-200 py-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-sm font-medium">{r.customer?.name ?? "Cliente"}</p>
                      <Stars rating={r.rating} />
                    </div>
                    {r.professional && (
                      <p className="mt-0.5 text-xs text-neutral-400">Atendido por {r.professional.name}</p>
                    )}
                    {r.comment && <p className="mt-2 text-sm leading-relaxed text-neutral-600">{r.comment}</p>}
                    <p className="mt-2 text-xs text-neutral-400">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
      </div>

      {/* Convite para instalar — acima do botão flutuante do carrinho.
          Esta costuma ser a primeira tela do cliente (link da barbearia). */}
      {!cartOpen && <InstallPrompt bottomClass="bottom-24" />}

      {/* Botão flutuante do carrinho */}
      <button
        onClick={() => setCartOpen(true)}
        aria-label="Abrir reservas"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-neutral-900 px-5 py-3.5 text-sm font-medium tracking-wide text-white transition hover:bg-neutral-700"
      >
        Reservas
        {(cart?.count ?? 0) > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center bg-white px-1 text-xs font-semibold tabular-nums text-neutral-900">
            {cart!.count}
          </span>
        )}
      </button>

      {/* Drawer do carrinho */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-neutral-900/30" onClick={() => setCartOpen(false)}>
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-neutral-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-5">
              <h3 className="text-lg font-semibold tracking-tight text-neutral-900">Suas reservas</h3>
              <button onClick={() => setCartOpen(false)} aria-label="Fechar" className="text-neutral-400 hover:text-neutral-900">✕</button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-5 py-6">
              {cartMsg && (
                <p className="border-l-2 border-red-600 py-1 pl-4 text-sm text-red-600">{cartMsg}</p>
              )}

              {!cart || cart.count === 0 ? (
                <p className="border-l-2 border-neutral-900 py-1 pl-4 text-sm leading-relaxed text-neutral-500">
                  <span className="block font-medium text-neutral-900">Nada reservado ainda</span>
                  Reserve um horário ou adicione produtos.
                </p>
              ) : (
                <>
                  {/* Serviços reservados */}
                  {cart.appointments.length > 0 && (
                    <div>
                      <p className={LABEL}>Serviços reservados</p>
                      <ul className="mt-3 border-t border-neutral-200">
                        {cart.appointments.map((a) => (
                          <li key={a.id} className="border-b border-neutral-200 py-4">
                            <div className="flex items-baseline justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900">{a.service?.name ?? "Serviço"}</p>
                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {a.professional ? `com ${a.professional.name} · ` : ""}
                                  {new Date(a.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}{" "}
                                  às {new Date(a.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-medium tabular-nums">{money(Number(a.service?.price ?? 0))}</span>
                            </div>
                            <button
                              disabled={cartBusy === a.id}
                              onClick={() => removeAppointment(a.id)}
                              className="mt-2 text-xs text-red-600 underline underline-offset-4 disabled:opacity-40">
                              {cartBusy === a.id ? "Removendo…" : "Remover reserva"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Produtos */}
                  {cart.order && cart.order.items.length > 0 && (
                    <div>
                      <p className={LABEL}>Produtos</p>
                      <ul className="mt-3 border-t border-neutral-200">
                        {cart.order.items.map((i) => (
                          <li key={i.id} className="flex items-baseline justify-between gap-4 border-b border-neutral-200 py-4">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-neutral-900">{i.name}</p>
                              <p className="mt-0.5 text-xs text-neutral-500">{i.quantity}× · {money(Number(i.unitPrice))}</p>
                              <button
                                disabled={cartBusy === i.id}
                                onClick={() => removeProduct(i.id)}
                                className="mt-2 text-xs text-red-600 underline underline-offset-4 disabled:opacity-40">
                                {cartBusy === i.id ? "Removendo…" : "Remover"}
                              </button>
                            </div>
                            <span className="shrink-0 text-sm font-medium tabular-nums">{money(Number(i.total))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-neutral-200 px-5 py-5">
              {cart && cart.count > 0 && (
                <div className="flex items-baseline justify-between pb-4">
                  <span className="text-sm text-neutral-500">Total estimado</span>
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">
                    {money(cart.totals.estimated)}
                  </span>
                </div>
              )}
              <p className="text-xs leading-relaxed text-neutral-400">
                Nada é cobrado agora. Tudo fica reservado e você paga na barbearia.
              </p>
              <Link href={`/s/${slug}/agendar`} className={`${BUTTON} mt-4 block text-center`}>
                {cart && cart.appointments.length > 0 ? "Reservar outro serviço" : "Reservar um serviço"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
