"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ALERT,
  BUTTON,
  BUTTON_DANGER,
  BUTTON_GHOST,
  CHIP,
  INPUT,
  LABEL,
  MUTED,
  NOTICE,
  SELECT,
  SOURCE_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  TITLE,
  WEEKDAY_SHORT,
  formatLongDate,
  formatMoney,
  formatTime,
} from "@/lib/ui-pro";

/* Agenda do profissional (secao 4): visao diaria e semanal, com as transicoes
   de atendimento. Cada agendamento expande para mostrar as acoes — em vez de
   navegar para outra tela, porque a secao 27 pede poucos toques. */

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  source: string | null;
  cancellationReason?: string | null;
  rescheduledFrom?: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  service: { id: string; name: string; durationMinutes: number; price: number } | null;
  orderId: string | null;
  orderStatus: string | null;
};

type Block = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  type: string;
};

type Permissions = {
  canCreateAppointment: boolean;
  canReschedule: boolean;
  canCancelAppointment: boolean;
  canCreateWalkIn: boolean;
  canBlockSchedule: boolean;
};

type AgendaResponse = {
  view: "dia" | "semana";
  date: string;
  days: string[];
  timezone: string;
  isOwnAgenda: boolean;
  permissions: Permissions;
  appointments: Appointment[];
  blocks: Block[];
};

type Service = { id: string; name: string; durationMinutes: number; price: number };

function todayLocal(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<p className={`${MUTED} pt-16`}>Carregando…</p>}>
      <AgendaContent />
    </Suspense>
  );
}

