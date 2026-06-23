"use client";
import { useEffect, useState, useCallback } from "react";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  maxProfessionals: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
  _count: { barbershops: number };
};

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  price: "",
  maxProfessionals: "-1",
  features: "",
  isActive: true,
  displayOrder: "0",
};

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/planos");
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function openEdit(plan: Plan) {
    setEditing(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      price: String(plan.price),
      maxProfessionals: String(plan.maxProfessionals),
      features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
      isActive: plan.isActive,
      displayOrder: String(plan.displayOrder),
    });
    setError("");
  }

  async function save() {
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price),
      maxProfessionals: parseInt(form.maxProfessionals),
      features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
      isActive: form.isActive,
      displayOrder: parseInt(form.displayOrder),
    };

    const url = editing ? `/api/admin/planos/${editing}` : "/api/admin/planos";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao salvar.");
    }
    setSaving(false);
  }

  async function toggleActive(plan: Plan) {
    await fetch(`/api/admin/planos/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    await load();
  }

  async function deletePlan(id: string) {
    if (!confirm("Deletar este plano?")) return;
    await fetch(`/api/admin/planos/${id}`, { method: "DELETE" });
    await load();
  }

  const showForm = editing !== null || form !== EMPTY_FORM;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Planos</h2>
          <p className="mt-1 text-sm text-slate-400">Gerencie os planos de assinatura.</p>
        </div>
        <button
          onClick={openNew}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          + Novo plano
        </button>
      </div>

      {/* Form */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">{editing ? "Editar plano" : "Novo plano"}</h3>
        {error && <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Nome</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Slug</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s/g, "-") })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Preço (R$)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Máx. profissionais (-1 = ilimitado)</label>
            <input
              type="number"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
              value={form.maxProfessionals}
              onChange={(e) => setForm({ ...form, maxProfessionals: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Ordem de exibição</label>
            <input
              type="number"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-300">Plano ativo</label>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-400">Descrição</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-400">Features (uma por linha)</label>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar plano"}
          </button>
          {editing && (
            <button
              onClick={() => { setEditing(null); setForm(EMPTY_FORM); }}
              className="rounded-xl border border-white/10 px-5 py-2 text-sm text-slate-400 transition hover:text-white"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{plan.name}</p>
                  {!plan.isActive && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">Inativo</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-400">
                  R$ {Number(plan.price).toFixed(2)}/mês · {plan.maxProfessionals === -1 ? "Ilimitado" : `até ${plan.maxProfessionals}`} profissionais · {plan._count.barbershops} barbearias
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => openEdit(plan)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(plan)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:text-white"
                >
                  {plan.isActive ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-400 transition hover:bg-red-400/10"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum plano cadastrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
