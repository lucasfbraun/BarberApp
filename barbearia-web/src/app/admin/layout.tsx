import Link from "next/link";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { LogoLink } from "@/components/Logo";
import { AdminPathProvider } from "@/components/AdminPath";
import { adminBasePath } from "@/lib/admin-path";

/** Itens do menu, relativos ao caminho do painel. */
const nav = [
  { to: "", label: "Dashboard" },
  { to: "/barbearias", label: "Barbearias" },
  { to: "/planos", label: "Planos" },
  { to: "/revendedores", label: "Revendedores" },
  { to: "/blog", label: "Blog" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const base = adminBasePath();
  const session = await getServerSession(authOptions);
  const ehAdmin = session?.user?.role === UserRole.SUPERADMIN;

  /* Sem sessão de admin, renderiza o conteúdo sem moldura.
     Na prática isso só acontece na tela de login — o middleware já redireciona
     todo o resto. Sem esta condição, a página de login apareceria dentro da
     barra lateral do painel, com menu de um sistema onde ninguém entrou. */
  if (!ehAdmin) {
    return <AdminPathProvider value={base}>{children}</AdminPathProvider>;
  }

  return (
    <AdminPathProvider value={base}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
        <aside className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5 shadow-2xl lg:w-64">
          <div className="space-y-3 border-b border-white/10 pb-4">
            <LogoLink size="sm" />
            <h1 className="text-lg font-semibold text-white">Admin Master</h1>
          </div>

          <nav className="mt-4 space-y-2">
            {nav.map((item) => (
              <Link
                key={item.to}
                href={`${base}${item.to}`}
                className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6">
            <Link
              href="/api/auth/signout"
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400 transition hover:border-red-400/30 hover:text-red-300"
            >
              Sair
            </Link>
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </AdminPathProvider>
  );
}
