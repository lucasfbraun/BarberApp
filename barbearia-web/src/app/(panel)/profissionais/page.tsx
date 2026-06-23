"use client";

import { useEffect, useState, useCallback } from "react";

// ─── tipos ────────────────────────────────────────────────────────────────────

type Professional = {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  commissionType: string | null;
  commissionValue: number | null;
  displayOrder: number;
  active: boolean;
  _count: { appointments: number };
};

type ServiceLink = {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  linked: boolean;
  linkActive: boolean;
};

type WorkingDay = {
  weekday: number;
  active: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
};

type FormState = {
  name: string;
  bio: string;
  phone: string;
  email: string;
  commissionType: string;
  commissionValue: string;
};

const emptyForm: FormState = {
  name: "",
  bio: "",
  phone: "",
  email: "",
  commissionType: "percentage",
  commissionValue: "",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const defaultSchedule = (): WorkingDay[] =>
  WEEKDAYS.map((_, i) => ({
    weekday: i,
    active: i >= 1 && i <= 6,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  }));

function formatPrice(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── componente ──────────────────────────────────────────────────────────────

export default function ProfissionaisPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  // form de criação/edição
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // painel de detalhes
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"jornada" | "servicos">("jornada");

  // jornada
  const [schedule, setSchedule] = useState<WorkingDay[]>(defaultSchedule());
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  // serviços vinculados
  const [serviceLinks, setServiceLinks] = useState<ServiceLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);

  // ── loaders ────────────────────────────────────────────────────────────────

  const loadProfessionals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profissionais");
      if (res.ok) {
        const data = (await res.json()) as { professionals: Professional[] };
        setProfessionals(data.professionals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfessionals(); }, [loadProfessionals]);

  async function loadSchedule(id: string) {
    setScheduleLoading(true);
    setScheduleMsg(null);
    try {
      const res = await fetch(`/api/profissionais/${id}/jornada`);
      if (res.ok) {
        const data = (await res.json()) as { workingHours: WorkingDay[] };
        if (data.workingHours.length > 0) {
          const filled = defaultSchedule().map((def) => {
            const saved = data.workingHours.find((w) => w.weekday === def.weekday);
            return saved
              ? { ...def, ...saved, breakStart: saved.breakStart ?? "", breakEnd: saved.breakEnd ?? "" }
              : def;
          });
          setSchedule(filled);
        } else {
          setSchedule(defaultSchedule());
        }
      }
    } finally {
      setScheduleLoading(false);
    }
  }

  async function loadServiceLinks(id: string) {
    setLinksLoading(true);
    try {
      const res = await fetch(`/api/profissionais/${id}/servicos`);
      if (res.ok) {
        const data = (await res.json()) as { services: ServiceLink[] };
        setServiceLinks(data.services);
      }
    } finally {
      setLinksLoading(false);
    }
  }

  // ── expandir painel de detalhes ───────────────────────────────────────────

  async function toggleExpand(p: Professional) {
    if (expanded === p.id) {
      setExpanded(null);
      return;
    }
    setExpanded(p.id);
    setTab("jornada");
    await Promise.all([loadSchedule(p.id), loadServiceLinks(p.id)]);
  }

  // ── formulário ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(p: Professional) {
    setEditing(p.id);
    setForm({
      name: p.name,
      bio: p.bio ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      commissionType: p.commissionType ?? "percentage",
      commissionValue: p.commissionValue != null ? String(p.commissionValue) : "",
    });
    setFormError(null);
    setShowForm(true);
    setExpanded(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name,
      bio: form.bio || null,
      phone: form.phone || null,
      email: form.email || null,
      commissionType: form.commissionType || null,
      commissionValue: form.commissionValue ? Number(form.commissionValue) : null,
    };

    const url = editing ? `/api/profissionais/${editing}` : "/api/profissionais";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { error?: string };
    if (!res.ok) { setFormError(data.error ?? "Erro ao salvar."); setSaving(false); return; }

    setSaving(false);
    setShowForm(false);
    setEditing(null);
    await loadProfessionals();
  }

  async function toggleActive(p: Professional) {
    await fetch(`/api/profissionais/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    await loadProfessionals();
  }

  // ── jornada ────────────────────────────────────────────────────────────────

  function updateDay(weekday: number, field: keyof WorkingDay, value: string | boolean) {
    setSchedule((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, [field]: value } : d)),
    );
  }

  async function saveSchedule() {
    if (!expanded) return;
    setScheduleSaving(true);
    setScheduleMsg(null);

    const res = await fetch(`/api/profissionais/${expanded}/jornada`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: schedule }),
    });

    const data = (await res.json()) as { error?: string };
    setScheduleMsg(res.ok ? "Jornada salva com sucesso." : (data.error ?? "Erro ao salvar."));
    setScheduleSaving(false);
  }

  // ── serviços ───────────────────────────────────────────────────────────────

  async function toggleServiceLink(serviceId: string, isLinked: boolean) {
    if (!expanded) return;
    const method = isLinked ? "DELETE" : "POST";
    await fetch(`/api/profissionais/${expanded}/servicos`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId }),
    });
    await loadServiceLinks(expanded);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const active = professionals.filter((p) => p.active);
  const inactive = professionals.filter((p) => !p.active);

  return (
    <section className="space-y-6">

      {/* Cabeçalho */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Profissionais</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Equipe da barbearia</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Gerencie a equipe, configure jornada e vincule os serviços que cada profissional realiza.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="shrink-0 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            + Novo profissional
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[["Total", String(professionals.length)], ["Ativos", String(active.length)], ["Inativos", String(inactive.length)]].map(
            ([label, value]) => (
              <article key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{loading ? "—" : value}</p>
              </article>
            ),
          )}
        </div>
      </div>

      {/* Formulário de criação/edição */}
      {showForm && (
        <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <h3 className="text-lg font-semibold text-white">
            {editing ? "Editar profissional" : "Novo profissional"}
          </h3>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Nome *</span>
              <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" placeholder="João Silva" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Bio</span>
              <textarea value={form.bio} onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))} rows={2}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" placeholder="Especialista em cortes modernos..." />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Telefone</span>
              <input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" placeholder="(11) 99999-9999" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">E-mail</span>
              <input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" placeholder="joao@barbearia.com" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Tipo de comissão</span>
              <select value={form.commissionType} onChange={(e) => setForm((s) => ({ ...s, commissionType: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40">
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">{form.commissionType === "percentage" ? "Comissão (%)" : "Valor fixo (R$)"}</span>
              <input type="number" min="0" step="0.01" value={form.commissionValue}
                onChange={(e) => setForm((s) => ({ ...s, commissionValue: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
                placeholder={form.commissionType === "percentage" ? "40" : "50.00"} />
            </label>
            {formError && <p className="text-sm text-red-300 md:col-span-2">{formError}</p>}
            <div className="flex gap-3 md:col-span-2">
              <button type="submit" disabled={saving}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar profissional"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400 backdrop-blur">
          Carregando profissionais...
        </div>
      ) : professionals.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <p className="text-sm text-slate-400">Nenhum profissional cadastrado ainda.</p>
          <button onClick={openCreate} className="mt-4 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
            Cadastrar primeiro profissional
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {professionals.map((p) => (
            <div key={p.id}>
              {/* Card do profissional */}
              <article
                className={`flex items-center gap-4 rounded-3xl border p-5 backdrop-blur transition ${
                  p.active ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"
                } ${expanded === p.id ? "rounded-b-none border-b-0" : ""}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-lg font-semibold text-cyan-200">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">{p.name}</p>
                    {!p.active && <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-400">Inativo</span>}
                  </div>
                  {p.bio && <p className="mt-0.5 text-sm text-slate-400 truncate">{p.bio}</p>}
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                    {p.phone && <span>{p.phone}</span>}
                    {p.commissionValue != null && (
                      <span className="text-emerald-400">
                        {p.commissionType === "percentage" ? `${p.commissionValue}%` : `R$ ${p.commissionValue}`}
                      </span>
                    )}
                    <span>{p._count.appointments} agendamentos</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => toggleExpand(p)}
                    className={`rounded-xl border px-3 py-2 text-xs transition ${
                      expanded === p.id
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                        : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}>
                    {expanded === p.id ? "Fechar" : "Detalhes"}
                  </button>
                  <button onClick={() => openEdit(p)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10">
                    Editar
                  </button>
                  <button onClick={() => toggleActive(p)}
                    className={`rounded-xl border px-3 py-2 text-xs transition ${
                      p.active
                        ? "border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/20"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                    }`}>
                    {p.active ? "Desativar" : "Reativar"}
                  </button>
                </div>
              </article>

              {/* Painel expandido: jornada + serviços */}
              {expanded === p.id && (
                <div className="rounded-b-3xl border border-t-0 border-white/10 bg-slate-950/60 p-5 backdrop-blur">
                  {/* Tabs */}
                  <div className="flex gap-2 border-b border-white/10 pb-3">
                    {(["jornada", "servicos"] as const).map((t) => (
                      <button key={t} onClick={() => setTab(t)}
                        className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                          tab === t
                            ? "bg-cyan-400/15 text-cyan-200"
                            : "text-slate-400 hover:text-white"
                        }`}>
                        {t === "jornada" ? "Jornada de trabalho" : "Serviços vinculados"}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Jornada */}
                  {tab === "jornada" && (
                    <div className="mt-4 space-y-3">
                      {scheduleLoading ? (
                        <p className="text-sm text-slate-400">Carregando jornada...</p>
                      ) : (
                        <>
                          <div className="grid gap-2">
                            {schedule.map((day) => (
                              <div key={day.weekday} className={`grid grid-cols-[60px_1fr] gap-3 rounded-2xl border p-3 ${day.active ? "border-white/10 bg-white/5" : "border-white/5 opacity-50"}`}>
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="text-xs font-semibold text-slate-300">{WEEKDAYS[day.weekday]}</span>
                                  <button type="button"
                                    onClick={() => updateDay(day.weekday, "active", !day.active)}
                                    className={`rounded-lg px-2 py-1 text-xs transition ${day.active ? "bg-emerald-400/20 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>
                                    {day.active ? "Ativo" : "Off"}
                                  </button>
                                </div>
                                {day.active && (
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {[
                                      { field: "startTime", label: "Início" },
                                      { field: "endTime", label: "Fim" },
                                      { field: "breakStart", label: "Pausa início" },
                                      { field: "breakEnd", label: "Pausa fim" },
                                    ].map(({ field, label }) => (
                                      <label key={field} className="space-y-1">
                                        <span className="text-xs text-slate-500">{label}</span>
                                        <input type="time"
                                          value={day[field as keyof WorkingDay] as string}
                                          onChange={(e) => updateDay(day.weekday, field as keyof WorkingDay, e.target.value)}
                                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400/40" />
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {scheduleMsg && (
                            <p className={`text-sm ${scheduleMsg.includes("sucesso") ? "text-emerald-300" : "text-red-300"}`}>
                              {scheduleMsg}
                            </p>
                          )}

                          <button onClick={saveSchedule} disabled={scheduleSaving}
                            className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
                            {scheduleSaving ? "Salvando..." : "Salvar jornada"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Tab: Serviços */}
                  {tab === "servicos" && (
                    <div className="mt-4 space-y-2">
                      {linksLoading ? (
                        <p className="text-sm text-slate-400">Carregando serviços...</p>
                      ) : serviceLinks.length === 0 ? (
                        <p className="text-sm text-slate-400">Nenhum serviço cadastrado na barbearia ainda.</p>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500">Marque os serviços que este profissional realiza.</p>
                          {serviceLinks.map((s) => (
                            <div key={s.id} className={`flex items-center justify-between rounded-2xl border p-3 transition ${s.linked && s.linkActive ? "border-emerald-400/20 bg-emerald-400/10" : "border-white/10 bg-white/5"}`}>
                              <div>
                                <p className="text-sm font-semibold text-white">{s.name}</p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {s.durationMinutes} min · {formatPrice(s.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => toggleServiceLink(s.id, s.linked && s.linkActive)}
                                className={`rounded-xl border px-3 py-2 text-xs transition ${
                                  s.linked && s.linkActive
                                    ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200 hover:bg-red-400/15 hover:text-red-300 hover:border-red-400/30"
                                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-emerald-400/10 hover:text-emerald-300 hover:border-emerald-400/20"
                                }`}>
                                {s.linked && s.linkActive ? "Vinculado ✓" : "Vincular"}
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
