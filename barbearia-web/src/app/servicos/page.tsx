"use client";

import { useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  imageUrl: string | null;
  active: boolean;
  category: { id: string; name: string } | null;
  _count: { appointments: number };
};

type FormState = {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  durationMinutes: "30",
  price: "",
};

function formatPrice(price: string | number) {
  return Number(price).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/servicos");
      if (res.ok) {
        const data = (await res.json()) as { services: Service[] };
        setServices(data.services);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(s: Service) {
    setEditing(s.id);
    setForm({
      name: s.name,
      description: s.description ?? "",
      durationMinutes: String(s.durationMinutes),
      price: String(s.price),
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
    };

    const url = editing ? `/api/servicos/${editing}` : "/api/servicos";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    setEditing(null);
    await load();
  }

  async function toggleActive(s: Service) {
    await fetch(`/api/servicos/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    await load();
  }

  const active = services.filter((s) => s.active);
  const inactive = services.filter((s) => !s.active);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Serviços</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Catálogo de serviços</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Defina os serviços oferecidos, duração e preço. Eles aparecerão na agenda e na página pública.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="shrink-0 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            + Novo serviço
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Total", String(services.length)],
            ["Ativos", String(active.length)],
            ["Inativos", String(inactive.length)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{loading ? "—" : value}</p>
            </article>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <h3 className="text-lg font-semibold text-white">
            {editing ? "Editar serviço" : "Novo serviço"}
          </h3>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Nome *</span>
              <input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
                placeholder="Corte masculino"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Descrição</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                rows={2}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
                placeholder="Corte moderno com acabamento..."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Duração (minutos) *</span>
              <input
                type="number"
                min="5"
                step="5"
                required
                value={form.durationMinutes}
                onChange={(e) => setForm((s) => ({ ...s, durationMinutes: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Preço (R$) *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
                placeholder="35.00"
              />
            </label>

            {error && <p className="text-sm text-red-300 md:col-span-2">{error}</p>}

            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar serviço"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400 backdrop-blur">
          Carregando serviços...
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <p className="text-sm text-slate-400">Nenhum serviço cadastrado ainda.</p>
          <button
            onClick={openCreate}
            className="mt-4 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Cadastrar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <article
              key={s.id}
              className={`flex items-center gap-4 rounded-3xl border p-5 backdrop-blur transition ${
                s.active
                  ? "border-white/10 bg-white/5"
                  : "border-white/5 bg-white/[0.02] opacity-60"
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-lg font-semibold text-amber-200">
                {formatDuration(s.durationMinutes).split(" ")[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{s.name}</p>
                  {!s.active && (
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-400">
                      Inativo
                    </span>
                  )}
                  {s.category && (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
                      {s.category.name}
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="mt-0.5 text-sm text-slate-400 truncate">{s.description}</p>
                )}
                <div className="mt-1 flex gap-3 text-xs text-slate-500">
                  <span>{formatDuration(s.durationMinutes)}</span>
                  <span className="text-emerald-400 font-semibold">{formatPrice(s.price)}</span>
                  <span className="text-slate-600">{s._count.appointments} agendamentos</span>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  className={`rounded-xl border px-3 py-2 text-xs transition ${
                    s.active
                      ? "border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/20"
                      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                  }`}
                >
                  {s.active ? "Desativar" : "Reativar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
