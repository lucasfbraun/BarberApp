"use client";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Visão geral</h2>
        <p className="mt-1 text-sm text-slate-400">Painel master do lbraunapp.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Barbearias", href: "/admin/barbearias" },
          { label: "Planos", href: "/admin/planos" },
          { label: "Revendedores", href: "/admin/revendedores" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-amber-400/20 hover:bg-amber-400/5"
          >
            <p className="text-sm text-slate-400">Gerenciar</p>
            <p className="mt-1 text-xl font-semibold text-white">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
