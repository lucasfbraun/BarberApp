"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { LABEL, MUTED, NOTICE, TITLE } from "@/lib/ui-pro";

/* Lista de clientes (secao 7). Por padrao so quem o barbeiro ja atendeu —
   e o escopo minimo necessario. "Todos" existe para achar quem chegou agora. */

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  lastVisitAt: string | null;
  totalVisits: number;
  hasPreferences: boolean;
};

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"meus" | "todos">("meus");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ scope });
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/profissional/clientes?${params}`);
    if (res.ok) setCustomers((await res.json()).customers ?? []);
    setLoading(false);
  }, [search, scope]);

  // Debounce: evita uma consulta por tecla digitada.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <header className="pt-10">
        <p className={LABEL}>Clientes</p>
        <h1 className={`${TITLE} mt-3`}>Quem voce atende</h1>
      </header>

      <div className="mt-8 flex items-center gap-3 border-b border-slate-300 pb-2 focus-within:border-blue-600">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="w-full bg-transparent py-1.5 text-base outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="mt-3 flex gap-2">
        {(
          [
            ["meus", "Meus clientes"],
            ["todos", "Todos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setScope(value)}
            className={`flex-1 border px-4 py-2 text-sm transition ${
              scope === value
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 text-slate-700 hover:border-blue-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={`${MUTED} mt-8`}>Carregando…</p>
      ) : customers.length === 0 ? (
        <p className={`${NOTICE} mt-8`}>
          {search
            ? `Nada encontrado para "${search}".`
            : scope === "meus"
              ? "Voce ainda nao atendeu ninguem."
              : "Nenhum cliente cadastrado."}
        </p>
      ) : (
        <ul className="mt-6 border-t border-slate-200">
          {customers.map((c) => (
            <li key={c.id} className="border-b border-slate-200">
              <Link
                href={`/profissional/clientes/${c.id}`}
                className="flex items-center gap-4 py-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-base font-light text-slate-400">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium">
                    {c.name}
                    {c.hasPreferences && (
                      <span
                        title="Tem preferencias registradas"
                        className="ml-2 text-xs text-blue-600"
                      >
                        ★
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-sm text-slate-500">
                    {c.totalVisits > 0
                      ? `${c.totalVisits} atendimento${c.totalVisits === 1 ? "" : "s"}`
                      : "Primeira visita"}
                    {c.lastVisitAt
                      ? ` · ultimo em ${new Date(c.lastVisitAt).toLocaleDateString("pt-BR")}`
                      : ""}
                  </span>
                </span>
                <span className="shrink-0 text-slate-300">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
