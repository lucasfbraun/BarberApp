"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ALERT,
  BUTTON,
  BUTTON_GHOST,
  CHIP,
  CHIP_PRIMARY,
  LABEL,
  METRIC,
  MUTED,
  NOTICE,
  STATUS_LABELS,
  STATUS_TONE,
  TITLE,
  formatLongDate,
  formatMoney,
  formatTime,
} from "@/lib/ui-pro";

/* Pagina inicial do portal (secao 3): resumo operacional do dia.
   A ordem da tela segue a "prioridade de informacao" da secao 27 —
   proximo cliente primeiro, indicadores depois. */

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  source: string;
  customer: { id: string; name: string; phone: string | null } | null;
  service: { id: string; name: string; durationMinutes: number; price: number } | null;
  orderId: string | null;
  orderStatus: string | null;
};

type Resumo = {
  date: string;
  timezone: string;
  professional: { id: string; name: string };
  next: Appointment | null;
  inProgress: Appointment | null;
  waiting: Appointment[];
  appointments: Appointment[];
  openOrders: { id: string; status: string; total: number; customerName: string | null }[];
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    waiting: number;
    remaining: number;
    freeSlots: number;
    production: number;
    commission: number;
    commissionIsEstimate: boolean;
  };
};

type Notification = {
  id: string;
  type: string;
  title: string;
  detail: string;
  at: string;
};

