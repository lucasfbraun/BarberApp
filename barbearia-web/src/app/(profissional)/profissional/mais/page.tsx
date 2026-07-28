"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { LABEL, MUTED, TITLE } from "@/lib/ui-pro";

/* Menu "Mais" (secao 22).

   Só entram itens que existem. O documento lista tambem Desempenho, Portfolio,
   Metas, Jornada e Comunicados — fora do MVP da secao 24, entao nao aparecem
   aqui: menu com item que nao leva a lugar nenhum e pior do que menu curto.
   Ver pm/portal-do-profissional.md para o que ficou para a fase 2. */

const ITEMS = [
  { href: "/profissional/bloqueios", label: "Bloquear horario", hint: "Folga, almoco, compromisso" },
  { href: "/profissional/avaliacoes", label: "Avaliacoes", hint: "O que os clientes acharam" },
  { href: "/profissional/perfil", label: "Perfil", hint: "Foto, bio e seus servicos" },
];

export default function MaisPage() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profissional/perfil")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setName(d.professional.name))
      .catch(() => null);
  }, []);

  return (
    <div>
      <header className="pt-8">
        <Logo variant="light" size="sm" className="mb-6" />
        <p className={LABEL}>Menu</p>
        <h1 className={`${TITLE} mt-3`}>{name ?? "Mais"}</h1>
      </header>

      <ul className="mt-10 border-t border-slate-200">
        {ITEMS.map((item) => (
          <li key={item.href} className="border-b border-slate-200">
            <Link href={item.href} className="flex items-center gap-4 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium">{item.label}</span>
                <span className="block text-sm text-slate-500">{item.hint}</span>
              </span>
              <span className="shrink-0 text-slate-300">→</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t border-slate-200 pt-6">
        <Link
          href="/api/auth/signout"
          className="flex min-h-[44px] items-center text-sm text-red-600"
        >
          Sair
        </Link>
      </div>

      <p className={`${MUTED} mt-10`}>
        Metas, portfolio, ranking da equipe e controle de jornada estao previstos
        para a proxima fase.
      </p>
    </div>
  );
}
