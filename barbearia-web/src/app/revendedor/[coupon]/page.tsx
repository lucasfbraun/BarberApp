"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Barbershop = { id: string; name: string; slug: string; since: string; revenue: number };
type Dashboard = {
  name: string;
  email: string;
  couponCode: string;
  commissionRate: number;
  status: string;
  totalBarbershops: number;
  totalRevenue: number;
  totalCommission: number;
  barbershops: Barbershop[];
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RevendedorDashboard() {
  const params = useParams<{ coupon: string }>();
  const coupon = params?.coupon ?? "";
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!coupon) return;
    fetch(`/api/public/revendedor/${coupon}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then((d) => { if (d) setData(d); setLoading(false); });
  }, [coupon]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Carregando...</div>;
  if (notFound) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 gap-4">
      <p className="text-xl text-white">Cupom não encontrado.</p>
      <Link href="/revendedor/cadastro" className="text-cyan-400 hover:underline">Cadastre-se como revendedor</Link>
    </div>
  );
  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">← lbraunapp</Link>
            <h1 className="mt-2 text-2xl font-bold text-white">Olá, {data.name}</h1>
            <p className="text-sm text-slate-400">Dashboard do revendedor</p>
          </div>
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 px-6 py-3 text-center">
            <p className="text-xs text-slate-500">Seu cupom</p>
            <p className="font-mono text-xl font-bold tracking-widest text-cyan-400">{data.couponCode}</p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Barbearias ativas", value: String(data.totalBarbershops), color: "text-cyan-400" },
            { label: "Receita gerada", value: fmt(data.totalRevenue), color: "text-emerald-400" },
            { label: "Comissão acumulada", value: fmt(data.totalCommission), color: "text-amber-400" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">{c.label}</p>
              <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">
            Você recebe <span className="font-semibold text-cyan-400">{data.commissionRate}%</span> de comissão sobre
            a receita gerada por cada barbearia que se cadastrou usando seu cupom.
          </p>
        </div>

        {/* Barbearias */}
        <div className="rounded-2xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">Barbearias indicadas</h2>
          </div>
          {data.barbershops.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              Nenhuma barbearia usou seu cupom ainda. Compartilhe o código <span className="text-cyan-400 font-mono">{data.couponCode}</span> na tela de cadastro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-slate-500">
                    <th className="px-5 py-3">Barbearia</th>
                    <th className="px-5 py-3">Desde</th>
                    <th className="px-5 py-3 text-right">Receita</th>
                    <th className="px-5 py-3 text-right">Sua comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {data.barbershops.map((b) => (
                    <tr key={b.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 font-medium text-white">{b.name}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(b.since).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-300">{fmt(b.revenue)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-amber-300">
                        {fmt(b.revenue * (data.commissionRate / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600">
          Salve este link para acessar seu dashboard: /revendedor/{data.couponCode}
        </p>
      </div>
    </div>
  );
}
