"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Plan = { id: string; name: string; price: number };
type Barbershop = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: string;
  trialEndsAt: string | null;
  createdAt: string;
  planId: string | null;
  plan: Plan | null;
  resellerLink: { reseller: { name: string; couponCode: string; commissionRate: number } } | null;
  _count: { professionals: number; services: number; appointments: number; orders: number; customers: number };
  totalRevenue: number;
};

export default function AdminBarbershopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [shopRes, plansRes] = await Promise.all([
      fetch(`/api/admin/barbearias/${id}`),
      fetch("/api/admin/planos"),
    ]);
    if (shopRes.ok) setShop(await shopRes.json());
    if (plansRes.ok) setPlans(await plansRes.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function action(payload: Record<string, unknown>) {
    setSaving(payload.action as string);
    const res = await fetch(`/api/admin/barbearias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) await load();
    setSaving("");
  }

  function daysLeft(trialEndsAt: string | null) {
    if (!trialEndsAt) return null;
    return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000);
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>;
  if (!shop) return <p className="text-sm text-red-400">Barbearia não encontrada.</p>;

  const days = daysLeft(shop.trialEndsAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/barbearias" className="text-xs text-slate-500 hover:text-slate-300">
            ← Barbearias
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-white">{shop.name}</h2>
          <p className="text-sm text-slate-400">{shop.slug} · {shop.city ?? ""} {shop.state ?? ""}</p>
        </div>
        <span className={[
          "rounded-full border px-3 py-1 text-xs font-medium",
          shop.status === "ACTIVE" ? "border-green-400/20 bg-green-400/10 text-green-300" : "border-slate-600 bg-slate-700 text-slate-400",
        ].join(" ")}>
          {shop.status === "ACTIVE" ? "Ativo" : "Inativo"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Profissionais", value: shop._count.professionals },
          { label: "Serviços", value: shop._count.services },
          { label: "Agendamentos", value: shop._count.appointments },
          { label: "Comandas", value: shop._count.orders },
          { label: "Clientes", value: shop._count.customers },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Trial */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h3 className="font-semibold text-white">Trial</h3>
          {shop.trialEndsAt ? (
            <div className="space-y-1">
              <p className="text-sm text-slate-400">
                Expira em: <span className="text-white">{new Date(shop.trialEndsAt).toLocaleDateString("pt-BR")}</span>
              </p>
              <p className={`text-sm font-medium ${days !== null && days < 0 ? "text-red-400" : days !== null && days <= 7 ? "text-amber-300" : "text-green-400"}`}>
                {days !== null && days < 0 ? "Trial expirado" : `${days} dias restantes`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sem data de trial definida.</p>
          )}
          <div className="flex gap-2">
            {[7, 30].map((d) => (
              <button
                key={d}
                disabled={saving === "extend_trial"}
                onClick={() => action({ action: "extend_trial", days: d })}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:text-white disabled:opacity-50"
              >
                +{d} dias
              </button>
            ))}
          </div>
        </div>

        {/* Plano */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h3 className="font-semibold text-white">Plano</h3>
          <p className="text-sm text-slate-400">
            Atual: <span className="text-white">{shop.plan?.name ?? "Nenhum"}</span>
            {shop.plan && <span className="ml-2 text-slate-500">R$ {Number(shop.plan.price).toFixed(2)}/mês</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {plans.filter((p) => p.isActive !== false).map((p: Plan & { isActive?: boolean }) => (
              <button
                key={p.id}
                disabled={saving === "set_plan"}
                onClick={() => action({ action: "set_plan", planId: p.id })}
                className={[
                  "rounded-xl border px-3 py-2 text-xs transition disabled:opacity-50",
                  shop.planId === p.id
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-slate-300 hover:text-white",
                ].join(" ")}
              >
                {p.name}
              </button>
            ))}
            <button
              disabled={saving === "set_plan"}
              onClick={() => action({ action: "set_plan", planId: null })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500 transition hover:text-white disabled:opacity-50"
            >
              Remover plano
            </button>
          </div>
        </div>

        {/* Revendedor */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-2">
          <h3 className="font-semibold text-white">Revendedor</h3>
          {shop.resellerLink ? (
            <>
              <p className="text-sm text-slate-300">{shop.resellerLink.reseller.name}</p>
              <p className="text-xs text-slate-500">
                Cupom: <span className="font-mono text-cyan-400">{shop.resellerLink.reseller.couponCode}</span>
                {" · "}{shop.resellerLink.reseller.commissionRate}% de comissão
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Sem revendedor vinculado.</p>
          )}
        </div>

        {/* Receita + ações */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h3 className="font-semibold text-white">Financeiro</h3>
          <p className="text-sm text-slate-400">
            Receita total (comandas fechadas):{" "}
            <span className="font-semibold text-white">R$ {shop.totalRevenue.toFixed(2)}</span>
          </p>
          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-xs text-slate-500">Ações</p>
            <div className="flex gap-2">
              <button
                disabled={!!saving}
                onClick={() => action({ action: "set_status", status: shop.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                className={[
                  "rounded-xl border px-3 py-2 text-xs transition disabled:opacity-50",
                  shop.status === "ACTIVE"
                    ? "border-red-400/20 bg-red-400/5 text-red-400 hover:bg-red-400/10"
                    : "border-green-400/20 bg-green-400/5 text-green-400 hover:bg-green-400/10",
                ].join(" ")}
              >
                {shop.status === "ACTIVE" ? "Desativar barbearia" : "Reativar barbearia"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
