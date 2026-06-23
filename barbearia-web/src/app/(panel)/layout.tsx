import Link from "next/link";

const navigation = [
  { href: "/agenda", label: "Agenda" },
  { href: "/clientes", label: "Clientes" },
  { href: "/profissionais", label: "Profissionais" },
  { href: "/servicos", label: "Serviços" },
  { href: "/relatorio", label: "Relatório" },
  { href: "/configuracoes", label: "Configurações" },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
      <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur lg:w-72">
        <div className="space-y-2 border-b border-white/10 pb-4">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200 hover:text-cyan-300 transition">
            lbraunapp
          </Link>
          <h1 className="text-2xl font-semibold text-white">Painel</h1>
        </div>

        <nav className="mt-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
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
  );
}
