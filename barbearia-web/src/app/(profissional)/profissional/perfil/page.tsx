"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ALERT,
  BUTTON,
  BUTTON_GHOST,
  INPUT,
  LABEL,
  MUTED,
  NOTICE,
  TEXTAREA,
  TITLE,
  WEEKDAY_SHORT,
  formatMoney,
} from "@/lib/ui-pro";
import ImageUploadField from "@/components/ImageUploadField";

/* Perfil do profissional (secao 12).

   A tela separa visualmente o que o barbeiro edita (foto, nome, bio) do que e
   controlado pelo administrador (servicos, precos, comissao, jornada). O
   segundo bloco e somente leitura e diz de quem e a responsabilidade — assim o
   barbeiro sabe a quem pedir mudanca em vez de procurar um botao que nao
   existe. */

type Profile = {
  professional: {
    id: string;
    name: string;
    bio: string | null;
    photoUrl: string | null;
    commissionType: string | null;
    commissionValue: number | null;
  };
  services: { id: string; name: string; price: number; durationMinutes: number }[];
  workingHours: {
    id: string;
    weekday: number;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    active: boolean;
  }[];
  rating: { average: number | null; count: number };
};

export default function PerfilPage() {
  const [data, setData] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profissional/perfil")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setError(body.error ?? "Nao foi possivel carregar o perfil.");
          return null;
        }
        return r.json();
      })
      .then((body: Profile | null) => {
        if (!body) return;
        setData(body);
        setName(body.professional.name);
        setBio(body.professional.bio ?? "");
        setPhotoUrl(body.professional.photoUrl ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profissional/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, photoUrl }),
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
        <p className={ALERT}>{error ?? "Perfil indisponivel."}</p>
        <Link href="/profissional" className={`${BUTTON_GHOST} mt-6`}>
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="pt-10">
        <p className={LABEL}>Perfil</p>
        <h1 className={`${TITLE} mt-3`}>{data.professional.name}</h1>
        {data.rating.count > 0 && (
          <p className={`${MUTED} mt-1`}>
            {data.rating.average?.toFixed(1)} de 5 · {data.rating.count} avaliacao
            {data.rating.count === 1 ? "" : "es"}
          </p>
        )}
      </header>

      {error && <p className={`${ALERT} mt-6`}>{error}</p>}

      {/* ── O que o profissional edita ────────────────────────────────────── */}
      <section className="mt-10 space-y-5">
        <h2 className={LABEL}>Sua apresentacao</h2>

        {/* `rounded-none` alinha o campo a linguagem plana do portal — o
            padrao do componente e arredondado, herdado do painel escuro. */}
        <ImageUploadField
          label="Foto"
          value={photoUrl}
          onChange={setPhotoUrl}
          rounded="rounded-none"
          hint="Quadrada fica melhor. A imagem e reduzida no proprio aparelho."
        />

        <label className="block">
          <span className={LABEL}>Nome profissional</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Especialidades, tempo de experiencia, o que voce faz melhor."
            className={`${TEXTAREA} mt-1`}
          />
        </label>

        <button onClick={save} disabled={saving} className={BUTTON}>
          {saving ? "Salvando…" : saved ? "Salvo" : "Salvar"}
        </button>
      </section>

      {/* ── O que o administrador controla ────────────────────────────────── */}
      <section className="mt-12">
        <h2 className={LABEL}>Seus servicos</h2>
        <p className={`${NOTICE} mt-3`}>
          Servicos, precos e comissao sao definidos pela barbearia.
        </p>

        {data.services.length === 0 ? (
          <p className={`${MUTED} mt-4`}>Nenhum servico habilitado.</p>
        ) : (
          <ul className="mt-3 border-t border-slate-200">
            {data.services.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between border-b border-slate-200 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base">{s.name}</span>
                  <span className="text-sm text-slate-500">{s.durationMinutes} min</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  {formatMoney(s.price)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className={LABEL}>Sua jornada</h2>
        {data.workingHours.length === 0 ? (
          <p className={`${MUTED} mt-3`}>Jornada nao cadastrada.</p>
        ) : (
          <ul className="mt-3 border-t border-slate-200">
            {data.workingHours.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between border-b border-slate-200 py-3 text-sm"
              >
                <span className="w-12 text-slate-500">{WEEKDAY_SHORT[w.weekday]}</span>
                <span className="flex-1 tabular-nums">
                  {w.active ? `${w.startTime} – ${w.endTime}` : "Folga"}
                </span>
                {w.breakStart && w.breakEnd && (
                  <span className="text-slate-400 tabular-nums">
                    pausa {w.breakStart}–{w.breakEnd}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.professional.commissionValue != null && (
        <section className="mt-12">
          <h2 className={LABEL}>Sua comissao</h2>
          <p className="mt-2 text-base">
            {data.professional.commissionType === "percent"
              ? `${data.professional.commissionValue}% por atendimento`
              : `${formatMoney(data.professional.commissionValue)} por atendimento`}
          </p>
        </section>
      )}

      <Link href="/profissional/mais" className={`${BUTTON_GHOST} mt-12`}>
        Voltar
      </Link>
    </div>
  );
}