export default function ProfessionalHomePage() {
  const router = useRouter();
  const [data, setData] = useState<Resumo | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    const res = await fetch("/api/profissional/resumo");
    if (res.ok) {
      setData(await res.json());
      setError(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Nao foi possivel carregar o resumo.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/profissional/notificacoes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setNotifications(d.notifications ?? []))
      .catch(() => null);
  }, []);

  // Relogio da secao 3. Um minuto de granularidade basta e evita re-render
  // a cada segundo em aparelho fraco.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  async function act(appointmentId: string, action: string) {
    setBusy(appointmentId + action);
    try {
      const res = await fetch(`/api/profissional/agendamentos/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Nao foi possivel concluir a acao.");
        return;
      }
      setError(null);
      await load();
    } finally {
      setBusy(null);
    }
  }

  /** Abre (ou reabre) a comanda do atendimento e navega para ela. */
  async function openOrder(appointment: Appointment) {
    if (appointment.orderId) {
      router.push(`/profissional/comanda/${appointment.orderId}`);
      return;
    }
    setBusy(appointment.id + "order");
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
      setBusy(null);
    }
  }

  if (loading) {
    return <p className={`${MUTED} pt-16`}>Carregando…</p>;
  }

  if (error && !data) {
    return (
      <div className="pt-16">
        <p className={ALERT}>{error}</p>
        <Link href="/login" className={`${BUTTON_GHOST} mt-6`}>
          Voltar ao login
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { summary, timezone } = data;
  const featured = data.inProgress ?? data.next;

  return (
    <div>
      <header className="pt-10">
        <p className={LABEL}>
          {formatLongDate(data.date, timezone)} ·{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
          }).format(now)}
        </p>
        <h1 className={`${TITLE} mt-3`}>{data.professional.name.split(" ")[0]}</h1>
      </header>

      {error && <p className={`${ALERT} mt-6`}>{error}</p>}

      {/* ── Proximo cliente: o destaque da tela (secao 27) ─────────────────── */}
      <section className="mt-10">
        <h2 className={LABEL}>
          {data.inProgress ? "Em atendimento agora" : "Proximo cliente"}
        </h2>

        {!featured ? (
          <p className={`${NOTICE} mt-4`}>
            {summary.total === 0
              ? "Nenhum atendimento agendado para hoje."
              : "Todos os atendimentos de hoje ja foram concluidos."}
          </p>
        ) : (
          <div className="mt-3">
            <p className="text-2xl font-semibold tracking-tight">
              {featured.customer?.name ?? "Cliente"}
            </p>
            <p className={`${MUTED} mt-1`}>
              {featured.service?.name ?? "Servico"} ·{" "}
              {formatTime(featured.startsAt, timezone)} as{" "}
              {formatTime(featured.endsAt, timezone)}
              {featured.service ? ` · ${formatMoney(featured.service.price)}` : ""}
            </p>
            {featured.customer?.phone && (
              <p className={`${MUTED} mt-0.5`}>{featured.customer.phone}</p>
            )}
            {featured.notes && (
              <p className={`${NOTICE} mt-3`}>{featured.notes}</p>
            )}

            <div className="mt-5 space-y-2">
              {/* Botao contextual fixo da secao 22. */}
              {data.inProgress ? (
                <>
                  <button
                    onClick={() => act(featured.id, "complete")}
                    disabled={busy !== null}
                    className={BUTTON}
                  >
                    Finalizar atendimento
                  </button>
                  <button
                    onClick={() => openOrder(featured)}
                    disabled={busy !== null}
                    className={BUTTON_GHOST}
                  >
                    {featured.orderId ? "Ver comanda" : "Abrir comanda"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => act(featured.id, "start")}
                    disabled={busy !== null}
                    className={BUTTON}
                  >
                    Iniciar atendimento
                  </button>
                  <div className="flex gap-2">
                    {featured.status === "SCHEDULED" && (
                      <button
                        onClick={() => act(featured.id, "confirm")}
                        disabled={busy !== null}
                        className={`${CHIP} flex-1`}
                      >
                        Confirmar
                      </button>
                    )}
                    {featured.status !== "ARRIVED" && (
                      <button
                        onClick={() => act(featured.id, "arrive")}
                        disabled={busy !== null}
                        className={`${CHIP} flex-1`}
                      >
                        Cliente chegou
                      </button>
                    )}
                    <Link
                      href={`/profissional/agenda?foco=${featured.id}`}
                      className={`${CHIP} flex-1`}
                    >
                      Detalhes
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Clientes aguardando ────────────────────────────────────────────── */}
      {data.waiting.length > 0 && (
        <section className="mt-12">
          <h2 className={LABEL}>Aguardando ({data.waiting.length})</h2>
          <ul className="mt-2 border-t border-slate-200">
            {data.waiting.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 border-b border-slate-200 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium">
                    {a.customer?.name ?? "Cliente"}
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatTime(a.startsAt, timezone)} · {a.service?.name ?? "Servico"}
                  </span>
                </span>
                <button
                  onClick={() => act(a.id, "start")}
                  disabled={busy !== null}
                  className={CHIP_PRIMARY}
                >
                  Chamar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Indicadores do dia ─────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className={LABEL}>Hoje</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5">
          <Metric label="Atendimentos" value={String(summary.total)} />
          <Metric label="Concluidos" value={String(summary.completed)} />
          <Metric label="Restantes" value={String(summary.remaining)} />
          <Metric label="Horarios livres" value={String(summary.freeSlots)} />
          <Metric label="Producao" value={formatMoney(summary.production)} />
          <Metric
            label="Comissao"
            value={formatMoney(summary.commission)}
            hint={summary.commissionIsEstimate ? "estimativa do dia" : undefined}
          />
        </dl>

        {(summary.cancelled > 0 || summary.noShow > 0) && (
          <p className={`${MUTED} mt-4`}>
            {summary.cancelled > 0 && `${summary.cancelled} cancelado(s)`}
            {summary.cancelled > 0 && summary.noShow > 0 && " · "}
            {summary.noShow > 0 && `${summary.noShow} falta(s)`}
          </p>
        )}
      </section>

      {/* ── Comandas abertas ──────────────────────────────────────────────── */}
      {data.openOrders.length > 0 && (
        <section className="mt-12">
          <h2 className={LABEL}>Comandas abertas</h2>
          <ul className="mt-2 border-t border-slate-200">
            {data.openOrders.map((o) => (
              <li key={o.id} className="border-b border-slate-200">
                <Link
                  href={`/profissional/comanda/${o.id}`}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-base">
                    {o.customerName ?? "Sem cliente"}
                  </span>
                  <span className="text-sm tabular-nums text-slate-500">
                    {formatMoney(o.total)}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-medium ${
                      o.status === "AWAITING_PAYMENT"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {o.status === "AWAITING_PAYMENT" ? "No caixa" : "Aberta"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Agenda resumida do dia ────────────────────────────────────────── */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className={LABEL}>Agenda do dia</h2>
          <Link href="/profissional/agenda" className="text-sm text-blue-600">
            Ver tudo
          </Link>
        </div>

        {data.appointments.length === 0 ? (
          <p className={`${NOTICE} mt-4`}>Dia livre.</p>
        ) : (
          <ul className="mt-2 border-t border-slate-200">
            {data.appointments.slice(0, 6).map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 border-b border-slate-200 py-3"
              >
                <span className="w-12 shrink-0 text-sm tabular-nums text-slate-500">
                  {formatTime(a.startsAt, timezone)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base">
                    {a.customer?.name ?? "Cliente"}
                  </span>
                  <span className="text-sm text-slate-500">
                    {a.service?.name ?? "Servico"}
                  </span>
                </span>
                <span
                  className={`shrink-0 px-2 py-0.5 text-[11px] font-medium ${
                    STATUS_TONE[a.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Notificacoes ──────────────────────────────────────────────────── */}
      {notifications.length > 0 && (
        <section className="mt-12">
          <h2 className={LABEL}>Novidades</h2>
          <ul className="mt-2 border-t border-slate-200">
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id} className="border-b border-slate-200 py-3">
                <p className="text-base">{n.title}</p>
                <p className="text-sm text-slate-500">{n.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className={LABEL}>Acoes rapidas</h2>
        <div className="mt-3 space-y-2">
          <Link href="/profissional/agenda?novo=1" className={BUTTON_GHOST}>
            Adicionar agendamento
          </Link>
          <Link href="/profissional/bloqueios" className={BUTTON_GHOST}>
            Bloquear horario
          </Link>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className={LABEL}>{label}</dt>
      <dd className={`${METRIC} mt-1`}>{value}</dd>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
