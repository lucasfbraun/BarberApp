"use client";

import { useEffect, useState, useCallback } from "react";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
  RESCHEDULED: "Reagendado",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  VOUCHER: "Voucher",
  COURTESY: "Cortesia",
};

type Summary = {
  totalAppointments: number;
  byStatus: Record<string, number>;
  totalRevenue: number;
  totalCommissions: number;
  netRevenue: number;
  closedOrders: number;
  byPayment: Record<string, number>;
};

type Professional = {
  id: string;
  name: string;
  appointments: number;
  revenue: number;
  commission: number;
};

type OrderRow = {
  id: string;
  customer: string;
  professional: string;
  total: number;
  closedAt: string;
  payments: { method: string; amount: number }[];
};

type AppointmentRow = {
  id: string;
  startsAt: string;
  status: string;
  professional: string;
  customer: string;
  service: string;
};

type Report = {
  date: string;
  summary: Summary;
  professionals: Professional[];
  orders: OrderRow[];
  appointments: AppointmentRow[];
};

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export default function RelatorioPage() {
  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/relatorio/diario?date=${date}`);
    if (res.ok) setReport(await res.json());
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <div className="space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatório diário</h1>
          <p className="text-sm text-slate-400">Visão geral de receita, atendimentos e comissões</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
        />
      </div>

      {loading && <p className="text-slate-400">Carregando...</p>}

      {!loading && report && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Agendamentos", value: String(report.summary.totalAppointments), sub: `${report.summary.byStatus["COMPLETED"] ?? 0} concluídos`, color: "text-cyan-400" },
              { label: "Receita bruta", value: fmt(report.summary.totalRevenue), sub: `${report.summary.closedOrders} comandas fechadas`, color: "text-emerald-400" },
              { label: "Comissões", value: fmt(report.summary.totalCommissions), sub: "Total a pagar", color: "text-amber-400" },
              { label: "Receita líquida", value: fmt(report.summary.netRevenue), sub: "Bruta menos comissões", color: "text-white" },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-widest text-slate-500">{card.label}</p>
                <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Pagamentos por método */}
          {Object.keys(report.summary.byPayment).length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="mb-4 font-semibold text-white">Receita por forma de pagamento</h2>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(report.summary.byPayment).map(([method, amount]) => (
                  <div key={method} className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-center">
                    <p className="text-xs text-slate-400">{PAYMENT_LABELS[method] ?? method}</p>
                    <p className="mt-1 font-semibold text-white">{fmt(amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Por profissional */}
          {report.professionals.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-semibold text-white">Por profissional</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-slate-500">
                      <th className="px-5 py-3">Profissional</th>
                      <th className="px-5 py-3 text-right">Atendimentos</th>
                      <th className="px-5 py-3 text-right">Receita</th>
                      <th className="px-5 py-3 text-right">Comissão</th>
                      <th className="px-5 py-3 text-right">Líquido barbearia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.professionals.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                        <td className="px-5 py-3 text-right text-slate-300">{p.appointments}</td>
                        <td className="px-5 py-3 text-right text-emerald-300">{fmt(p.revenue)}</td>
                        <td className="px-5 py-3 text-right text-amber-300">{fmt(p.commission)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-white">{fmt(p.revenue - p.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comandas fechadas */}
          {report.orders.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-semibold text-white">Comandas fechadas</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-slate-500">
                      <th className="px-5 py-3">Cliente</th>
                      <th className="px-5 py-3">Profissional</th>
                      <th className="px-5 py-3">Pagamento</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-5 py-3 text-right">Fechamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.orders.map((o) => (
                      <tr key={o.id} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-3 text-white">{o.customer}</td>
                        <td className="px-5 py-3 text-slate-300">{o.professional}</td>
                        <td className="px-5 py-3 text-slate-300">
                          {o.payments.map((p) => PAYMENT_LABELS[p.method] ?? p.method).join(", ")}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-300">{fmt(o.total)}</td>
                        <td className="px-5 py-3 text-right text-slate-400">
                          {o.closedAt ? fmtTime(o.closedAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Agendamentos do dia */}
          <div className="rounded-2xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-semibold text-white">Todos os agendamentos</h2>
            </div>
            {report.appointments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">Nenhum agendamento nesta data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-slate-500">
                      <th className="px-5 py-3">Horário</th>
                      <th className="px-5 py-3">Cliente</th>
                      <th className="px-5 py-3">Serviço</th>
                      <th className="px-5 py-3">Profissional</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.appointments.map((a) => (
                      <tr key={a.id} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-3 font-mono text-slate-300">{fmtTime(a.startsAt)}</td>
                        <td className="px-5 py-3 text-white">{a.customer}</td>
                        <td className="px-5 py-3 text-slate-300">{a.service}</td>
                        <td className="px-5 py-3 text-slate-300">{a.professional}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                            {STATUS_LABELS[a.status] ?? a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Empty state */}
          {report.summary.totalAppointments === 0 && report.orders.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <p className="text-slate-400">Nenhum dado encontrado para esta data.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
