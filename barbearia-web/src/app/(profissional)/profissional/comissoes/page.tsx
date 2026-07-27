"use client";

import { useCallback, useEffect, useState } from "react";

import {
  LABEL,
  METRIC,
  MUTED,
  NOTICE,
  TITLE,
  formatMoney,
} from "@/lib/ui-pro";

/* Comissoes do proprio profissional (secao 9).

   A tela e explicita sobre o que ainda NAO conta: a secao 9, regra 2 manda
   considerar so valores pagos, e a secao 10 pede avisar quando os dados nao
   estao fechados. Sem isso o barbeiro soma a comanda aberta na cabeca e
   reclama do valor no fim do mes. */

type Item = {
  id: string;
  createdAt: string;
  status: string;
  grossAmount: number;
  commissionType: string;
  commissionRate: number;
  commissionAmount: number;
  customerName: string | null;
  items: { name: string; type: string; quantity: number; total: number }[];
};

type Data = {
  label: string;
  summary: {
    grossProduction: number;
    commissionTotal: number;
    serviceBase: number;
    productBase: number;
    byStatus: Record<string, number>;
    appointmentsPaid: number;
    averageTicket: number;
  };
  notYetCounted: {
    total: number;
    orders: { id: string; status: string; total: number; customerName: string | null }[];
  };
  items: Item[];
};

const PERIODS = [
  ["hoje", "Hoje"],
  ["semana", "Semana"],
  ["mes", "Mes"],
  ["mes_anterior", "Mes anterior"],
] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  AVAILABLE: "Disponivel",
  PAID: "Paga",
  CANCELLED: "Cancelada",
};

export default function ComissoesPage() {
  const [period, setPeriod] = useState<string>("mes");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/profissional/comissoes?period=${period}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <header className="pt-10">
        <p className={LABEL}>Comissoes</p>
        <h1 className={`${TITLE} mt-3`}>Seus ganhos</h1>
      </header>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {PERIODS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`min-h-[44px] border px-2 text-xs transition ${
              period === value
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 text-slate-700 hover:border-blue-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={`${MUTED} mt-10`}>Carregando…</p>
      ) : !data ? (
        <p className={`${NOTICE} mt-10`}>Nao foi possivel carregar.</p>
      ) : (
        <>
          <section className="mt-10">
            <h2 className={LABEL}>{data.label}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <dt className={LABEL}>Producao</dt>
                <dd className={`${METRIC} mt-1`}>
                  {formatMoney(data.summary.grossProduction)}
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Sua comissao</dt>
                <dd className={`${METRIC} mt-1 text-blue-600`}>
                  {formatMoney(data.summary.commissionTotal)}
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Atendimentos pagos</dt>
                <dd className={`${METRIC} mt-1`}>{data.summary.appointmentsPaid}</dd>
              </div>
              <div>
                <dt className={LABEL}>Ticket medio</dt>
                <dd className={`${METRIC} mt-1`}>
                  {formatMoney(data.summary.averageTicket)}
                </dd>
              </div>
            </dl>

            {(data.summary.serviceBase > 0 || data.summary.productBase > 0) && (
              <p className={`${MUTED} mt-4`}>
                Base: {formatMoney(data.summary.serviceBase)} em servicos ·{" "}
                {formatMoney(data.summary.productBase)} em produtos
              </p>
            )}

            {Object.keys(data.summary.byStatus).length > 0 && (
              <ul className="mt-4 space-y-1 text-sm">
                {Object.entries(data.summary.byStatus).map(([status, value]) => (
                  <li key={status} className="flex justify-between">
                    <span className="text-slate-500">
                      {STATUS_LABELS[status] ?? status}
                    </span>
                    <span className="tabular-nums">{formatMoney(value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Producao que ainda nao virou comissao. */}
          {data.notYetCounted.total > 0 && (
            <section className="mt-10">
              <h2 className={LABEL}>Ainda nao contabilizado</h2>
              <p className={`${NOTICE} mt-3`}>
                {formatMoney(data.notYetCounted.total)} em comandas abertas ou no
                caixa. A comissao entra quando o pagamento for recebido.
              </p>
              <ul className="mt-3 border-t border-slate-200">
                {data.notYetCounted.orders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between border-b border-slate-200 py-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {o.customerName ?? "Sem cliente"}
                    </span>
                    <span className="ml-3 shrink-0 text-slate-500">
                      {o.status === "AWAITING_PAYMENT" ? "No caixa" : "Aberta"}
                    </span>
                    <span className="ml-3 shrink-0 tabular-nums">
                      {formatMoney(o.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Detalhamento (secao 9). */}
          <section className="mt-10">
            <h2 className={LABEL}>Detalhamento</h2>
            {data.items.length === 0 ? (
              <p className={`${NOTICE} mt-3`}>
                Nenhuma comissao neste periodo.
              </p>
            ) : (
              <ul className="mt-2 border-t border-slate-200">
                {data.items.map((item) => (
                  <li key={item.id} className="border-b border-slate-200">
                    <button
                      onClick={() =>
                        setExpanded((cur) => (cur === item.id ? null : item.id))
                      }
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base">
                          {item.customerName ?? "Cliente"}
                        </span>
                        <span className="text-sm text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString("pt-BR")} ·
                          base {formatMoney(item.grossAmount)} ·{" "}
                          {item.commissionType === "percent"
                            ? `${item.commissionRate}%`
                            : "valor fixo"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-blue-600">
                        {formatMoney(item.commissionAmount)}
                      </span>
                    </button>

                    {expanded === item.id && item.items.length > 0 && (
                      <ul className="pb-3 pl-1 text-sm text-slate-500">
                        {item.items.map((sub, index) => (
                          <li key={index} className="flex justify-between py-0.5">
                            <span>
                              {sub.quantity} × {sub.name}
                              {sub.type === "product" ? " (produto)" : ""}
                            </span>
                            <span className="tabular-nums">
                              {formatMoney(sub.total)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className={`${MUTED} mt-8`}>
            Percentuais de comissao sao definidos pela barbearia. Divergencia,
            fale com o gestor.
          </p>
        </>
      )}
    </div>
  );
}
