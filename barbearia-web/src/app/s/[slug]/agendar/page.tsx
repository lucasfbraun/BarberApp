"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BUTTON, HEADING, INPUT, LABEL, MUTED, TILE, TILE_OFF, TILE_ON, TITLE } from "@/lib/ui";

/**
 * Fluxo de agendamento da barbearia (área do cliente).
 *
 * 1. servico  — escolhe o que vai fazer
 * 2. agenda   — dia + profissional + horários livres na mesma tela
 * 3. resumo   — confere e confirma (nome/telefone vêm da conta logada)
 * 4. ok       — comprovante
 *
 * Exige login: sem sessão, manda para /cliente/login e volta para cá.
 * Linguagem visual em src/lib/ui.ts.
 */

/* ────────────────────────────────────────────────── types */

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  category: { name: string } | null;
  professionals: { professionalId: string }[];
}

interface ProfessionalItem {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  services: { serviceId: string }[];
}

interface Barbershop {
  id: string;
  name: string;
  slug: string;
  services: ServiceItem[];
  professionals: ProfessionalItem[];
}

/** O que /api/disponibilidade devolve — sem rótulo pronto. */
interface Slot {
  startsAt: string;
  endsAt: string;
}

type Step = "servico" | "agenda" | "resumo" | "ok";
type Period = "manha" | "tarde" | "noite";

/* ────────────────────────────────────────────────── helpers */

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const PERIOD_LABEL: Record<Period, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

