"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Summary = { total: number; trial: number; active: number; expired: number; inactive: number };
type Barbershop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  trialEndsAt: string | null;
  createdAt: string;
  computedStatus: string;
  plan: { id: string; name: string; price: number } | null;
  resellerLink: { reseller: { name: string; couponCode: string } } | null;
  _count: { professionals: number; appointments: number };
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  trial:    { label: "Trial",    cls: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20" },
  active:   { label: "Ativo",    cls: "bg-green-400/10 text-green-300 border-green-400/20" },
  expired:  { label: "Expirado", cls: "bg-red-400/10 text-red-300 border-red-400/20" },
  inactive: { label: "Inativo",  cls: "bg-slate-700 text-slate-400 border-slate-600" },
};

const FILTERS = [
  { key: "all",      label: "Todas" },
  { key: "trial",    label: "Trial" },
  { key: "active",   label: "Ativas" },
  { key: "expired",  label: "Expiradas" },
  { key: "inactive", label: "Inativas" },
];

export default function AdminBarbeariasPage() {
  const [summary, setSummary] = useState<Summary>({ total: 0, trial: 0, active: 0, expired: 0, inactive: 0 });
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: filter });
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/barbearias?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSummary(data.summary);
      setBarbershops(data.barbershops);
    }
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  function daysLeft(trialEndsAt: string | null) {
    if (!trialEndsAt) return null;
    const diff = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000);
    return diff;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Barbearias</h2>
        <p className="mt-1 text-sm text-slate-400">Gestão de todas as barbearias cadastradas.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {[
          { label: "Total", value: summary.total, cls: "text-white" },
          { label: "Trial", value: summary.trial, cls: "text-cyan-400" },
          { label: "Ativas", value: summary.active, cls: "text-green-400" },
          { label: "Expiradas", value: summary.expired, cls: "text-red-400" },
          { label: "Inativas", value: summary.inactive, cls: "text-slate-400" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className={`text-2xl font-bold ${card.cls}`}>{card.value}</p>
            <p className="mt-1 text-xs text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                filter === f.key
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400/40 sm:w-64"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-slate-400">
                <th className="px-4 py-3">Barbearia</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Trial</th>
                <th className="px-4 py-3">Revendedor</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {barbershops.map((b) => {
                const st = STATUS_LABELS[b.computedStatus] ?? STATUS_LABELS.inactive;
                const days = daysLeft(b.trialEndsAt);
                return (
                  <tr key={b.id} className="border-b border-white/5 transition hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {b.plan ? b.plan.name : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {b.trialEndsAt ? (
                        <span className={days !== null && days < 0 ? "text-red-400" : days !== null && days <= 7 ? "text-amber-300" : "text-slate-400"}>
                          {days !== null && days < 0 ? "Expirado" : `${days}d`}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {b.resellerLink?.reseller.couponCode ?? <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(b.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/barbearias/${b.id}`}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white"
                      >
                        Detalhe
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {barbershops.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Nenhuma barbearia encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
