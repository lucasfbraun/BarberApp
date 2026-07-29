"use client";

import { createContext, useContext } from "react";
import Link from "next/link";

/**
 * Leva o caminho publico do painel ate os componentes de cliente.
 *
 * Os arquivos vivem em `app/admin/*`, mas a URL pode ser outra (`ADMIN_PATH`).
 * Um `<Link href="/admin/barbearias">` fixo quebraria: o usuario esta
 * navegando em `/<segredo>/...` e cairia num 404.
 *
 * O valor vem do layout, que e server component e le a variavel de ambiente.
 * Nao usamos `NEXT_PUBLIC_ADMIN_PATH` justamente para o caminho nao acabar no
 * pacote JavaScript da landing, onde qualquer visitante leria.
 */

const AdminPathContext = createContext<string>("/admin");

export function AdminPathProvider({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <AdminPathContext.Provider value={value}>{children}</AdminPathContext.Provider>;
}

/** Caminho base do painel, para montar links dentro dele. */
export function useAdminPath(): string {
  return useContext(AdminPathContext);
}

/**
 * `<Link>` relativo ao painel.
 *
 *   <AdminLink to="/barbearias">  →  /<caminho-do-painel>/barbearias
 */
export function AdminLink({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  const base = useAdminPath();
  return (
    <Link href={`${base}${to}`} className={className}>
      {children}
    </Link>
  );
}
