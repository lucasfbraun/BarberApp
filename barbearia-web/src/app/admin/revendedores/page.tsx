"use client";
import { useEffect, useState, useCallback } from "react";

type Summary = { total: number; active: number; pending: number; inactive: number };
type Referral = { barbershopId: string; barbershop: { name: string; slug: string } };
type Reseller = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  couponCode: string;
  commissionRate: number;
  status: string;
  createdAt: string;
  referrals: Referral[];
  totalRevenue: number;
  totalCommission: number;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE:   { label: "Ativo",    cls: "bg-green-400/10 text-green-300 border-green-400/20" },
  PENDING:  { label: "Pendente", cls: "bg-amber-400/10 text-amber-300 border-amber-400/20" },
  INACTIVE: { label: "Inativo",  cls: "bg-slate-700 text-slate-400 border-slate-600" },
};

const FILTERS = [
  { key: "all",      label: "Todos" },
  { key: "active",   label: "Ativos" },
  { key: "pending",  label: "Pendentes" },
  { key: "inactive", label: "Inativos" },
];

export default function AdminRevendedoresPage() {
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, pending: 0, inactive: 0 });
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editCommission, setEditCommission] = useState<{ id: string; value: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: filter });
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/revendedores?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSummary(data.summary);
      setResellers(data.resellers);
    }
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: string, extra?: Record<string, unknown>) {
    setSaving(id + action);
    await fetch(`/api/admin/revendedores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setSaving(null);
    setEditCommission(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Revendedores</h2>
        <p className="mt-1 text-sm text-slate-400">Gestão do programa de revendas.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",     value: summary.total,    cls: "text-white" },
          { label: "Ativos",    value: summary.active,   cls: "text-green-400" },
          { label: "Pendentes", value: summary.pending,  cls: "text-amber-400" },
          { label: "Inativos",  value: summary.inactive, cls: "text-slate-400" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className={`text-2xl font-bold ${c.cls}`}>{c.value}</p>
            <p className="mt-1 text-xs text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                "rounded-xl border px-3 py-1.5 text-xs font-medium transition",
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
          placeholder="Buscar por nome, e-mail ou cupom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400/40 sm:w-72"
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {resellers.map((r) => {
            const st = STATUS_LABELS[r.status] ?? STATUS_LABELS.INACTIVE;
            const isEditing = editCommission?.id === r.id;
            return (
              <div key={r.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{r.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-slate-400">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="font-mono text-sm text-cyan-400">{r.couponCode}</span>
                      {isEditing ? (
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            act(r.id, "set_commission", { commissionRate: parseFloat(editCommission!.value) });
                          }}
                        >
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={editCommission!.value}
                            onChange={(ev) => setEditCommission({ id: r.id, value: ev.target.value })}
                            className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-amber-400/40"
                          />
                          <button type="submit" className="text-xs text-amber-300 hover:text-amber-200">Salvar</button>
                          <button type="button" onClick={() => setEditCommission(null)} className="text-xs text-slate-500 hover:text-slate-300">Cancelar</button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setEditCommission({ id: r.id, value: String(r.commissionRate) })}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          {r.commissionRate}% comissão ✏️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">{r.referrals.length}</p>
                      <p className="text-xs text-slate-500">barbearias</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">R$ {r.totalRevenue.toFixed(0)}</p>
                      <p className="text-xs text-slate-500">receita</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-cyan-400">R$ {r.totalCommission.toFixed(0)}</p>
                      <p className="text-xs text-slate-500">comissão</p>
                    </div>
                  </div>
                </div>

                {/* Barbearias vinculadas */}
                {r.referrals.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.referrals.map((ref) => (
                      <span
                        key={ref.barbershopId}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400"
                      >
                        {ref.barbershop.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-2 border-t border-white/10 pt-4">
                  {r.status === "PENDING" && (
                    <button
                      disabled={!!saving}
                      onClick={() => act(r.id, "approve")}
                      className="rounded-xl border border-green-400/20 bg-green-400/5 px-3 py-2 text-xs text-green-400 transition hover:bg-green-400/10 disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                  )}
                  {r.status === "ACTIVE" && (
                    <button
                      disabled={!!saving}
                      onClick={() => act(r.id, "deactivate")}
                      className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-400 transition hover:bg-red-400/10 disabled:opacity-50"
                    >
                      Desativar
                    </button>
                  )}
                  {r.status === "INACTIVE" && (
                    <button
                      disabled={!!saving}
                      onClick={() => act(r.id, "approve")}
                      className="rounded-xl border border-green-400/20 bg-green-400/5 px-3 py-2 text-xs text-green-400 transition hover:bg-green-400/10 disabled:opacity-50"
                    >
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {resellers.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-sm text-slate-500">Nenhum revendedor encontrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
