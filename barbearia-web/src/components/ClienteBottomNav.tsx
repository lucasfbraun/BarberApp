"use client";
import Link from "next/link";

/* Barra de navegação inferior fixa da área do cliente (estilo app). */

type Tab = "inicio" | "buscar" | "agendamentos" | "menu";

function Icon({ name, active }: { name: Tab; active: boolean }) {
  const cls = `h-6 w-6 ${active ? "text-blue-600" : "text-slate-500"}`;
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "inicio") {
    return (
      <svg viewBox="0 0 24 24" className={cls} {...stroke}>
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" />
      </svg>
    );
  }
  if (name === "buscar") {
    return (
      <svg viewBox="0 0 24 24" className={cls} {...stroke}>
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
    );
  }
  if (name === "agendamentos") {
    return (
      <svg viewBox="0 0 24 24" className={cls} {...stroke}>
        <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} {...stroke}>
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

export default function ClienteBottomNav({
  active,
  onMenu,
  onSearch,
}: {
  active: Tab;
  onMenu?: () => void;
  onSearch?: () => void;
}) {
  const itemCls = (tab: Tab) =>
    `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
      active === tab ? "font-semibold text-blue-600" : "text-slate-500"
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch">
        <Link href="/cliente" className={itemCls("inicio")}>
          <Icon name="inicio" active={active === "inicio"} />
          Início
        </Link>
        {onSearch ? (
          <button onClick={onSearch} className={itemCls("buscar")}>
            <Icon name="buscar" active={active === "buscar"} />
            Buscar
          </button>
        ) : (
          <Link href="/cliente?buscar=1" className={itemCls("buscar")}>
            <Icon name="buscar" active={active === "buscar"} />
            Buscar
          </Link>
        )}
        <Link href="/cliente/agendamentos" className={itemCls("agendamentos")}>
          <Icon name="agendamentos" active={active === "agendamentos"} />
          Agendamentos
        </Link>
        <button onClick={onMenu} className={itemCls("menu")}>
          <Icon name="menu" active={active === "menu"} />
          Menu
        </button>
      </div>
    </nav>
  );
}
