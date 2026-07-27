"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

/* Caixa — comandas aguardando recebimento.

   Esta tela é o outro lado do "Enviar para o caixa" do Portal do Profissional.
   Sem ela o fluxo da seção 21 morria no meio: o barbeiro mandava a comanda e
   ninguém tinha onde vê-la, porque o painel só chegava à comanda pelo
   agendamento do dia.

   As comandas em AWAITING_PAYMENT vêm primeiro — são as que têm um cliente
   esperando na frente do balcão. */

type Order = {
  id: string;
  status: string;
  total: string | number;
  createdAt: string;
  customer: { id: string; name: string } | null;
  professional: { id: string; name: string } | null;
  appointment: { id: string; startsAt: string } | null;
  items: { id: string; name: string; quantity: number }[];
};

function money(value: string | number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CaixaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/comandas?status=OPEN,AWAITING_PAYMENT");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível carregar as comandas.");
        return;
      }
      setOrders(await res.json());
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Recarrega ao voltar para a aba: o barbeiro manda comandas do celular
  // enquanto esta tela fica aberta no balcão.
  useEffect(() => {
    function onFocus() {
      load();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const awaiting = orders.filter((o) => o.status === "AWAITING_PAYMENT");
  const open = orders.filter((o) => o.status === "OPEN");

  return (
    <section className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Caixa</h1>
          <p className="mt-1 text-sm text-slate-400">
            Comandas em atendimento e aguardando pagamento.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200 transition hover:bg-white/10"
        >
          Atualizar
        </button>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-slate-400">Nenhuma comanda aberta no momento.</p>
        </div>
      ) : (
        <>
          <OrderGroup
            title="Aguardando pagamento"
            hint="O atendimento terminou. Falta receber."
            orders={awaiting}
            highlight
          />
          <OrderGroup
            title="Em atendimento"
            hint="Comandas ainda abertas, sendo montadas."
            orders={open}
          />
        </>
      )}
    </section>
  );
}

function OrderGroup({
  title,
  hint,
  orders,
  highlight = false,
}: {
  title: string;
  hint: string;
  orders: Order[];
  highlight?: boolean;
}) {
  if (orders.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">
          {title}{" "}
          <span className="text-slate-500">({orders.length})</span>
        </h2>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>

      <div className="space-y-2">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/comanda/${o.id}`}
            className={`flex items-center gap-4 rounded-3xl border p-5 backdrop-blur transition hover:border-cyan-400/30 ${
              highlight
                ? "border-amber-400/30 bg-amber-400/5"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">
                {o.customer?.name ?? "Sem cliente"}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-400">
                {o.professional?.name ?? "Sem profissional"}
                {o.items.length > 0
                  ? ` · ${o.items.length} ${o.items.length === 1 ? "item" : "itens"}`
                  : " · sem itens"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums text-white">{money(o.total)}</p>
              <p className="text-xs text-slate-500">
                {new Date(o.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
