import Link from "next/link";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { LogoLink } from "@/components/Logo";

/**
 * Navegação do painel, filtrada por papel.
 *
 * Antes o menu era igual para todo mundo: um RECEPTION via "Relatório" e
 * "Configurações" e só descobria que não podia ao tomar 403 da API. Menu que
 * mostra o que a API vai negar é menu que mente.
 *
 * `roles: undefined` significa "todos os papéis do painel".
 */
const navigation: { href: string; label: string; roles?: UserRole[] }[] = [
  { href: "/agenda", label: "Agenda" },
  // Recebe as comandas que os barbeiros enviam do portal.
  { href: "/caixa", label: "Caixa" },
  { href: "/clientes", label: "Clientes" },
  {
    href: "/profissionais",
    label: "Profissionais",
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    href: "/servicos",
    label: "Serviços",
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  { href: "/estoque", label: "Estoque" },
  {
    href: "/relatorio",
    label: "Relatório",
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    href: "/permissoes",
    label: "Permissões",
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    roles: [UserRole.OWNER, UserRole.MANAGER],
  },
];

function getDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const trialEndsAt = session?.user?.trialEndsAt ?? null;
  const daysRemaining = getDaysRemaining(trialEndsAt);
  const showBanner = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

  const role = session?.user?.role ?? null;
  const visibleNavigation = navigation.filter(
    (item) => !item.roles || (role !== null && item.roles.includes(role)),
  );

  // O dono/gerente que também atende usa os dois lados; o atalho evita que ele
  // procure a URL do portal na mão.
  const showPortalLink = role === UserRole.OWNER || role === UserRole.MANAGER;

  return (
    <div className="flex min-h-screen flex-col">
      {showBanner && (
        <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-300">
          {daysRemaining === 0
            ? "Seu período de teste expira hoje! "
            : `Seu período de teste expira em ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"}. `}
          <Link href="/#planos" className="font-semibold underline hover:text-amber-200">
            Ver planos
          </Link>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur lg:w-72">
          <div className="space-y-3 border-b border-white/10 pb-4">
            <LogoLink size="sm" />
            <h1 className="text-2xl font-semibold text-white">Painel</h1>
            {trialEndsAt && daysRemaining !== null && daysRemaining > 7 && (
              <p className="text-xs text-slate-500">
                Trial: {daysRemaining} dias restantes
              </p>
            )}
          </div>

          <nav className="mt-4 space-y-2">
            {visibleNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {showPortalLink && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <Link
                href="/profissional"
                className="flex items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-200 transition hover:bg-cyan-400/10"
              >
                Portal do profissional
              </Link>
              <p className="mt-2 px-1 text-xs text-slate-500">
                Se você também atende, use o portal no celular.
              </p>
            </div>
          )}

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
    </div>
  );
}
