"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  ALERT,
  BUTTON,
  BUTTON_GHOST,
  INPUT,
  LABEL,
  MUTED,
  NOTICE,
  SELECT,
  TITLE,
} from "@/lib/ui-pro";

/* Bloqueio de horario (secao 5).

   O barbeiro BLOQUEIA a propria agenda, mas nao DESBLOQUEIA — essa e uma
   regra de negocio ja existente no projeto (ver pm/bloqueios-de-agenda.md):
   remover bloqueio e exclusivo do administrador do tenant. A tela diz isso em
   vez de esconder um botao que a API recusaria. */

type Block = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  type: string;
};

const TYPES = [
  { value: "PERSONAL", label: "Compromisso pessoal" },
  { value: "MANUAL_BLOCK", label: "Bloqueio simples" },
  { value: "DAY_OFF", label: "Folga" },
  { value: "VACATION", label: "Ferias" },
  { value: "MAINTENANCE", label: "Manutencao" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label]),
);

export default function BloqueiosPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [type, setType] = useState("PERSONAL");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const from = new Date().toISOString();
    const res = await fetch(`/api/bloqueios?from=${from}`);
    if (res.ok) {
      setBlocks((await res.json()).blocks ?? []);
      setError(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Nao foi possivel carregar os bloqueios.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/bloqueios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          type,
          reason: reason || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Nao foi possivel bloquear.");
        return;
      }
      setError(null);
      setStartsAt("");
      setEndsAt("");
      setReason("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  const ready = startsAt && endsAt && new Date(endsAt) > new Date(startsAt);

  return (
    <div>
      <header className="pt-10">
        <p className={LABEL}>Agenda</p>
        <h1 className={`${TITLE} mt-3`}>Bloquear horario</h1>
      </header>

      {error && <p className={`${ALERT} mt-6`}>{error}</p>}

      <section className="mt-10 space-y-5">
        <label className="block">
          <span className={LABEL}>Inicio</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Fim</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Motivo</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className={SELECT}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Observacao (opcional)"
          className={INPUT}
        />

        <button onClick={submit} disabled={!ready || saving} className={BUTTON}>
          {saving ? "Bloqueando…" : "Bloquear"}
        </button>

        <p className={NOTICE}>
          Enquanto bloqueado, o horario nao recebe agendamento. Para desbloquear,
          fale com o administrador da barbearia.
        </p>
      </section>

      <section className="mt-12">
        <h2 className={LABEL}>Seus bloqueios</h2>
        {loading ? (
          <p className={`${MUTED} mt-3`}>Carregando…</p>
        ) : blocks.length === 0 ? (
          <p className={`${NOTICE} mt-3`}>Nenhum bloqueio futuro.</p>
        ) : (
          <ul className="mt-2 border-t border-slate-200">
            {blocks.map((b) => (
              <li key={b.id} className="border-b border-slate-200 py-3">
                <p className="text-base tabular-nums">
                  {new Date(b.startsAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {new Date(b.endsAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className={MUTED}>
                  {TYPE_LABELS[b.type] ?? b.type}
                  {b.reason ? ` · ${b.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/profissional" className={`${BUTTON_GHOST} mt-10`}>
        Voltar ao inicio
      </Link>
    </div>
  );
}