function AgendaContent() {
  const params = useSearchParams();
  const router = useRouter();

  // Fuso provisorio ate a primeira resposta: so afeta o rotulo do primeiro
  // render, e a API devolve o fuso real da barbearia em seguida.
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [date, setDate] = useState(() => todayLocal("America/Sao_Paulo"));
  const [view, setView] = useState<"dia" | "semana">("dia");
  const [data, setData] = useState<AgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(params.get("foco"));
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(params.get("novo") === "1");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/profissional/agenda?date=${date}&view=${view}`);
    if (res.ok) {
      const body: AgendaResponse = await res.json();
      setData(body);
      setTimezone(body.timezone);
      setError(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Nao foi possivel carregar a agenda.");
    }
    setLoading(false);
  }, [date, view]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/profissional/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Nao foi possivel concluir a acao.");
        return false;
      }
      setError(null);
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function openOrder(appointment: Appointment) {
    if (appointment.orderId) {
      router.push(`/profissional/comanda/${appointment.orderId}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profissional/comandas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointment.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Nao foi possivel abrir a comanda.");
        return;
      }
      router.push(`/profissional/comanda/${body.order.id}`);
    } finally {
      setBusy(false);
    }
  }

  const permissions = data?.permissions;

  return (
    <div>
      <header className="pt-10">
        <p className={LABEL}>Agenda</p>
        <h1 className={`${TITLE} mt-3`}>{formatLongDate(date, timezone)}</h1>
      </header>

      {/* ── Controles de navegacao ────────────────────────────────────────── */}
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={() => setDate(shiftDate(date, view === "semana" ? -7 : -1))}
          aria-label="Periodo anterior"
          className={`${CHIP} w-12`}
        >
          ‹
        </button>
        <button onClick={() => setDate(todayLocal(timezone))} className={`${CHIP} flex-1`}>
          Hoje
        </button>
        <button
          onClick={() => setDate(shiftDate(date, view === "semana" ? 7 : 1))}
          aria-label="Proximo periodo"
          className={`${CHIP} w-12`}
        >
          ›
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        {(["dia", "semana"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 border px-4 py-2 text-sm transition ${
              view === v
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 text-slate-700 hover:border-blue-600"
            }`}
          >
            {v === "dia" ? "Dia" : "Semana"}
          </button>
        ))}
      </div>

      {error && <p className={`${ALERT} mt-6`}>{error}</p>}

      {permissions?.canCreateAppointment && (
        <button onClick={() => setShowNew((v) => !v)} className={`${BUTTON_GHOST} mt-4`}>
          {showNew ? "Fechar" : "Adicionar agendamento"}
        </button>
      )}

      {showNew && permissions?.canCreateAppointment && (
        <NewAppointmentForm
          date={date}
          canWalkIn={permissions.canCreateWalkIn}
          onDone={() => {
            setShowNew(false);
            load();
          }}
          onError={setError}
        />
      )}

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <p className={`${MUTED} mt-10`}>Carregando…</p>
      ) : !data ? null : view === "semana" ? (
        <WeekView
          data={data}
          onPickDay={(d) => {
            setDate(d);
            setView("dia");
          }}
        />
      ) : (
        <DayView
          data={data}
          expanded={expanded}
          onToggle={(id) => setExpanded((cur) => (cur === id ? null : id))}
          onAct={act}
          onOpenOrder={openOrder}
          busy={busy}
        />
      )}
    </div>
  );
}

/* ── visao diaria ──────────────────────────────────────────────────────────── */

function DayView({
  data,
  expanded,
  onToggle,
  onAct,
  onOpenOrder,
  busy,
}: {
  data: AgendaResponse;
  expanded: string | null;
  onToggle: (id: string) => void;
  onAct: (id: string, action: string, extra?: Record<string, unknown>) => Promise<boolean>;
  onOpenOrder: (a: Appointment) => void;
  busy: boolean;
}) {
  const { timezone, permissions } = data;

  return (
    <>
      {data.blocks.length > 0 && (
        <section className="mt-8">
          <h2 className={LABEL}>Bloqueios</h2>
          <ul className="mt-2 border-t border-slate-200">
            {data.blocks.map((b) => (
              <li key={b.id} className="border-b border-slate-200 py-3 text-sm">
                <span className="tabular-nums text-slate-500">
                  {formatTime(b.startsAt, timezone)} – {formatTime(b.endsAt, timezone)}
                </span>
                <span className="ml-3 text-slate-700">{b.reason ?? "Bloqueado"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className={LABEL}>
          {data.appointments.length} atendimento
          {data.appointments.length === 1 ? "" : "s"}
        </h2>

        {data.appointments.length === 0 ? (
          <p className={`${NOTICE} mt-4`}>Nenhum atendimento neste dia.</p>
        ) : (
          <ul className="mt-2 border-t border-slate-200">
            {data.appointments.map((a) => (
              <li key={a.id} className="border-b border-slate-200">
                <button
                  onClick={() => onToggle(a.id)}
                  aria-expanded={expanded === a.id}
                  className="flex w-full items-center gap-3 py-4 text-left"
                >
                  <span className="w-12 shrink-0 text-sm tabular-nums text-slate-500">
                    {formatTime(a.startsAt, timezone)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">
                      {a.customer?.name ?? "Cliente"}
                    </span>
                    <span className="block truncate text-sm text-slate-500">
                      {a.service?.name ?? "Servico"}
                      {a.service ? ` · ${formatMoney(a.service.price)}` : ""}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[11px] font-medium ${
                      STATUS_TONE[a.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </button>

                {expanded === a.id && (
                  <AppointmentActions
                    appointment={a}
                    timezone={timezone}
                    permissions={permissions}
                    busy={busy}
                    onAct={onAct}
                    onOpenOrder={onOpenOrder}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ── acoes de um agendamento ──────────────────────────────────────────────── */

function AppointmentActions({
  appointment: a,
  timezone,
  permissions,
  busy,
  onAct,
  onOpenOrder,
}: {
  appointment: Appointment;
  timezone: string;
  permissions: Permissions;
  busy: boolean;
  onAct: (id: string, action: string, extra?: Record<string, unknown>) => Promise<boolean>;
  onOpenOrder: (a: Appointment) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [newTime, setNewTime] = useState("");

  const isFinished = ["COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"].includes(a.status);
  const canStart = ["SCHEDULED", "CONFIRMED", "ARRIVED"].includes(a.status);

  return (
    <div className="pb-5">
      <dl className="space-y-1 text-sm text-slate-500">
        <div>
          {formatTime(a.startsAt, timezone)} – {formatTime(a.endsAt, timezone)}
          {a.service ? ` · ${a.service.durationMinutes} min` : ""}
        </div>
        {a.customer?.phone && <div>{a.customer.phone}</div>}
        {a.source && <div>Origem: {SOURCE_LABELS[a.source] ?? a.source}</div>}
        {a.rescheduledFrom && (
          <div>Remarcado de {formatTime(a.rescheduledFrom, timezone)}</div>
        )}
        {a.cancellationReason && <div>Motivo: {a.cancellationReason}</div>}
      </dl>

      {a.notes && <p className={`${NOTICE} mt-3`}>{a.notes}</p>}

      {a.customer && (
        <Link
          href={`/profissional/clientes/${a.customer.id}`}
          className="mt-3 inline-block text-sm text-blue-600"
        >
          Ver ficha do cliente →
        </Link>
      )}

      {!isFinished && (
        <div className="mt-4 space-y-2">
          {a.status === "IN_PROGRESS" ? (
            <>
              <button
                onClick={() => onAct(a.id, "complete")}
                disabled={busy}
                className={BUTTON}
              >
                Finalizar atendimento
              </button>
              <button onClick={() => onOpenOrder(a)} disabled={busy} className={BUTTON_GHOST}>
                Abrir comanda
              </button>
            </>
          ) : (
            <>
              {canStart && (
                <button
                  onClick={() => onAct(a.id, "start")}
                  disabled={busy}
                  className={BUTTON}
                >
                  Iniciar atendimento
                </button>
              )}
              <div className="flex flex-wrap gap-2">
                {a.status === "SCHEDULED" && (
                  <button
                    onClick={() => onAct(a.id, "confirm")}
                    disabled={busy}
                    className={`${CHIP} flex-1`}
                  >
                    Confirmar
                  </button>
                )}
                {a.status !== "ARRIVED" && (
                  <button
                    onClick={() => onAct(a.id, "arrive")}
                    disabled={busy}
                    className={`${CHIP} flex-1`}
                  >
                    Cliente chegou
                  </button>
                )}
                <button
                  onClick={() => onAct(a.id, "no_show")}
                  disabled={busy}
                  className={`${CHIP} flex-1`}
                >
                  Nao veio
                </button>
              </div>
            </>
          )}

          {permissions.canReschedule && (
            <div>
              <button
                onClick={() => setRescheduling((v) => !v)}
                disabled={busy}
                className={BUTTON_GHOST}
              >
                {rescheduling ? "Cancelar remarcacao" : "Reagendar"}
              </button>
              {rescheduling && (
                <div className="mt-3 space-y-2">
                  <input
                    type="datetime-local"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className={INPUT}
                  />
                  <button
                    disabled={busy || !newTime}
                    onClick={async () => {
                      const ok = await onAct(a.id, "reschedule", {
                        startsAt: new Date(newTime).toISOString(),
                      });
                      if (ok) setRescheduling(false);
                    }}
                    className={BUTTON}
                  >
                    Confirmar novo horario
                  </button>
                </div>
              )}
            </div>
          )}

          {permissions.canCancelAppointment && (
            <div>
              <button
                onClick={() => setCancelling((v) => !v)}
                disabled={busy}
                className={BUTTON_DANGER}
              >
                {cancelling ? "Voltar" : "Cancelar atendimento"}
              </button>
              {cancelling && (
                <div className="mt-3 space-y-2">
                  {/* Motivo obrigatorio: a secao 4, regra 6 exige registrar
                      data, horario, usuario e motivo do cancelamento. */}
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo do cancelamento"
                    className={INPUT}
                  />
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={async () => {
                      const ok = await onAct(a.id, "cancel", { reason });
                      if (ok) setCancelling(false);
                    }}
                    className={BUTTON_DANGER}
                  >
                    Confirmar cancelamento
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isFinished && a.orderId && (
        <Link
          href={`/profissional/comanda/${a.orderId}`}
          className={`${BUTTON_GHOST} mt-4`}
        >
          Ver comanda
        </Link>
      )}
      {a.status === "COMPLETED" && !a.orderId && (
        <button onClick={() => onOpenOrder(a)} disabled={busy} className={`${BUTTON} mt-4`}>
          Abrir comanda
        </button>
      )}
    </div>
  );
}

/* ── visao semanal ────────────────────────────────────────────────────────── */

function WeekView({
  data,
  onPickDay,
}: {
  data: AgendaResponse;
  onPickDay: (date: string) => void;
}) {
  const { timezone } = data;

  const byDay = new Map<string, Appointment[]>();
  for (const day of data.days) byDay.set(day, []);
  for (const a of data.appointments) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(a.startsAt));
    byDay.get(key)?.push(a);
  }

  return (
    <section className="mt-8">
      <ul className="border-t border-slate-200">
        {data.days.map((day, index) => {
          const items = byDay.get(day) ?? [];
          const active = items.filter(
            (a) => !["CANCELLED", "NO_SHOW", "RESCHEDULED"].includes(a.status),
          );

          return (
            <li key={day} className="border-b border-slate-200">
              <button
                onClick={() => onPickDay(day)}
                className="flex w-full items-center gap-4 py-4 text-left"
              >
                <span className="w-12 shrink-0">
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                    {WEEKDAY_SHORT[index]}
                  </span>
                  <span className="block text-lg tabular-nums">{day.slice(8, 10)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  {active.length === 0 ? (
                    <span className="text-sm text-slate-400">Livre</span>
                  ) : (
                    <>
                      <span className="block text-base">
                        {active.length} atendimento{active.length === 1 ? "" : "s"}
                      </span>
                      <span className="block truncate text-sm text-slate-500">
                        {formatTime(active[0].startsAt, timezone)} –{" "}
                        {formatTime(active[active.length - 1].endsAt, timezone)}
                      </span>
                    </>
                  )}
                </span>
                <span className="shrink-0 text-slate-300">→</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── novo agendamento ─────────────────────────────────────────────────────── */

function NewAppointmentForm({
  date,
  canWalkIn,
  onDone,
  onError,
}: {
  date: string;
  canWalkIn: boolean;
  onDone: () => void;
  onError: (message: string | null) => void;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [slots, setSlots] = useState<{ startsAt: string; endsAt: string }[]>([]);
  const [slot, setSlot] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [walkIn, setWalkIn] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  // Os servicos vem do perfil: sao exatamente os habilitados para este
  // profissional, entao a lista nunca oferece algo que a API vai recusar.
  useEffect(() => {
    fetch("/api/profissional/perfil")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setServices(d.services ?? []))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!serviceId || walkIn) {
      setSlots([]);
      return;
    }
    fetch("/api/profissional/perfil")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (profile) => {
        if (!profile) return;
        const res = await fetch(
          `/api/disponibilidade?professionalId=${profile.professional.id}&serviceId=${serviceId}&date=${date}`,
        );
        if (!res.ok) return;
        const body = await res.json();
        setSlots(body.slots ?? []);
        if (body.timeZone) setTimezone(body.timeZone);
      })
      .catch(() => null);
  }, [serviceId, date, walkIn]);

  async function submit() {
    onError(null);
    setSaving(true);
    try {
      const startsAt = walkIn ? new Date(manualTime).toISOString() : slot;
      const res = await fetch("/api/profissional/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          startsAt,
          customerName,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
          walkIn,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(body.error ?? "Nao foi possivel criar o agendamento.");
        return;
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  const ready = serviceId && customerName.trim() && (walkIn ? manualTime : slot);

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <h2 className={LABEL}>Novo agendamento</h2>

      <div className="mt-4 space-y-4">
        <select
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setSlot("");
          }}
          className={SELECT}
        >
          <option value="">Escolha o servico</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.durationMinutes} min · {formatMoney(s.price)}
            </option>
          ))}
        </select>

        {canWalkIn && (
          <label className="flex items-center gap-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={walkIn}
              onChange={(e) => {
                setWalkIn(e.target.checked);
                setSlot("");
              }}
              className="h-5 w-5 accent-blue-600"
            />
            Encaixe (fora da grade de horarios)
          </label>
        )}

        {walkIn ? (
          <input
            type="datetime-local"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            className={INPUT}
          />
        ) : serviceId ? (
          slots.length === 0 ? (
            <p className={NOTICE}>Nenhum horario livre neste dia para este servico.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <button
                  key={s.startsAt}
                  onClick={() => setSlot(s.startsAt)}
                  className={`min-h-[44px] border text-sm transition ${
                    slot === s.startsAt
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 hover:border-blue-600"
                  }`}
                >
                  {formatTime(s.startsAt, timezone)}
                </button>
              ))}
            </div>
          )
        ) : null}

        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nome do cliente"
          className={INPUT}
        />
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Telefone (opcional)"
          className={INPUT}
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observacao (opcional)"
          className={INPUT}
        />

        <button onClick={submit} disabled={!ready || saving} className={BUTTON}>
          {saving ? "Salvando…" : "Criar agendamento"}
        </button>
      </div>
    </div>
  );
}
