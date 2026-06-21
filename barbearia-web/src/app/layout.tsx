import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Barbearia SaaS | Projeto em andamento",
  description:
    "Projeto SaaS para barbearias com base PMBOK, cronograma estruturado e desenvolvimento incremental.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navigation = [
    { href: "/", label: "Visão geral" },
    { href: "/agenda", label: "Agenda" },
    { href: "/clientes", label: "Clientes" },
    { href: "/profissionais", label: "Profissionais" },
    { href: "/servicos", label: "Serviços" },
    { href: "/configuracoes", label: "Configurações" },
  ];

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur lg:w-72">
            <div className="space-y-2 border-b border-white/10 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
                Barbearia SaaS
              </p>
              <h1 className="text-2xl font-semibold text-white">Painel do projeto</h1>
              <p className="text-sm leading-6 text-slate-400">
                Base operacional para evoluir sprint por sprint com visibilidade de progresso.
              </p>
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

            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              Sprint atual: Fundação técnica
            </div>
          </aside>

          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