/** Quantos dias para frente a faixa de datas oferece. */
const DAYS_AHEAD = 60;

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatPrice(price: number) {
  return Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Date -> "YYYY-MM-DD" no fuso local (sem passar por UTC). */
function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" -> Date local (evita o parse UTC do construtor). */
function fromISODate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Rótulo do horário. Derivado de startsAt — a API não manda "HH:MM". */
function slotLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function periodOf(iso: string): Period {
  const hour = new Date(iso).getHours();
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

function longDate(iso: string) {
  return fromISODate(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/* ────────────────────────────────────────────────── UI compartilhada */

/** Cabeçalho: link de voltar em texto, sem botão redondo. */
function TopBar({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <header className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-lg px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 transition hover:text-blue-600"
        >
          ← {label}
        </button>
      </div>
    </header>
  );
}

/** Aviso em linha, sem cartão nem sombra. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-blue-600 py-1 pl-4 text-sm leading-relaxed text-slate-500">
      {children}
    </p>
  );
}

/* ────────────────────────────────────────────────── faixa de datas */

function DateStrip({ selected, onSelect }: { selected: string; onSelect: (iso: string) => void }) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  const days = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selected]);

  return (
    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Blocos retangulares, não círculos: dia da semana em cima, número grande embaixo. */}
      <div className="flex">
        {days.map((day, index) => {
          const iso = toISODate(day);
          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              onClick={() => onSelect(iso)}
              className={`w-14 shrink-0 border-y border-r py-3 text-center transition ${
                index === 0 ? "border-l" : ""
              } ${isSelected ? TILE_ON : "border-slate-200 hover:border-slate-400"}`}
            >
              <span
                className={`block text-[10px] uppercase tracking-[0.14em] ${
                  isSelected ? "text-slate-400" : "text-slate-400"
                }`}
              >
                {WEEKDAYS[day.getDay()]}
              </span>
              <span className="mt-1 block text-lg font-semibold tabular-nums">{day.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────── página */

export default function AgendarPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params?.slug ?? "");
  const router = useRouter();

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("servico");

  const [service, setService] = useState<ServiceItem | null>(null);
  const [professional, setProfessional] = useState<ProfessionalItem | null>(null);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [slot, setSlot] = useState<Slot | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState<{
    id: string;
    startsAt: string;
    professional: { name: string };
    service: { name: string };
    customer: { name: string };
  } | null>(null);

  /* Sessão obrigatória: sem login não dá para reservar horário. */
  useEffect(() => {
    fetch("/api/cliente/me")
      .then(async (r) => {
        if (r.status === 401) {
          const target = `/s/${encodeURIComponent(slug)}/agendar`;
          router.push(`/cliente/login?callbackUrl=${encodeURIComponent(target)}`);
          return;
        }
        if (r.ok) {
          const data = await r.json();
          setCustomerName((prev) => prev || data.user?.name || "");
          setCustomerPhone((prev) => prev || data.user?.phone || "");
        }
      })
      .catch(() => null);
  }, [slug, router]);

  useEffect(() => {
    fetch(`/api/public/barbershop/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(({ barbershop }) => setBarbershop(barbershop))
      .catch(() => setBarbershop(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const professionals = useMemo(
    () =>
      barbershop?.professionals.filter(
        (p) => !service || p.services.some((s) => s.serviceId === service.id),
      ) ?? [],
    [barbershop, service],
  );

  const loadSlots = useCallback(async () => {
    if (!professional || !service) return;
    setSlotsLoading(true);
    setSlotsError("");
    setSlot(null);
    try {
      const qs = new URLSearchParams({
        professionalId: professional.id,
        serviceId: service.id,
        date,
      });
      const res = await fetch(`/api/disponibilidade?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar horários.");
      setSlots(data.slots as Slot[]);
    } catch (err: unknown) {
      setSlotsError(err instanceof Error ? err.message : "Erro ao buscar horários.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [professional, service, date]);

  useEffect(() => {
    if (step !== "agenda") return;
    if (!professional) {
      setSlots([]);
      return;
    }
    void loadSlots();
  }, [step, professional, loadSlots]);

  /* Horários agrupados por período — lista, não grade solta de pílulas. */
  const slotsByPeriod = useMemo(() => {
    const groups: Record<Period, Slot[]> = { manha: [], tarde: [], noite: [] };
    for (const s of slots) groups[periodOf(s.startsAt)].push(s);
    return (Object.keys(groups) as Period[])
      .filter((p) => groups[p].length > 0)
      .map((p) => ({ period: p, items: groups[p] }));
  }, [slots]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!professional || !service || !slot || !customerName.trim()) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/public/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: professional.id,
          serviceId: service.id,
          startsAt: slot.startsAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao agendar.");
      setConfirmed(data.appointment);
      setStep("ok");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao agendar.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── carregando / inexistente ── */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className={MUTED}>Carregando…</p>
      </main>
    );
  }

  if (!barbershop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white px-5">
        <p className={MUTED}>Barbearia não encontrada.</p>
        <Link href="/cliente" className="text-sm font-medium text-slate-900 underline underline-offset-4">
          Voltar
        </Link>
      </main>
    );
  }

  /* ── comprovante ── */

  if (step === "ok" && confirmed) {
    const dt = new Date(confirmed.startsAt);
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-lg px-5 py-16">
          <p className={LABEL}>Reservado</p>
          <h1 className={`${TITLE} mt-3`}>
            {capitalize(dt.toLocaleDateString("pt-BR", { weekday: "long" }))}, {dt.getDate()} de{" "}
            {dt.toLocaleDateString("pt-BR", { month: "long" })}
          </h1>
          <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">
            {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>

          <dl className="mt-10 border-t border-slate-200">
            <Row label="Barbearia" value={barbershop.name} />
            <Row label="Serviço" value={confirmed.service.name} />
            <Row label="Profissional" value={confirmed.professional.name} />
          </dl>

          <p className="mt-8 text-sm leading-relaxed text-slate-500">
            Nada foi cobrado agora. O pagamento é feito na barbearia.
          </p>

          <div className="mt-8 space-y-3">
            <Link href="/cliente/agendamentos" className={`${BUTTON} block text-center`}>
              Ver meus agendamentos
            </Link>
            <Link
              href={`/s/${encodeURIComponent(slug)}`}
              className="block py-3 text-center text-sm text-slate-500 transition hover:text-slate-900"
            >
              Voltar para a barbearia
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ── 1. serviço ── */

  if (step === "servico") {
    return (
      <main className="min-h-screen bg-slate-50 pb-16 text-slate-900">
        <TopBar onBack={() => router.push(`/s/${encodeURIComponent(slug)}`)} label={barbershop.name} />

        <div className="mx-auto max-w-lg px-5">
          <div className="py-10">
            <p className={LABEL}>Etapa 1 de 3</p>
            <h1 className={`${TITLE} mt-3`}>O que você vai fazer?</h1>
          </div>

          {barbershop.services.length === 0 ? (
            <Notice>Esta barbearia ainda não cadastrou serviços.</Notice>
          ) : (
            /* Lista com divisória fina — sem cartão, sem sombra. */
            <ul className="border-t border-slate-200">
              {barbershop.services.map((s) => (
                <li key={s.id} className="border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setService(s);
                      setProfessional(null);
                      setSlot(null);
                      setStep("agenda");
                    }}
                    className="group flex w-full items-baseline justify-between gap-6 py-5 text-left"
                  >
                    <span className="min-w-0">
                      {s.category && <span className={`${LABEL} block`}>{s.category.name}</span>}
                      <span className="mt-1 block text-lg font-medium tracking-tight group-hover:underline group-hover:underline-offset-4">
                        {s.name}
                      </span>
                      {s.description && (
                        <span className="mt-1 block line-clamp-1 text-sm text-slate-500">
                          {s.description}
                        </span>
                      )}
                      <span className="mt-2 block text-xs text-slate-400">
                        {formatDuration(s.durationMinutes)}
                      </span>
                    </span>
                    <span className="shrink-0 text-base font-medium tabular-nums">
                      {formatPrice(s.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    );
  }

  /* ── 2. dia + profissional + horários ── */

  if (step === "agenda") {
    const monthLabel = capitalize(
      fromISODate(date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    );

    return (
      <main className="min-h-screen bg-slate-50 pb-16 text-slate-900">
        <TopBar onBack={() => setStep("servico")} label={service?.name ?? "Serviço"} />

        <div className="mx-auto max-w-lg px-5">
          <div className="py-10">
            <p className={LABEL}>Etapa 2 de 3</p>
            <h1 className={`${TITLE} mt-3`}>Quando e com quem?</h1>
          </div>

          {/* Dia */}
          <div className="flex items-baseline justify-between gap-4 pb-4">
            <h2 className={HEADING}>{monthLabel}</h2>
            <div className="relative">
              <span className="text-xs text-slate-500 underline underline-offset-4">
                Escolher data
              </span>
              <input
                type="date"
                aria-label="Escolher outra data"
                value={date}
                min={toISODate(new Date())}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          </div>
          <DateStrip selected={date} onSelect={setDate} />

          {/* Profissional — grade de retratos, não fileira de círculos */}
          <section className="mt-12">
            <h2 className={LABEL}>Profissional</h2>

            {professionals.length === 0 ? (
              <div className="mt-4">
                <Notice>Nenhum profissional realiza este serviço no momento.</Notice>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6">
                {professionals.map((p) => {
                  const isSelected = professional?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProfessional(p)}
                      className="text-left"
                    >
                      <span
                        className={`block aspect-[3/4] w-full overflow-hidden border transition ${
                          isSelected ? "border-blue-600" : "border-slate-200"
                        }`}
                      >
                        {p.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className={`h-full w-full object-cover transition ${
                              isSelected ? "" : "grayscale hover:grayscale-0"
                            }`}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-slate-100 text-3xl font-light text-slate-400">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span
                        className={`mt-2 block text-sm ${
                          isSelected ? "font-semibold text-blue-600" : "text-slate-600"
                        }`}
                      >
                        {p.name}
                      </span>
                      {p.bio && (
                        <span className="mt-0.5 block line-clamp-1 text-xs text-slate-400">
                          {p.bio}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Horários — agrupados por período */}
          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className={LABEL}>Horários</h2>
              <span className="text-xs text-slate-400">{longDate(date)}</span>
            </div>

            {!professional ? (
              <div className="mt-4">
                <Notice>
                  Escolha um profissional acima para ver os horários livres deste dia.
                </Notice>
              </div>
            ) : slotsLoading ? (
              <div className="mt-5 grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="h-11 animate-pulse bg-slate-100" />
                ))}
              </div>
            ) : slotsError ? (
              <p className="mt-4 border-l-2 border-red-600 py-1 pl-4 text-sm text-red-600">
                {slotsError}
              </p>
            ) : slots.length === 0 ? (
              <div className="mt-4">
                <Notice>{professional.name} não tem horário livre neste dia. Tente outra data.</Notice>
              </div>
            ) : (
              <div className="mt-5 space-y-7">
                {slotsByPeriod.map(({ period, items }) => (
                  <div key={period}>
                    <p className="text-xs font-medium text-slate-900">{PERIOD_LABEL[period]}</p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {items.map((s) => (
                        <button
                          key={s.startsAt}
                          type="button"
                          onClick={() => {
                            setSlot(s);
                            setStep("resumo");
                          }}
                          className={`${TILE} ${TILE_OFF} py-3 font-medium tabular-nums`}
                        >
                          {slotLabel(s.startsAt)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  /* ── 3. resumo ── */

  return (
    <main className="min-h-screen bg-slate-50 pb-16 text-slate-900">
      <TopBar onBack={() => setStep("agenda")} label="Horários" />

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg px-5">
        <div className="py-10">
          <p className={LABEL}>Etapa 3 de 3</p>
          <h1 className={`${TITLE} mt-3`}>Confirmar</h1>
        </div>

        {/* Data e hora em destaque tipográfico, no lugar do cartão de resumo. */}
        <p className="text-sm text-slate-500">{capitalize(longDate(date))}</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">
          {slot ? slotLabel(slot.startsAt) : "--:--"}
        </p>

        <dl className="mt-10 border-t border-slate-200">
          <Row label="Barbearia" value={barbershop.name} />
          <Row label="Serviço" value={service?.name ?? ""} />
          <Row label="Profissional" value={professional?.name ?? ""} />
          <Row label="Duração" value={service ? formatDuration(service.durationMinutes) : ""} />
          <Row label="Valor" value={service ? formatPrice(service.price) : ""} strong />
        </dl>

        <label className="mt-10 block">
          <span className={LABEL}>Observação (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Preferência de corte, alguma alergia…"
            className={`${INPUT} mt-2 resize-none`}
          />
        </label>

        {submitError && (
          <p className="mt-6 border-l-2 border-red-600 py-1 pl-4 text-sm text-red-600">
            {submitError}
          </p>
        )}

        <p className="mt-8 text-xs leading-relaxed text-slate-400">
          Nada é cobrado online. O pagamento é feito na barbearia.
        </p>

        <button type="submit" disabled={submitting || !slot} className={`${BUTTON} mt-4`}>
          {submitting ? "Reservando…" : "Confirmar agendamento"}
        </button>
      </form>
    </main>
  );
}

/* ────────────────────────────────────────────────── util */

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-slate-200 py-3.5">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className={`text-right text-sm ${strong ? "font-semibold" : "font-medium"} text-slate-900`}>
        {value}
      </dd>
    </div>
  );
}
