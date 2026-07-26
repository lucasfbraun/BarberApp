"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Fluxo de agendamento da barbearia (área do cliente).
 *
 * 1. servico  — escolhe o que vai fazer
 * 2. agenda   — faixa de dias + profissional + horários livres na mesma tela
 * 3. resumo   — confere e confirma (nome/telefone vêm da conta logada)
 * 4. ok       — comprovante
 *
 * Exige login: sem sessão, manda para /cliente/login e volta para cá.
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

/* ────────────────────────────────────────────────── helpers */

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

function longDate(iso: string) {
  return capitalize(
    fromISODate(iso).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
  );
}

/* ────────────────────────────────────────────────── ícones */

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* ────────────────────────────────────────────────── UI compartilhada */

function Header({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ChevronLeft />
        </button>

        <h1 className="truncate text-center text-base font-bold text-slate-900">{title}</h1>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center">{right}</div>
      </div>
    </header>
  );
}

/** Cartão de aviso — mesmo padrão em "sem profissional" e "sem horário". */
function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="mt-0.5 shrink-0">
        <ClockIcon />
      </span>
      <p className="text-sm leading-5 text-slate-400">{children}</p>
    </div>
  );
}

function Avatar({
  professional,
  selected,
}: {
  professional: ProfessionalItem;
  selected: boolean;
}) {
  const ring = selected ? "ring-2 ring-blue-600 ring-offset-2" : "ring-1 ring-slate-200";
  return professional.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={professional.photoUrl}
      alt={professional.name}
      className={`h-16 w-16 rounded-full object-cover ${ring}`}
    />
  ) : (
    <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 ${ring}`}>
      {professional.name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ────────────────────────────────────────────────── faixa de datas */

function DateStrip({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (iso: string) => void;
}) {
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

  // Mantém o dia escolhido visível ao pular por uma data distante.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selected]);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-1.5">
        {days.map((day) => {
          const iso = toISODate(day);
          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              onClick={() => onSelect(iso)}
              className="flex w-12 shrink-0 flex-col items-center gap-1.5 rounded-2xl py-1"
            >
              <span className="text-xs text-slate-400">{WEEKDAYS[day.getDay()]}</span>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                  isSelected ? "bg-slate-900 text-white" : "text-slate-800 hover:bg-slate-200"
                }`}
              >
                {day.getDate()}
              </span>
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

  /* Só os profissionais que fazem o serviço escolhido. */
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
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Carregando…</p>
      </main>
    );
  }

  if (!barbershop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4">
        <p className="text-sm text-slate-500">Barbearia não encontrada.</p>
        <Link href="/cliente" className="text-sm font-semibold text-blue-600 hover:underline">
          Voltar
        </Link>
      </main>
    );
  }

  /* ── comprovante ── */

  if (step === "ok" && confirmed) {
    const dt = new Date(confirmed.startsAt);
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-800">
        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-900">Horário reservado!</h2>
            <p className="mt-1 text-sm text-slate-500">
              Nada foi cobrado agora — você paga em {barbershop.name}.
            </p>

            <div className="mt-6 space-y-2.5 rounded-2xl bg-slate-50 p-4 text-left text-sm">
              <Row label="Serviço" value={confirmed.service.name} />
              <Row label="Profissional" value={confirmed.professional.name} />
              <Row
                label="Data"
                value={capitalize(
                  dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
                )}
              />
              <Row
                label="Horário"
                value={dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              />
            </div>

            <Link
              href="/cliente/agendamentos"
              className="mt-6 block rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Ver meus agendamentos
            </Link>
            <Link
              href={`/s/${encodeURIComponent(slug)}`}
              className="mt-2 block rounded-2xl px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700"
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
      <main className="min-h-screen bg-slate-100 pb-10 text-slate-800">
        <Header
          title="Escolha o serviço"
          onBack={() => router.push(`/s/${encodeURIComponent(slug)}`)}
        />

        <div className="mx-auto max-w-lg px-4 pt-5">
          {barbershop.services.length === 0 ? (
            <InfoCard>Esta barbearia ainda não cadastrou serviços.</InfoCard>
          ) : (
            <div className="space-y-2.5">
              {barbershop.services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setService(s);
                    setProfessional(null);
                    setSlot(null);
                    setStep("agenda");
                  }}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-blue-300"
                >
                  <div className="min-w-0">
                    {s.category && (
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        {s.category.name}
                      </p>
                    )}
                    <p className="truncate text-base font-semibold text-slate-900">{s.name}</p>
                    {s.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{s.description}</p>
                    )}
                    <p className="mt-1.5 text-xs text-slate-400">
                      {formatDuration(s.durationMinutes)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-blue-600">
                    {formatPrice(s.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  /* ── 2. profissional + agenda ── */

  if (step === "agenda") {
    const monthLabel = capitalize(
      fromISODate(date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    );

    return (
      <main className="min-h-screen bg-slate-100 pb-10 text-slate-800">
        <Header
          title={monthLabel}
          onBack={() => setStep("servico")}
          right={
            // O input cobre o botão: um toque abre o seletor nativo do sistema.
            <div className="relative h-10 w-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
                <CalendarIcon />
              </div>
              <input
                type="date"
                aria-label="Escolher outra data"
                value={date}
                min={toISODate(new Date())}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          }
        />

        <div className="mx-auto max-w-lg px-4">
          <div className="pt-3">
            <DateStrip selected={date} onSelect={setDate} />
          </div>

          <div className="mt-4 border-t border-slate-200 pt-5">
            <h2 className="text-lg font-bold text-slate-900">Selecione o profissional</h2>

            {professionals.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Nenhum profissional realiza este serviço no momento.
              </p>
            ) : (
              <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-4">
                  {professionals.map((p) => {
                    const isSelected = professional?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProfessional(p)}
                        className="flex w-20 shrink-0 flex-col items-center gap-2"
                      >
                        <Avatar professional={p} selected={isSelected} />
                        <span
                          className={`w-full truncate text-center text-xs ${
                            isSelected ? "font-semibold text-blue-600" : "text-slate-600"
                          }`}
                        >
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5">
            {!professional ? (
              <InfoCard>
                Escolha um profissional para buscar os horários disponíveis para agendamento
              </InfoCard>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">Horários</h2>
                  <span className="text-xs text-slate-400">{longDate(date)}</span>
                </div>

                {slotsLoading && (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="h-11 animate-pulse rounded-2xl bg-slate-200" />
                    ))}
                  </div>
                )}

                {!slotsLoading && slotsError && (
                  <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {slotsError}
                  </p>
                )}

                {!slotsLoading && !slotsError && slots.length === 0 && (
                  <div className="mt-4">
                    <InfoCard>
                      {professional.name} não tem horário livre neste dia. Tente outra data.
                    </InfoCard>
                  </div>
                )}

                {!slotsLoading && slots.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.startsAt}
                        type="button"
                        onClick={() => {
                          setSlot(s);
                          setStep("resumo");
                        }}
                        className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
                      >
                        {slotLabel(s.startsAt)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  /* ── 3. resumo ── */

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-800">
      <Header title="Confirmar agendamento" onBack={() => setStep("agenda")} />

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg px-4 pt-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2.5 text-sm">
            <Row label="Barbearia" value={barbershop.name} />
            <Row label="Serviço" value={service?.name ?? ""} />
            <Row label="Profissional" value={professional?.name ?? ""} />
            <Row label="Data" value={longDate(date)} />
            <Row label="Horário" value={slot ? slotLabel(slot.startsAt) : ""} />
            <Row label="Duração" value={service ? formatDuration(service.durationMinutes) : ""} />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-sm text-slate-500">Valor</span>
            <span className="text-lg font-bold text-slate-900">
              {service ? formatPrice(service.price) : ""}
            </span>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-600">Observação (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex.: preferência de corte, alguma alergia…"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400"
          />
        </label>

        {submitError && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {submitError}
          </p>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          Nada é cobrado online. Você paga na barbearia.
        </p>

        <button
          type="submit"
          disabled={submitting || !slot}
          className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {submitting ? "Reservando…" : "Confirmar agendamento"}
        </button>
      </form>
    </main>
  );
}

/* ────────────────────────────────────────────────── util */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
