"use client";

import { useEffect, useState } from "react";

import {
  PERMISSION_HINTS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type ProfessionalPermissions,
} from "@/lib/permissions";

/* Configuracao das permissoes do papel PROFISSIONAL (secao 18 do Portal do
   Profissional). Tela do PAINEL — tema escuro, ao contrario do portal.

   O bloco final lista o que NAO e configuravel. Isso e deliberado: sem essa
   lista, o gestor procura pelo interruptor de "ver o caixa geral" achando que
   esqueceram, quando na verdade a secao 23 proibe. */

const NOT_CONFIGURABLE = [
  "Ver a propria agenda e a propria comissao — sempre permitido",
  "Fluxo de caixa, contas e resultado financeiro da barbearia",
  "Comissao de outros profissionais",
  "Alterar percentual de comissao ou preco de servico",
  "Ajuste manual de estoque e compras",
  "Cadastro de usuarios e configuracao da barbearia",
  "Reabrir ou cancelar comanda ja paga",
];

export default function PermissoesPage() {
  const [permissions, setPermissions] = useState<ProfessionalPermissions | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/permissoes")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body) {
          setError("Nao foi possivel carregar as permissoes.");
          return;
        }
        setPermissions(body.permissions);
        setCanEdit(body.canEdit);
      })
      .finally(() => setLoading(false));
  }, []);

  async function update(key: keyof ProfessionalPermissions, value: boolean | number) {
    if (!permissions) return;
    const previous = permissions;

    // Atualizacao otimista: alternar um interruptor e esperar o servidor
    // responder deixa a tela com sensacao de travada no celular do gestor.
    setPermissions({ ...permissions, [key]: value } as ProfessionalPermissions);
    setSaving(key);
    setSaved(false);

    try {
      const res = await fetch("/api/permissoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPermissions(previous);
        setError(body.error ?? "Nao foi possivel salvar.");
        return;
      }
      setPermissions(body.permissions);
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setPermissions(previous);
      setError("Falha de conexao.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Carregando…</p>;
  }

  if (!permissions) {
    return (
      <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
        {error ?? "Permissoes indisponiveis."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Permissoes do profissional</h1>
        <p className="mt-1 text-sm text-slate-400">
          Vale para todos os barbeiros desta barbearia. Alteracoes entram em vigor
          na proxima acao do profissional.
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          Salvo.
        </p>
      )}
      {!canEdit && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          Somente o dono ou gerente pode alterar estas permissoes.
        </p>
      )}

      <ul className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5">
        {PERMISSION_KEYS.map((key) => {
          const value = permissions[key];
          const hint = PERMISSION_HINTS[key];

          return (
            <li key={key} className="flex items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">
                  {PERMISSION_LABELS[key]}
                </p>
                {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
              </div>

              {typeof value === "number" ? (
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={value}
                  disabled={!canEdit || saving === key}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="w-20 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-right text-sm text-white outline-none focus:border-cyan-400/40 disabled:opacity-40"
                />
              ) : (
                <button
                  role="switch"
                  aria-checked={value}
                  aria-label={PERMISSION_LABELS[key]}
                  disabled={!canEdit || saving === key}
                  onClick={() => update(key, !value)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${
                    value ? "bg-cyan-400/80" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                      value ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-sm font-semibold text-slate-200">
          Nao configuravel — por definicao do sistema
        </h2>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
          {NOT_CONFIGURABLE.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
