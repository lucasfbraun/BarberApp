"use client";

import Link from "next/link";
import { useState } from "react";

type Result = { couponCode: string; name: string; commissionRate: number; dashboardUrl: string } | null;

export default function RevendedorCadastroPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/public/revendedor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Erro ao cadastrar."); setLoading(false); return; }
    setResult(data);
    setLoading(false);
  }

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-8 text-center">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-4 text-2xl font-bold text-white">Cadastro realizado!</h1>
          <p className="mt-2 text-slate-400">Olá, {result.name}! Seu cupom exclusivo está pronto.</p>

          <div className="mt-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/5 px-6 py-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Seu cupom</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-cyan-400">{result.couponCode}</p>
            <p className="mt-2 text-sm text-slate-400">Comissão de {result.commissionRate}% sobre cada assinatura ativa</p>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            Compartilhe este código com as barbearias. Acesse seu dashboard para acompanhar o desempenho.
          </p>

          <Link
            href={result.dashboardUrl}
            className="mt-6 block rounded-2xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Acessar meu dashboard
          </Link>
          <Link href="/" className="mt-3 block text-sm text-slate-500 hover:text-slate-300">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/#revendedor" className="text-xs text-slate-500 hover:text-slate-300">← Voltar</Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Seja um revendedor</h1>
        <p className="mt-2 text-slate-400">
          Preencha seus dados e receba um cupom exclusivo com {10}% de comissão recorrente.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm text-slate-300">Nome completo</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="João Silva"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-slate-300">E-mail</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="joao@email.com"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-slate-300">WhatsApp</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
              placeholder="(11) 99999-9999"
            />
          </label>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? "Gerando cupom..." : "Quero ser revendedor"}
          </button>
        </form>
      </div>
    </div>
  );
}
