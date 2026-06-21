"use client";

import { useCallback, useEffect, useState } from "react";

// ─── tipos ────────────────────────────────────────────────────────────────────

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  source: string;
  professional: { id: string; name: string } | null;
  customer: { id: string; name: string; phone: string | null } | null;
  service: { id: string; name: string; durationMinutes: number; price: string } | null;
};

type Professional = { id: string; name: string };
type Service = { id: string; name: string; durationMinutes: number };
type Slot = { startsAt: string; endsAt: string };

type NewAppointmentForm = {
  professionalId: string;
  serviceId: string;
  date: string;
  slot: string;
  customerName: string;
  customerPhone: string;
  notes: string;
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
  RESCHEDULED: "Reagendado",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  CONFIRMED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  IN_PROGRESS: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  COMPLETED: "border-slate-600 bg-slate-700/40 text-slate-300",
  CANCELLED: "border-red-400/20 bg-red-400/10 text-red-300",
  NO_SHOW: "border-orange-400/20 bg-orange-400/10 text-orange-300",
  RESCHEDULED: "border-purple-400/20 bg-purple-400/10 text-purple-300",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── componente ──────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [date, setDate] = useState(todayStr());
  const [filterProf, setFilterProf] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // formulário novo agendamento
  const [form, setForm] = useState<NewAppointmentForm>({
    professionalId: "",
    serviceId: "",
    date: todayStr(),
    slot: "",
    customerName: "",
    customerPhone: "",
    notes: "",
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── loaders ────────────────────────────────────────────────────────────────

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (filterProf) params.set("professionalId", filterProf);
      const res = await fetch(`/api/agendamentos?${params}`);
      if (res.ok) {
        const data = (await res.json()) as { appointments: Appointment[] };
        setAppointments(data.appointments);
      }
    } finally {
      setLoading(false);
    }
  }, [date, filterProf]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  useEffect(() => {
    Promise.all([
      fetch("/api/profissionais").then((r) => r.json()),
      fetch("/api/servicos").then((r) => r.json()),
    ]).then(([pd, sd]) => {
      setProfessionals((pd as { professionals: Professional[] }).professionals ?? []);
      setServices((sd as { services: Service[] }).services ?? []);
    });
  }, []);

  // ── disponibilidade ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!form.professionalId || !form.serviceId || !form.date) {
      setSlots([]);
      return;
    }
    const load = async () => {
      setSlotsLoading(true);
      const p = new URLSearchParams({
        professionalId: form.professionalId,
        serviceId: form.serviceId,
        date: form.date,
      });
      const res = await fetch(`/api/disponibilidade?${p}`);
      if (res.ok) {
        const data = (await res.json()) as { slots: Slot[] };
        setSlots(data.slots);
      } else {
        setSlots([]);
      }
      setSlotsLoading(false);
    };
    load();
  }, [form.professionalId, form.serviceId, form.date]);

  // ── ações ─────────────────────────────────────────────────────────────────

  async function updateStatus(id: string, status: string, cancellationReason?: string) {
    await fetch(`/api/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(cancellationReason ? { cancellationReason } : {}) }),
    });
    await loadAppointments();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    if (!form.slot) {
      setFormError("Selecione um horário disponível.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/agendamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: form.professionalId || undefined,
        serviceId: form.serviceId || undefined,
        startsAt: form.slot,
        customerName: form.customerName || undefined,
        customerPhone: form.customerPhone || undefined,
        notes: form.notes || undefined,
      }),
    });

    const data = (await res.json()) as { error?: string };
    if (!res.ok) { setFormError(data.error ?? "Erro ao criar agendamento."); setSaving(false); return; }

    setSaving(false);
    setShowNew(false);
    setForm({ professionalId: "", serviceId: "", date: todayStr(), slot: "", customerName: "", customerPhone: "", notes: "" });
    await loadAppointments();
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const displayed = appointments.filter(
    (a) => !filterProf || a.professional?.id === filterProf,
  );

  const counters = {
    total: displayed.length,
    confirmed: displayed.filter((a) => a.status === "CONFIRMED" || a.status === "SCHEDULED").length,
    completed: displayed.filter((a) => a.status === "COMPLETED").length,
    cancelled: displayed.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW").length,
  };

  return (
    <section className="space-y-6">

      {/* Cabeçalho */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Agenda</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Agenda do dia</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" />
            <select value={filterProf} onChange={(e) => setFilterProf(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40">
              <option value="">Todos os profissionais</option>
              {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={() => setShowNew(true)}
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              + Novo agendamento
            </button>
          </div>
        </div>

        {/* Contadores */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Agendamentos", String(counters.total), "text-white"],
            ["Pendentes", String(counters.confirmed), "text-sky-300"],
            ["Concluídos", String(counters.completed), "text-emerald-300"],
            ["Cancelados / Faltas", String(counters.cancelled), "text-red-300"],
          ].map(([label, value, color]) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
              <p className={`mt-2 text-2xl font-semibold ${color}`}>{loading ? "—" : value}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Formulário de novo agendamento */}
      {showNew && (
        <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <h3 className="text-lg font-semibold text-white">Novo agendamento</h3>
          <form onSubmit={handleCreate} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Profissional</span>
              <select value={form.professionalId} onChange={(e) => setForm((s) => ({ ...s, professionalId: e.target.value, slot: "" }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40">
                <option value="">Qualquer profissional</option>
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Serviço</span>
              <select value={form.serviceId} onChange={(e) => setForm((s) => ({ ...s, serviceId: e.target.value, slot: "" }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40">
                <option value="">Selecionar serviço</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Data *</span>
              <input type="date" required value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value, slot: "" }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" />
            </label>
            <div className="space-y-2">
              <span className="text-sm text-slate-300">Horário disponível</span>
              {slotsLoading ? (
                <p className="text-sm text-slate-400">Buscando horários...</p>
              ) : slots.length === 0 && form.professionalId && form.serviceId ? (
                <p className="text-sm text-slate-400">Nenhum horário disponível nesta data.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button key={slot.startsAt} type="button"
                      onClick={() => setForm((s) => ({ ...s, slot: slot.startsAt }))}
                      className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                        form.slot === slot.startsAt
                          ? "border-cyan-400/40 bg-cyan-400/20 text-cyan-200"
                          : "border-white/10 bg-white/5 text-slate-200 hover:bg-cyan-400/10"
                      }`}>
                      {formatTime(slot.startsAt)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Nome do cliente</span>
              <input value={form.customerName} onChange={(e) => setForm((s) => ({ ...s, customerName: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" placeholder="João da Silva" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">WhatsApp</span>
              <input value={form.customerPhone} onChange={(e) => setForm((s) => ({ ...s, customerPhone: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" placeholder="(11) 99999-9999" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Observações</span>
              <input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" placeholder="Observações internas..." />
            </label>
            {formError && <p className="text-sm text-red-300 md:col-span-2">{formError}</p>}
            <div className="flex gap-3 md:col-span-2">
              <button type="submit" disabled={saving}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
                {saving ? "Salvando..." : "Criar agendamento"}
              </button>
              <button type="button" onClick={() => setShowNew(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de agendamentos */}
      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400 backdrop-blur">
          Carregando agenda...
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur">
          <p className="text-slate-400">Nenhum agendamento para este dia.</p>
          <button onClick={() => setShowNew(true)}
            className="mt-4 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
            Criar primeiro agendamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((a) => (
            <article key={a.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Horário + status */}
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xl font-semibold text-white">{formatTime(a.startsAt)}</p>
                    <p className="text-xs text-slate-500">até {formatTime(a.endsAt)}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS[a.status] ?? "border-white/10 text-slate-300"}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-2">
                  {a.status === "SCHEDULED" && (
                    <button onClick={() => updateStatus(a.id, "CONFIRMED")}
                      className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 transition hover:bg-emerald-400/20">
                      Confirmar
                    </button>
                  )}
                  {(a.status === "SCHEDULED" || a.status === "CONFIRMED") && (
                    <button onClick={() => updateStatus(a.id, "IN_PROGRESS")}
                      className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-300 transition hover:bg-amber-400/20">
                      Iniciar
                    </button>
                  )}
                  {a.status === "IN_PROGRESS" && (
                    <button onClick={() => updateStatus(a.id, "COMPLETED")}
                      className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs text-sky-300 transition hover:bg-sky-400/20">
                      Concluir
                    </button>
                  )}
                  {!["COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"].includes(a.status) && (
                    <button onClick={() => updateStatus(a.id, "CANCELLED", "Cancelado pelo painel")}
                      className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300 transition hover:bg-red-400/20">
                      Cancelar
                    </button>
                  )}
                  {!["COMPLETED", "CANCELLED", "RESCHEDULED"].includes(a.status) && (
                    <button onClick={() => updateStatus(a.id, "NO_SHOW")}
                      className="rounded-xl border border-orange-400/20 bg-orange-400/10 px-3 py-2 text-xs text-orange-300 transition hover:bg-orange-400/20">
                      Falta
                    </button>
                  )}
                </div>
              </div>

              {/* Dados do agendamento */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cliente</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {a.customer?.name ?? "Sem cliente"}
                  </p>
                  {a.customer?.phone && (
                    <p className="text-xs text-slate-400">{a.customer.phone}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profissional</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {a.professional?.name ?? "Não definido"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Serviço</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {a.service?.name ?? "Não definido"}
                  </p>
                  {a.service && (
                    <p className="text-xs text-slate-400">
                      {a.service.durationMinutes} min · {Number(a.service.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  )}
                </div>
              </div>

              {a.notes && (
                <p className="mt-3 text-sm text-slate-400">📝 {a.notes}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
