"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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

interface TimeSlot {
  time: string;
  startsAt: string;
}

type Step = 1 | 2 | 3 | 4 | 5; // 5 = confirmação

/* ────────────────────────────────────────────────── helpers */

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ────────────────────────────────────────────────── step indicator */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
              n < current
                ? "bg-cyan-400 text-slate-950"
                : n === current
                  ? "border-2 border-cyan-400 bg-transparent text-cyan-700"
                  : "border border-slate-300 bg-transparent text-slate-400"
            }`}
          >
            {n < current ? "✓" : n}
          </div>
          {n < total && (
            <div className={`h-px w-6 ${n < current ? "bg-cyan-400" : "bg-slate-100"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────── main */

export default function AgendarPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const router = useRouter();

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);

  // Selections
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Customer form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Slots
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmedAppointment, setConfirmedAppointment] = useState<{
    id: string;
    startsAt: string;
    professional: { name: string };
    service: { name: string };
    customer: { name: string };
  } | null>(null);

  /* exige login do cliente: sem sessao, redireciona para o login
     com retorno para esta pagina; logado, pre-preenche nome/telefone */
  useEffect(() => {
    fetch("/api/cliente/me").then(async (r) => {
      if (r.status === 401) {
        const target = `/s/${encodeURIComponent(slug)}/agendar`;
        router.push(`/login?callbackUrl=${encodeURIComponent(target)}`);
        return;
      }
      if (r.ok) {
        const data = await r.json();
        setCustomerName((prev) => prev || data.user?.name || "");
        setCustomerPhone((prev) => prev || data.user?.phone || "");
      }
    }).catch(() => null);
  }, [slug, router]);

  /* fetch barbershop */
  useEffect(() => {
    fetch(`/api/public/barbershop/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(({ barbershop }) => setBarbershop(barbershop))
      .catch(() => setBarbershop(null))
      .finally(() => setLoading(false));
  }, [slug]);

  /* fetch slots whenever professional, service or date changes */
  const fetchSlots = useCallback(async () => {
    if (!selectedProfessional || !selectedService) return;
    setSlotsLoading(true);
    setSlotsError("");
    setSelectedSlot(null);
    try {
      const qs = new URLSearchParams({
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        date: selectedDate,
      });
      const res = await fetch(`/api/disponibilidade?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar horários.");
      setSlots(data.slots as TimeSlot[]);
    } catch (err: unknown) {
      setSlotsError(err instanceof Error ? err.message : "Erro ao buscar horários.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedProfessional, selectedService, selectedDate]);

  useEffect(() => {
    if (step === 3 && selectedProfessional && selectedService) {
      void fetchSlots();
    }
  }, [step, fetchSlots, selectedProfessional, selectedService]);

  useEffect(() => {
    if (step === 3) {
      void fetchSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  /* professionals filtered by selected service */
  const availableProfessionals =
    barbershop?.professionals.filter(
      (p) =>
        !selectedService ||
        p.services.some((s) => s.serviceId === selectedService.id),
    ) ?? [];

  /* submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfessional || !selectedService || !selectedSlot || !customerName.trim()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/public/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: selectedProfessional.id,
          serviceId: selectedService.id,
          startsAt: selectedSlot.startsAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao agendar.");

      setConfirmedAppointment(data.appointment);
      setStep(5);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao agendar.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── loading ── */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Carregando…</p>
      </main>
    );
  }

  if (!barbershop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-sm text-slate-500">Barbearia não encontrada.</p>
        <Link href="/" className="text-sm text-cyan-400 underline-offset-4 hover:underline">
          Voltar
        </Link>
      </main>
    );
  }

  /* ── step 5: confirmation ── */
  if (step === 5 && confirmedAppointment) {
    const dt = new Date(confirmedAppointment.startsAt);
    const timeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dateStr2 = dt.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12"><div className="mx-auto w-full max-w-xl">
        <div className="w-full rounded-[32px] border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-3xl">
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">Agendamento confirmado!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Seu horário está reservado em <span className="text-slate-900">{barbershop.name}</span>.
          </p>

          <div className="mt-7 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
            <Row label="Cliente" value={confirmedAppointment.customer.name} />
            <Row label="Serviço" value={confirmedAppointment.service.name} />
            <Row label="Profissional" value={confirmedAppointment.professional.name} />
            <Row label="Data" value={dateStr2} />
            <Row label="Horário" value={timeStr} />
          </div>

          <Link
            href={`/s/${slug}`}
            className="mt-7 inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-cyan-300 hover:bg-cyan-50"
          >
            Voltar à barbearia
          </Link>
        </div>
        </div>
      </main>
    );
  }

  const stepLabels = ["Serviço", "Profissional", "Horário", "Dados"];

  return (
    <main className="min-h-screen bg-white"><div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
              {barbershop.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Agendar horário</h1>
          </div>
          <Link
            href={`/s/${slug}`}
            className="text-sm text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
          >
            Voltar
          </Link>
        </div>

        <div className="mt-5">
          <StepIndicator current={step} total={4} />
          <p className="mt-2 text-xs text-slate-500">
            Etapa {step} de 4 — {stepLabels[(step as number) - 1]}
          </p>
        </div>

        <div className="mt-7">
          {/* ── step 1: service ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Qual serviço você quer?</h2>
              {barbershop.services.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum serviço disponível no momento.</p>
              ) : (
                <div className="grid gap-3">
                  {barbershop.services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(s);
                        setSelectedProfessional(null);
                        setSelectedSlot(null);
                        setStep(2);
                      }}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                    >
                      <div>
                        {s.category && (
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            {s.category.name}
                          </p>
                        )}
                        <p className="mt-0.5 text-base font-semibold text-slate-900">{s.name}</p>
                        {s.description && (
                          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{s.description}</p>
                        )}
                        <p className="mt-2 text-sm text-slate-500">{formatDuration(s.durationMinutes)}</p>
                      </div>
                      <span className="ml-4 shrink-0 text-sm font-semibold text-cyan-700">
                        {formatPrice(s.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── step 2: professional ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Com quem você quer ser atendido?</h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
                >
                  ← Serviço
                </button>
              </div>

              {selectedService && (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                  Serviço: <span className="font-semibold">{selectedService.name}</span>
                </div>
              )}

              {availableProfessionals.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum profissional disponível para este serviço.</p>
              ) : (
                <div className="grid gap-3">
                  {availableProfessionals.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfessional(p);
                        setSelectedSlot(null);
                        setStep(3);
                      }}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-900">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        {p.bio && (
                          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{p.bio}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── step 3: date + slots ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Quando você quer vir?</h2>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
                >
                  ← Profissional
                </button>
              </div>

              {selectedProfessional && (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                  {selectedService?.name} com{" "}
                  <span className="font-semibold">{selectedProfessional.name}</span>
                </div>
              )}

              {/* Date picker */}
              <div>
                <label className="text-sm text-slate-600">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayISO()}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-400"
                />
                {selectedDate && (
                  <p className="mt-1 text-xs capitalize text-slate-500">{formatDate(selectedDate)}</p>
                )}
              </div>

              {/* Slots */}
              <div>
                <p className="text-sm text-slate-600">Horários disponíveis</p>
                {slotsLoading && (
                  <p className="mt-3 text-sm text-slate-500">Buscando horários…</p>
                )}
                {!slotsLoading && slotsError && (
                  <p className="mt-3 text-sm text-red-600">{slotsError}</p>
                )}
                {!slotsLoading && !slotsError && slots.length === 0 && (
                  <p className="mt-3 text-sm text-slate-500">
                    Nenhum horário disponível nesta data. Tente outro dia.
                  </p>
                )}
                {!slotsLoading && slots.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots.map((slot) => (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
                          selectedSlot?.startsAt === slot.startsAt
                            ? "border-cyan-400 bg-cyan-100 text-cyan-700"
                            : "border-slate-200 bg-slate-50 text-slate-800 hover:border-cyan-300 hover:bg-cyan-50"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="mt-2 w-full rounded-2xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Continuar com {selectedSlot.time}
                </button>
              )}
            </div>
          )}

          {/* ── step 4: customer data ── */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Seus dados</h2>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
                >
                  ← Horário
                </button>
              </div>

              {/* Resumo */}
              <div className="space-y-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
                <Row label="Serviço" value={selectedService?.name ?? ""} />
                <Row label="Profissional" value={selectedProfessional?.name ?? ""} />
                <Row
                  label="Data"
                  value={
                    selectedSlot
                      ? new Date(selectedSlot.startsAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                        })
                      : ""
                  }
                />
                <Row label="Horário" value={selectedSlot?.time ?? ""} />
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm text-slate-600">
                    Seu nome <span className="text-red-600">*</span>
                  </span>
                  <input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-slate-600">WhatsApp</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-slate-600">Observação</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Ex: cabelo longo, preferência de produto…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400"
                  />
                </label>
              </div>

              {submitError && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !customerName.trim()}
                className="w-full rounded-2xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Agendando…" : "Confirmar agendamento"}
              </button>
            </form>
          )}
        </div>
      </div>
      </div>
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
