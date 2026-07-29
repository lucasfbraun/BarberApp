"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Logo } from "@/components/Logo";

/**
 * Barra de navegação do site público.
 *
 * Existe porque o menu ANTERIOR sumia por completo no celular: os links
 * ficavam em um `hidden sm:flex` e não havia botão para abri-los. Quem entrava
 * pelo telefone — a maioria — só via o logo e os dois botões de conta, sem
 * nenhuma forma de chegar em preços ou funcionalidades.
 *
 * `base` permite reaproveitar a mesma barra fora da home: na landing os links
 * são âncoras da própria página (`#precos`), no blog precisam voltar para a
 * home antes (`/#precos`).
 */

type Item = { href: string; label: string; ancora: boolean };

const ITENS: Item[] = [
  { href: "#topo", label: "Início", ancora: true },
  { href: "#sobre", label: "Sobre", ancora: true },
  { href: "#funcionalidades", label: "Funcionalidades", ancora: true },
  { href: "#planos", label: "Preços", ancora: true },
  { href: "#revendedor", label: "Revendedor", ancora: true },
  { href: "/blog", label: "Blog", ancora: false },
];

export function LandingNav({ base = "" }: { base?: string }) {
  const [aberto, setAberto] = useState(false);

  // Sem isto o menu fica preso aberto quando o usuário gira o aparelho ou
  // aumenta a janela: o painel some no `md:hidden`, mas o estado continua
  // `true` e o botão volta invertido.
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };
    const aoRedimensionar = () => {
      if (window.innerWidth >= 768) setAberto(false);
    };

    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("resize", aoRedimensionar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, [aberto]);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <Link href={base || "/"} className="shrink-0 transition hover:opacity-80">
          <Logo size="sm" />
        </Link>

        {/* Links: só a partir de md — em telas pequenas seis itens não cabem
            na mesma linha do logo e dos botões. */}
        <div className="hidden items-center gap-6 text-sm text-slate-400 md:flex lg:gap-8">
          {ITENS.map((item) =>
            item.ancora ? (
              <a key={item.href} href={`${base}${item.href}`} className="transition hover:text-white">
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ),
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-slate-300 transition hover:text-white sm:block"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 sm:px-4"
          >
            Começar grátis
          </Link>

          <button
            type="button"
            onClick={() => setAberto((valor) => !valor)}
            aria-expanded={aberto}
            aria-controls="menu-mobile"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            // 44px de alvo: abaixo disso o toque erra em tela pequena.
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              {aberto ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Painel do celular. Fica no fluxo (não sobreposto) para empurrar o
          conteúdo: sobreposto, um toque fora fecharia sem querer o menu ao
          tentar tocar num link. */}
      {aberto && (
        <div id="menu-mobile" className="border-t border-white/10 bg-slate-950 md:hidden">
          <div className="flex flex-col px-6 py-2 sm:px-10">
            {ITENS.map((item) =>
              item.ancora ? (
                <a
                  key={item.href}
                  href={`${base}${item.href}`}
                  onClick={() => setAberto(false)}
                  className="border-b border-white/5 py-3.5 text-base text-slate-300 transition hover:text-white"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setAberto(false)}
                  className="border-b border-white/5 py-3.5 text-base text-slate-300 transition hover:text-white"
                >
                  {item.label}
                </Link>
              ),
            )}
            {/* "Entrar" fica escondido no header do celular por falta de
                espaço — sem repetir aqui, não haveria como fazer login. */}
            <Link
              href="/login"
              onClick={() => setAberto(false)}
              className="py-3.5 text-base font-semibold text-cyan-400 transition hover:text-cyan-300"
            >
              Entrar
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
