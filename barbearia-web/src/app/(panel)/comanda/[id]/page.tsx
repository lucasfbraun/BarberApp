"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  service?: { id: string; name: string } | null;
};

type Order = {
  id: string;
  status: string;
  subtotal: number;
  total: number;
  discountType?: string | null;
  discountValue?: number | null;
  closedAt?: string | null;
  paymentStatus: string;
  customer?: { id: string; name: string; phone?: string } | null;
  professional?: { id: string; name: string; commissionType?: string | null; commissionValue?: number | null } | null;
  appointment?: { id: string; startsAt: string; service?: { name: string } | null } | null;
  items: OrderItem[];
  payments: { id: string; amount: number; method: string; paidAt?: string }[];
  commissions: { id: string; commissionAmount: number; status: string }[];
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  VOUCHER: "Voucher",
  COURTESY: "Cortesia",
};

export default function ComandaPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add item form
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, unitPrice: "" });
  // Close form
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/comandas/${id}`);
    if (res.ok) setOrder(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.name || !newItem.unitPrice) return;
    setSaving(true);
    const res = await fetch(`/api/comandas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_item",
        item: { name: newItem.name, quantity: newItem.quantity, unitPrice: Number(newItem.unitPrice) },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrder(data.order);
      setNewItem({ name: "", quantity: 1, unitPrice: "" });
    }
    setSaving(false);
  }

  async function removeItem(itemId: string) {
    setSaving(true);
    const res = await fetch(`/api/comandas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_item", itemId }),
    });
    if (res.ok) setOrder(await res.json());
    setSaving(false);
  }

  async function closeOrder() {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      action: "close",
      paymentMethod,
    };
    if (discountType !== "none" && discountValue) {
      body.discountType = discountType;
      body.discountValue = Number(discountValue);
    }
    const res = await fetch(`/api/comandas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setOrder(await res.json());
      setShowCloseForm(false);
    } else {
      const d = await res.json();
      setError(d.error ?? "Erro ao fechar comanda.");
    }
    setSaving(false);
  }

  function calcTotal() {
    if (!order) return 0;
    const sub = Number(order.subtotal);
    if (discountType === "fixed") return Math.max(0, sub - Number(discountValue || 0));
    if (discountType === "percent") return Math.max(0, sub - sub * (Number(discountValue || 0) / 100));
    return sub;
  }

  function calcCommission(total: number) {
    if (!order?.professional?.commissionValue) return null;
    const p = order.professional;
    if (p.commissionType === "percent") return { amount: total * (Number(p.commissionValue) / 100), label: `${p.commissionValue}%` };
    return { amount: Number(p.commissionValue), label: `R$ ${p.commissionValue}` };
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Carregando...</div>;
  if (!order) return <div className="flex min-h-screen items-center justify-center text-slate-400">Comanda não encontrada.</div>;

  const isClosed = order.status === "CLOSED";
  const previewTotal = calcTotal();
  const commission = calcCommission(isClosed ? Number(order.total) : previewTotal);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="mb-2 text-xs text-slate-500 hover:text-slate-300">← Voltar</button>
          <h1 className="text-2xl font-bold text-white">Comanda</h1>
          <p className="text-sm text-slate-400">#{order.id.slice(-8).toUpperCase()}</p>
        </div>
        <span className={[
          "rounded-full px-3 py-1 text-xs font-semibold",
          isClosed ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300",
        ].join(" ")}>
          {isClosed ? "Fechada" : "Aberta"}
        </span>
      </div>

      {/* Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        {order.customer && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Cliente</p>
            <p className="mt-1 font-semibold text-white">{order.customer.name}</p>
            {order.customer.phone && <p className="text-xs text-slate-400">{order.customer.phone}</p>}
          </div>
        )}
        {order.professional && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Profissional</p>
            <p className="mt-1 font-semibold text-white">{order.professional.name}</p>
            {order.professional.commissionValue && (
              <p className="text-xs text-slate-400">
                Comissão: {order.professional.commissionType === "percent"
                  ? `${order.professional.commissionValue}%`
                  : `R$ ${order.professional.commissionValue}`}
              </p>
            )}
          </div>
        )}
        {order.appointment && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Agendamento</p>
            <p className="mt-1 font-semibold text-white">{order.appointment.service?.name ?? "—"}</p>
            <p className="text-xs text-slate-400">
              {new Date(order.appointment.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-white">Itens</h2>
        </div>
        {order.items.length === 0 && (
          <p className="px-5 py-4 text-sm text-slate-500">Nenhum item ainda.</p>
        )}
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-3 last:border-0">
            <div>
              <p className="text-sm font-medium text-white">{item.name}</p>
              <p className="text-xs text-slate-400">
                {item.quantity}x — R$ {Number(item.unitPrice).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">R$ {Number(item.total).toFixed(2)}</span>
              {!isClosed && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="rounded-lg border border-red-400/20 px-2 py-1 text-xs text-red-400 hover:bg-red-400/10"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Totals */}
        <div className="space-y-2 border-t border-white/10 px-5 py-4">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span>
            <span>R$ {Number(order.subtotal).toFixed(2)}</span>
          </div>
          {isClosed && order.discountValue && (
            <div className="flex justify-between text-sm text-slate-400">
              <span>Desconto</span>
              <span>- R$ {Number(order.discountValue).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-white">
            <span>Total</span>
            <span>R$ {Number(order.total).toFixed(2)}</span>
          </div>
          {commission && (
            <div className="flex justify-between text-sm text-cyan-300">
              <span>Comissão ({commission.label})</span>
              <span>R$ {commission.amount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add item form */}
      {!isClosed && (
        <form onSubmit={addItem} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 font-semibold text-white">Adicionar item</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              className="col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="Descrição"
              value={newItem.name}
              onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              type="number"
              min={1}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="Qtd"
              value={newItem.quantity}
              onChange={(e) => setNewItem((p) => ({ ...p, quantity: Number(e.target.value) }))}
            />
            <input
              type="number"
              step="0.01"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="Preço"
              value={newItem.unitPrice}
              onChange={(e) => setNewItem((p) => ({ ...p, unitPrice: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-3 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {saving ? "Adicionando..." : "Adicionar"}
          </button>
        </form>
      )}

      {/* Pagamentos (closed) */}
      {isClosed && order.payments.length > 0 && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
          <h2 className="mb-3 font-semibold text-white">Pagamento registrado</h2>
          {order.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="text-slate-400">{PAYMENT_LABELS[p.method] ?? p.method}</span>
              <span className="font-semibold text-white">R$ {Number(p.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fechar comanda */}
      {!isClosed && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          {!showCloseForm ? (
            <button
              onClick={() => setShowCloseForm(true)}
              className="w-full rounded-xl bg-emerald-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Fechar comanda e registrar pagamento
            </button>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold text-white">Fechar comanda</h2>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Forma de pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                >
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Desconto</label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="none">Sem desconto</option>
                    <option value="fixed">Valor fixo (R$)</option>
                    <option value="percent">Percentual (%)</option>
                  </select>
                  {discountType !== "none" && (
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "percent" ? "Ex: 10" : "Ex: 20.00"}
                      className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>R$ {Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="mt-1 flex justify-between font-bold text-white">
                  <span>Total a cobrar</span>
                  <span>R$ {previewTotal.toFixed(2)}</span>
                </div>
                {commission && (
                  <div className="mt-1 flex justify-between text-cyan-300">
                    <span>Comissão</span>
                    <span>R$ {calcCommission(previewTotal)?.amount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-300">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseForm(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-300 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={closeOrder}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-emerald-400 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                >
                  {saving ? "Fechando..." : "Confirmar fechamento"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
