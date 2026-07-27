"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  ALERT,
  BUTTON,
  BUTTON_GHOST,
  LABEL,
  METRIC,
  MUTED,
  NOTICE,
  STATUS_LABELS,
  TEXTAREA,
  TITLE,
  formatMoney,
} from "@/lib/ui-pro";
import {
  PREFERENCE_KEYS,
  PREFERENCE_LABELS,
  SAFETY_KEYS,
  type CustomerPreferences,
} from "@/lib/customer-preferences";

/* Ficha do cliente (secao 7): historico, preferencias e observacoes.

   Alergias e restricoes aparecem NO TOPO e em vermelho. E a unica informacao
   da tela que, se passar despercebida, machuca alguem. */

type HistoryItem = {
  id: string;
  startsAt: string;
  status: string;
  notes: string | null;
  professional: string | null;
  service: string | null;
  total: number;
  paid: boolean;
};

type Data = {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
    preferences: CustomerPreferences;
    totalVisits: number;
    lastVisitAt: string | null;
  };
  stats: {
    completed: number;
    cancellations: number;
    noShows: number;
    averageIntervalDays: number | null;
    topServices: { name: string; count: number }[];
    totalSpent: number;
  };
  nextAppointment: {
    id: string;
    startsAt: string;
    professional: { name: string } | null;
    service: { name: string } | null;
  } | null;
  history: HistoryItem[];
  reviews: { id: string; rating: number; comment: string | null; createdAt: string }[];
  permissions: { canEditCustomer: boolean; canViewCustomerPhone: boolean };
};

