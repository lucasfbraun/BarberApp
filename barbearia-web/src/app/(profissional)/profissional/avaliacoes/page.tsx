"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { BUTTON_GHOST, LABEL, METRIC, MUTED, NOTICE, TITLE } from "@/lib/ui-pro";

/* Avaliacoes recebidas (secao 15). Somente leitura: o profissional nao apaga
   avaliacao, e a moderacao e do administrador. Responder avaliacao depende de
   um campo que o modelo Review ainda nao tem — fase 2. */

type Data = {
  average: number | null;
  total: number;
  distribution: Record<string, number>;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    customerName: string;
    serviceName: string | null;
  }[];
};

export default function AvaliacoesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profissional/avaliacoes")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={`${MUTED} pt-16`}>Carregando…</p>;

  return (
    <div>
      <header className="pt-10">
        <p className={LABEL}>Avaliacoes</p>
        <h1 className={`${TITLE} mt-3`}>O que dizem de voce</h1>
      </header>

      {!data || data.total === 0 ? (
        <p className={`${NOTICE} mt-10`}>
          Voce ainda nao recebeu avaliacoes. Elas aparecem aqui assim que os
          clientes avaliarem um atendimento finalizado.
        </p>
      ) : (
        <>
          <section className="mt-10">
            <p className={METRIC}>{data.average?.toFixed(1)}</p>
            <p className={MUTED}>
              media de {data.total} avaliacao{data.total === 1 ? "" : "es"}
            </p>

            <ul className="mt-5 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = data.distribution[String(star)] ?? 0;
                const percent = data.total > 0 ? (count / data.total) * 100 : 0;
                return (
                  <li key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-4 tabular-nums text-slate-500">{star}</span>
                    <span className="h-1.5 flex-1 bg-slate-200">
                      <span
                        className="block h-full bg-blue-600"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-6 text-right tabular-nums text-slate-400">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className={LABEL}>Comentarios</h2>
            <ul className="mt-2 border-t border-slate-200">
              {data.reviews.map((r) => (
                <li key={r.id} className="border-b border-slate-200 py-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base text-amber-500">
                      {"★".repeat(r.rating)}
                      <span className="text-slate-200">{"★".repeat(5 - r.rating)}</span>
                    </span>
                    <span className="text-sm text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-base">{r.comment}</p>}
                  <p className={`${MUTED} mt-1`}>
                    {r.customerName}
                    {r.serviceName ? ` · ${r.serviceName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <Link href="/profissional/mais" className={`${BUTTON_GHOST} mt-10`}>
        Voltar
      </Link>
    </div>
  );
}
