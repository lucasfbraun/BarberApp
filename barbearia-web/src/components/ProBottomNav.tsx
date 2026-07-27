"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra inferior do Portal do Profissional — o menu da secao 22:
 * Inicio | Agenda | Clientes | Comissao | Mais
 *
 * Fixa e sempre visivel: a secao 27 pede "poucos cliques para iniciar um
 * atendimento", e navegacao escondida em menu hamburguer custa um toque a
 * mais em toda troca de tela.
 *
 * `pb-[env(safe-area-inset-bottom)]` mantem os alvos acima do indicador de
 * home do iPhone — sem isso o ultimo item fica intocavel no aparelho
 * instalado como PWA.
 */

const ITEMS = [
  { href: "/profissional", label: "Inicio", exact: true, icon: HomeIcon },
  { href: "/profissional/agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/profissional/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/profissional/comissoes", label: "Comissao", icon: MoneyIcon },
  { href: "/profissional/mais", label: "Mais", icon: MoreIcon },
];

export default function ProBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] transition ${
                  active ? "text-blue-600" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon />
                <span className="tracking-wide">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* Icones inline: cinco tracos simples nao justificam uma dependencia. */

function base(children: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HomeIcon() {
  return base(
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>,
  );
}

function CalendarIcon() {
  return base(
    <>
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>,
  );
}

function UsersIcon() {
  return base(
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.9M18 14.8c2 .7 3.5 2.5 3.5 5.2" />
    </>,
  );
}

function MoneyIcon() {
  return base(
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
      <circle cx="12" cy="12" r="2.6" />
    </>,
  );
}

function MoreIcon() {
  return base(
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>,
  );
}