export default function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState("");
  const [prefs, setPrefs] = useState<CustomerPreferences>({});
  const [editingPrefs, setEditingPrefs] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/profissional/clientes/${id}`);
    if (res.ok) {
      const body: Data = await res.json();
      setData(body);
      setNotes(body.customer.notes ?? "");
      setPrefs(body.customer.preferences ?? {});
      setError(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Cliente nao encontrado.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/profissional/clientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Nao foi possivel salvar.");
        return;
      }
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className={`${MUTED} pt-16`}>Carregando…</p>;

  if (!data) {
    return (
      <div className="pt-16">
        <p className={ALERT}>{error ?? "Cliente nao encontrado."}</p>
        <Link href="/profissional/clientes" className={`${BUTTON_GHOST} mt-6`}>
          Voltar
        </Link>
      </div>
    );
  }

  const { customer, stats } = data;
  const safety = SAFETY_KEYS.filter((key) => prefs[key]);

  return (
    <div>
      <header className="pt-10">
        <p className={LABEL}>Cliente</p>
        <h1 className={`${TITLE} mt-3`}>{customer.name}</h1>
        {customer.phone && <p className={`${MUTED} mt-1`}>{customer.phone}</p>}
      </header>

      {/* Alergias e restricoes primeiro — antes de qualquer outra coisa. */}
      {safety.length > 0 && (
        <div className="mt-6 space-y-2">
          {safety.map((key) => (
            <p key={key} className={ALERT}>
              <strong>{PREFERENCE_LABELS[key]}:</strong> {prefs[key]}
            </p>
          ))}
        </div>
      )}

      {error && <p className={`${ALERT} mt-6`}>{error}</p>}

      {data.nextAppointment && (
        <section className="mt-10">
          <h2 className={LABEL}>Proximo agendamento</h2>
          <p className="mt-2 text-base">
            {new Date(data.nextAppointment.startsAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {data.nextAppointment.service?.name ?? "Servico"}
          </p>
        </section>
      )}

      {/* ── Indicadores ───────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className={LABEL}>Historico</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <dt className={LABEL}>Atendimentos</dt>
            <dd className={`${METRIC} mt-1`}>{stats.completed}</dd>
          </div>
          <div>
            <dt className={LABEL}>Total gasto</dt>
            <dd className={`${METRIC} mt-1`}>{formatMoney(stats.totalSpent)}</dd>
          </div>
          <div>
            <dt className={LABEL}>Frequencia</dt>
            <dd className={`${METRIC} mt-1`}>
              {stats.averageIntervalDays != null
                ? `${stats.averageIntervalDays}d`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className={LABEL}>Faltas</dt>
            <dd className={`${METRIC} mt-1`}>{stats.noShows}</dd>
          </div>
        </dl>

        {stats.topServices.length > 0 && (
          <p className={`${MUTED} mt-4`}>
            Costuma pedir: {stats.topServices.map((s) => s.name).join(", ")}
          </p>
        )}
      </section>

      {/* ── Preferencias ──────────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className={LABEL}>Preferencias</h2>
          <button
            onClick={() => setEditingPrefs((v) => !v)}
            className="text-sm text-blue-600"
          >
            {editingPrefs ? "Fechar" : "Editar"}
          </button>
        </div>

        {editingPrefs ? (
          <div className="mt-4 space-y-4">
            {PREFERENCE_KEYS.map((key) => (
              <label key={key} className="block">
                <span className={LABEL}>{PREFERENCE_LABELS[key]}</span>
                <input
                  value={prefs[key] ?? ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-2 text-base outline-none focus:border-blue-600"
                />
              </label>
            ))}
            <button
              onClick={async () => {
                await save({ preferences: prefs });
                setEditingPrefs(false);
                load();
              }}
              disabled={saving}
              className={BUTTON}
            >
              {saving ? "Salvando…" : "Salvar preferencias"}
            </button>
          </div>
        ) : PREFERENCE_KEYS.some((key) => prefs[key]) ? (
          <dl className="mt-3 space-y-2 text-sm">
            {PREFERENCE_KEYS.filter((key) => prefs[key]).map((key) => (
              <div key={key} className="flex gap-3">
                <dt className="w-40 shrink-0 text-slate-400">
                  {PREFERENCE_LABELS[key]}
                </dt>
                <dd className="min-w-0 flex-1">{prefs[key]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={`${NOTICE} mt-3`}>
            Nada registrado ainda. Anotar aqui o que o cliente gosta poupa a
            pergunta na proxima visita.
          </p>
        )}
      </section>

      {/* ── Observacoes ───────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className={LABEL}>Observacoes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Ex.: degrade baixo, maquina 0,5 nas laterais, sem navalha no pescoco."
          className={`${TEXTAREA} mt-3`}
        />
        <button
          onClick={() => save({ notes })}
          disabled={saving}
          className={`${BUTTON_GHOST} mt-2`}
        >
          {saving ? "Salvando…" : saved ? "Salvo" : "Salvar observacoes"}
        </button>
      </section>

      {/* ── Atendimentos anteriores ───────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className={LABEL}>Atendimentos anteriores</h2>
        {data.history.length === 0 ? (
          <p className={`${NOTICE} mt-3`}>Nenhum atendimento registrado.</p>
        ) : (
          <ul className="mt-2 border-t border-slate-200">
            {data.history.map((h) => (
              <li key={h.id} className="border-b border-slate-200 py-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm tabular-nums text-slate-500">
                    {new Date(h.startsAt).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base">
                    {h.service ?? "Servico"}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {h.paid ? formatMoney(h.total) : "—"}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {STATUS_LABELS[h.status] ?? h.status}
                  {h.professional ? ` · ${h.professional}` : ""}
                </p>
                {h.notes && <p className="mt-1 text-sm text-slate-500">{h.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.reviews.length > 0 && (
        <section className="mt-10">
          <h2 className={LABEL}>Avaliacoes deste cliente</h2>
          <ul className="mt-2 border-t border-slate-200">
            {data.reviews.map((r) => (
              <li key={r.id} className="border-b border-slate-200 py-3">
                <p className="text-base">{"★".repeat(r.rating)}</p>
                {r.comment && <p className="text-sm text-slate-500">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/profissional/clientes" className={`${BUTTON_GHOST} mt-10`}>
        Voltar
      </Link>
    </div>
  );
}
