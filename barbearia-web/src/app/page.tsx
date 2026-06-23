import Link from "next/link";

const features = [
  {
    icon: "📅",
    title: "Agenda inteligente",
    description: "Visualize todos os agendamentos do dia por profissional. Crie, edite e gerencie horários com controle total.",
  },
  {
    icon: "🌐",
    title: "Agendamento online",
    description: "Seus clientes agendam pelo celular, 24h por dia, sem precisar ligar. Cada barbearia tem sua própria página pública.",
  },
  {
    icon: "✂️",
    title: "Gestão de profissionais",
    description: "Cadastre barbeiros, defina jornada de trabalho, serviços por profissional e bloqueios de agenda.",
  },
  {
    icon: "💈",
    title: "Serviços e preços",
    description: "Catálogo completo de serviços com duração, preço e categoria. Exibido automaticamente na página pública.",
  },
  {
    icon: "👥",
    title: "Cadastro de clientes",
    description: "Histórico automático de clientes. O sistema reconhece quem já agendou antes pelo número de telefone.",
  },
  {
    icon: "📊",
    title: "Relatórios e comissões",
    description: "Acompanhe faturamento do dia, comissão por barbeiro e desempenho geral da barbearia.",
  },
];

const plans = [
  {
    name: "Básico",
    price: "R$ 49",
    period: "/mês",
    description: "Ideal para barbearias que estão começando.",
    highlight: false,
    features: [
      "Até 2 profissionais",
      "Agendamento online",
      "Página pública da barbearia",
      "Agenda interna",
      "Suporte por e-mail",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Profissional",
    price: "R$ 99",
    period: "/mês",
    description: "Para barbearias em crescimento com equipe ativa.",
    highlight: true,
    features: [
      "Até 8 profissionais",
      "Tudo do Básico",
      "Relatórios de faturamento",
      "Controle de comissões",
      "Suporte prioritário via WhatsApp",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Premium",
    price: "R$ 199",
    period: "/mês",
    description: "Para redes de barbearias com múltiplas unidades.",
    highlight: false,
    features: [
      "Profissionais ilimitados",
      "Tudo do Profissional",
      "Múltiplas unidades",
      "API de integração",
      "Gerente de conta dedicado",
    ],
    cta: "Falar com consultor",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          <span className="text-xl font-bold tracking-tight text-white">
            lbraun<span className="text-cyan-400">app</span>
          </span>
          <div className="hidden items-center gap-8 text-sm text-slate-400 sm:flex">
            <a href="#funcionalidades" className="transition hover:text-white">Funcionalidades</a>
            <a href="#planos" className="transition hover:text-white">Planos</a>
            <a href="#revendedor" className="transition hover:text-white">Revendedor</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-300 transition hover:text-white">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 sm:px-10 sm:py-36">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-400/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Sistema de gestão para barbearias
          </div>
          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Sua barbearia no<br />
            <span className="text-cyan-400">próximo nível</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Agenda online, gestão de profissionais, controle de serviços e relatórios —
            tudo em um sistema feito especialmente para barbearias.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/cadastro"
              className="rounded-2xl bg-cyan-400 px-8 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Começar grátis — 30 dias de teste
            </Link>
            <a
              href="#funcionalidades"
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Ver funcionalidades
            </a>
          </div>
          <p className="mt-5 text-sm text-slate-500">Sem cartão de crédito. Cancele quando quiser.</p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-white/5 px-6 py-12 sm:px-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {[
            ["30 dias", "de teste grátis"],
            ["100%", "online, sem instalação"],
            ["Multi-tenant", "cada barbearia isolada"],
            ["24/7", "agendamento pelo cliente"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-3xl font-bold text-cyan-400">{value}</p>
              <p className="mt-1 text-sm text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Funcionalidades</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
              Tudo que sua barbearia precisa
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Do agendamento online ao controle financeiro, o lbraunapp centraliza a gestão do seu negócio.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/20"
              >
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-slate-900/50 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Planos e preços</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
              Simples e transparente
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Comece grátis por 30 dias. Sem cobranças surpresa.
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={[
                  "relative rounded-3xl border p-8",
                  plan.highlight
                    ? "border-cyan-400/40 bg-gradient-to-b from-cyan-400/10 to-slate-950"
                    : "border-white/10 bg-white/5",
                ].join(" ")}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-cyan-400 px-4 py-1 text-xs font-bold text-slate-950">
                      Mais popular
                    </span>
                  </div>
                )}
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{plan.name}</p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="mb-1 text-slate-400">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="mt-0.5 text-cyan-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/cadastro"
                  className={[
                    "mt-8 block rounded-2xl py-3 text-center text-sm font-semibold transition",
                    plan.highlight
                      ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10",
                  ].join(" ")}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Revendedor */}
      <section id="revendedor" className="px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
            <div className="grid lg:grid-cols-2">
              <div className="p-10 lg:p-14">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Programa de revendas</p>
                <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white">
                  Ganhe comissão indicando o lbraunapp
                </h2>
                <p className="mt-4 leading-7 text-slate-400">
                  Cadastre-se como revendedor, receba um cupom exclusivo e ganhe comissão recorrente
                  toda vez que uma barbearia assinar usando o seu código.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    ["🎫", "Cupom único", "Cada revendedor recebe um código exclusivo para compartilhar."],
                    ["💰", "Comissão recorrente", "Ganhe uma porcentagem mensalmente enquanto a barbearia continuar ativa."],
                    ["📈", "Dashboard completo", "Acompanhe em tempo real quem usou seu cupom e quanto você acumulou."],
                  ].map(([icon, title, desc]) => (
                    <div key={String(title)} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg">
                        {icon}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{title}</p>
                        <p className="text-sm text-slate-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/cadastro"
                  className="mt-10 inline-block rounded-2xl bg-cyan-400 px-8 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Quero ser revendedor
                </Link>
              </div>
              <div className="flex items-center justify-center bg-slate-950/40 p-10 lg:p-14">
                <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-6">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Seu cupom</p>
                  <div className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3 text-center font-mono text-xl font-bold tracking-widest text-cyan-400">
                    SEU-CODIGO
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ["Barbearias ativas", "—"],
                      ["Receita gerada", "R$ —"],
                      ["Comissão acumulada", "R$ —"],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                        <span className="text-slate-400">{label}</span>
                        <span className="font-semibold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-600">Disponível após o cadastro</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white">
            Pronto para modernizar sua barbearia?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Cadastre-se agora e comece a usar por 30 dias grátis. Sem cartão de crédito.
          </p>
          <Link
            href="/cadastro"
            className="mt-8 inline-block rounded-2xl bg-cyan-400 px-10 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Criar minha conta grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm font-semibold text-white">
            lbraun<span className="text-cyan-400">app</span>
          </span>
          <p className="text-xs text-slate-600">
            © 2026 lbraunapp. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs text-slate-500">
            <Link href="/login" className="transition hover:text-white">Entrar</Link>
            <Link href="/cadastro" className="transition hover:text-white">Cadastrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
