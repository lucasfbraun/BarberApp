import Link from "next/link";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/barbearias", label: "Barbearias" },
  { href: "/admin/planos", label: "Planos" },
  { href: "/admin/revendedores", label: "Revendedores" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
      <aside className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5 shadow-2xl lg:w-64">
        <div className="space-y-1 border-b border-white/10 pb-4">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300 hover:text-amber-200 transition">
            lbraunapp
          </Link>
          <h1 className="text-lg font-semibold text-white">Admin Master</h1>
        </div>

        <nav className="mt-4 space-y-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
  );
}
