"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  ALERT,
  BUTTON,
  BUTTON_GHOST,
  CHIP,
  INPUT,
  LABEL,
  MUTED,
  NOTICE,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  SELECT,
  TITLE,
  formatMoney,
} from "@/lib/ui-pro";

/* Comanda do atendimento (secao 6).

   A tela deixa explicita a separacao entre CONCLUIR O SERVICO e RECEBER O
   PAGAMENTO: a acao principal e "Enviar para o caixa", e o botao de receber so
   aparece para quem tem a permissao `canReceivePayment`. */

type Item = {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Order = {
  id: string;
  status: string;
  subtotal: number;
  total: number;
  discountType: string | null;
  discountValue: number | null;
  customer: { id: string; name: string } | null;
  appointment: { id: string; startsAt: string; status: string } | null;
  items: Item[];
  payments?: { id: string; method: string; amount: number }[];
};

type Catalog = {
  services: { id: string; name: string; price: number }[];
  products: { id: string; name: string; salePrice: number; stockQuantity: number }[];
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CREDIT_CARD", label: "Credito" },
  { value: "DEBIT_CARD", label: "Debito" },
  { value: "VOUCHER", label: "Voucher" },
  { value: "COURTESY", label: "Cortesia" },
];

export default function ComandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [permissions, setPermissions] = useState<{
    maxDiscountPercent: number;
    canReceivePayment: boolean;
  } | null>(null);
  const [catalog, setCatalog] = useState<Catalog>({ services: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"servico" | "produto">("servico");
  const [discountValue, setDiscountValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [showPayment, setShowPayment] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/profissional/comandas/${id}`);
    if (res.ok) {
      const body = await res.json();
      setOrder(body.order);
      setPermissions(body.permissions);
      setError(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Comanda nao encontrada.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Servicos habilitados vem do perfil; produtos, do catalogo da barbearia.
  useEffect(() => {
    Promise.all([
      fetch("/api/profissional/perfil").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/produtos?active=1").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([profile, products]) => {
        setCatalog({
          services: profile?.services ?? [],
          // A rota de produtos e do painel e exige papel de operacao; se o
          // barbeiro nao puder ler, a aba simplesmente fica vazia.
          products: (products?.products ?? []).filter(
            (p: { sellable: boolean; active: boolean }) => p.sellable && p.active,
          ),
        });
      })
      .catch(() => null);
  }, []);

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/profissional/comandas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Nao foi possivel atualizar a comanda.");
        return false;
      }
      setOrder(body.order);
      setError(null);
      return true;
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className={`${MUTED} pt-16`}>Carregando…</p>;

  if (!order) {
    return (
      <div className="pt-16">
        <p className={ALERT}>{error ?? "Comanda nao encontrada."}</p>
        <Link href="/profissional" className={`${BUTTON_GHOST} mt-6`}>
          Voltar ao inicio
        </Link>
      </div>
    );
  }

  const isEditable = order.status === "OPEN";
  const isClosed = ["CLOSED", "CANCELLED", "REFUNDED"].includes(order.status);
  const discountAmount = order.subtotal - order.total;

  return (
    <div>
      <header className="pt-10">
        <div className="flex items-center justify-between">
          <p className={LABEL}>Comanda</p>
          <span
            className={`px-2 py-0.5 text-[11px] font-medium ${
              ORDER_STATUS_TONE[order.status] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
        <h1 className={`${TITLE} mt-3`}>{order.customer?.name ?? "Sem cliente"}</h1>
      </header>

      {error && <p className={`${ALERT} mt-6`}>{error}</p>}

      {/* ── Itens ─────────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className={LABEL}>Itens</h2>

        {order.items.length === 0 ? (
          <p className={`${NOTICE} mt-4`}>Nenhum item ainda.</p>
        ) : (
          <ul className="mt-2 border-t border-slate-200">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-slate-200 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base">{item.name}</span>
                  <span className="text-sm text-slate-500">
                    {item.quantity} × {formatMoney(item.unitPrice)}
                    {item.type === "product" ? " · produto" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  {formatMoney(item.total)}
                </span>
                {isEditable && (
                  <button
                    onClick={() => patch({ action: "remove_item", itemId: item.id })}
                    disabled={busy}
                    aria-label={`Remover ${item.name}`}
                    className="shrink-0 px-2 text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Desconto</dt>
              <dd className="tabular-nums text-red-600">
                − {formatMoney(discountAmount)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(order.total)}</dd>
          </div>
        </dl>
      </section>

      {/* ── Adicionar item ────────────────────────────────────────────────── */}
      {isEditable && (
        <section className="mt-10">
          <h2 className={LABEL}>Adicionar</h2>

          <div className="mt-3 flex gap-2">
            {(["servico", "produto"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 border px-4 py-2 text-sm transition ${
                  tab === t
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 text-slate-700 hover:border-blue-600"
                }`}
              >
                {t === "servico" ? "Servico" : "Produto"}
              </button>
            ))}
          </div>

          <ul className="mt-3 border-t border-slate-200">
            {tab === "servico"
              ? catalog.services.map((s) => (
                  <li key={s.id} className="border-b border-slate-200">
                    <button
                      onClick={() => patch({ action: "add_item", serviceId: s.id, quantity: 1 })}
                      disabled={busy}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-base">{s.name}</span>
                      <span className="shrink-0 text-sm tabular-nums text-slate-500">
                        {formatMoney(s.price)}
                      </span>
                      <span className="shrink-0 text-blue-600">+</span>
                    </button>
                  </li>
                ))
              : catalog.products.length === 0
                ? (
                    <li className="py-4">
                      <p className={MUTED}>Nenhum produto disponivel para venda.</p>
                    </li>
                  )
                : catalog.products.map((p) => (
                    <li key={p.id} className="border-b border-slate-200">
                      <button
                        onClick={() =>
                          patch({ action: "add_item", productId: p.id, quantity: 1 })
                        }
                        disabled={busy || p.stockQuantity <= 0}
                        className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-40"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base">{p.name}</span>
                          <span className="text-sm text-slate-500">
                            {p.stockQuantity} em estoque
                          </span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-slate-500">
                          {formatMoney(p.salePrice)}
                        </span>
                        <span className="shrink-0 text-blue-600">+</span>
                      </button>
                    </li>
                  ))}
          </ul>
        </section>
      )}

      {/* ── Desconto, dentro do teto ──────────────────────────────────────── */}
      {isEditable && (permissions?.maxDiscountPercent ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className={LABEL}>
            Desconto (ate {permissions?.maxDiscountPercent}%)
          </h2>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min={0}
              max={permissions?.maxDiscountPercent}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="%"
              className={INPUT}
            />
            <button
              onClick={() =>
                patch({
                  action: "discount",
                  discountType: "percent",
                  discountValue: Number(discountValue),
                })
              }
              disabled={busy || !discountValue}
              className={CHIP}
            >
              Aplicar
            </button>
          </div>
        </section>
      )}

      {/* ── Acoes de fechamento ───────────────────────────────────────────── */}
      {!isClosed && (
        <section className="mt-10 space-y-2">
          {order.status === "OPEN" && (
            <button
              onClick={() => patch({ action: "send_to_cashier" })}
              disabled={busy || order.items.length === 0}
              className={BUTTON}
            >
              Enviar para o caixa
            </button>
          )}

          {order.status === "AWAITING_PAYMENT" && !permissions?.canReceivePayment && (
            <p className={NOTICE}>
              Comanda no caixa, aguardando o pagamento. A comissao entra quando o
              valor for recebido.
            </p>
          )}

          {permissions?.canReceivePayment && (
            <>
              <button
                onClick={() => setShowPayment((v) => !v)}
                disabled={busy || order.items.length === 0}
                className={order.status === "OPEN" ? BUTTON_GHOST : BUTTON}
              >
                {showPayment ? "Voltar" : "Receber pagamento"}
              </button>

              {showPayment && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={SELECT}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      const ok = await patch({ action: "close", paymentMethod });
                      if (ok) setShowPayment(false);
                    }}
                    disabled={busy}
                    className={BUTTON}
                  >
                    Confirmar {formatMoney(order.total)}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {isClosed && (
        <section className="mt-10">
          <p className={NOTICE}>
            Comanda fechada. Para qualquer ajuste, fale com o gestor.
          </p>
        </section>
      )}

      <Link href="/profissional" className={`${BUTTON_GHOST} mt-10`}>
        Voltar ao inicio
      </Link>
    </div>
  );
}
