const completedItems = [
  "Escopo do produto lido e consolidado",
  "Cronograma em Excel criado com status",
  "Artefatos PMBOK iniciais estruturados",
  "Projeto Next.js inicializado com TypeScript e Tailwind",
];

const inProgressItems = [
  "Montagem da base visual do painel",
  "Definição do backlog técnico do MVP",
  "Estrutura da navegação principal do app",
];

const nextItems = [
  "Modelagem do tenant, usuários e permissões",
  "Tela de cadastro da barbearia e tema visual",
  "CRUD de profissionais e serviços",
  "Agenda e disponibilidade",
];

const milestones = [
  {
    phase: "Sprint 0",
    title: "Baseline do projeto",
    detail: "Charter, WBS, cronograma e riscos estruturados.",
  },
  {
    phase: "Sprint 1",
    title: "Fundação técnica",
    detail: "Projeto Next.js, banco, auth e tenant base.",
  },
  {
    phase: "Sprint 2",
    title: "Identidade da barbearia",
    detail: "Cadastro da unidade, logo e cores customizadas.",
  },
  {
    phase: "Sprint 3",
    title: "Operação principal",
    detail: "Profissionais, serviços, agenda e bloqueios.",
  },
];

function StatusPanel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur ${tone}`}>
      <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
        {title}
      </h2>
      <ul className="mt-6 space-y-4 text-sm text-slate-200">
        {items.map((item) => (
          <li key={item} className="flex gap-3 leading-6">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Projeto em andamento
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Barbearia SaaS está saindo do papel com base PMBOK e entrega incremental.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              A primeira versão está sendo organizada para provar valor rápido: estrutura de projeto,
              cronograma visível e um produto web que depois evolui para agenda, comanda e gestão.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px] lg:grid-cols-1">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              Base PMBOK criada
            </div>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
              Next.js inicializado
            </div>
            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm text-fuchsia-100">
              Cronograma em Excel pronto
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Próximo foco: tenant e identidade visual
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Artefatos concluídos", "6 documentos de gestão e rastreio"],
            ["Base técnica", "App Router, TypeScript, Tailwind"],
            ["Fases definidas", "MVP, expansão e produto avançado"],
            ["Risco principal", "Escopo crescer antes da validação"],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
              <p className="mt-3 text-lg font-semibold text-white">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <StatusPanel title="Concluído" items={completedItems} tone="ring-1 ring-emerald-400/10" />
          <StatusPanel title="Em andamento" items={inProgressItems} tone="ring-1 ring-sky-400/10" />
          <StatusPanel title="Próximos passos" items={nextItems} tone="ring-1 ring-amber-400/10" />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Linha de entrega</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Cada sprint precisa terminar com algo navegavel e demonstravel.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                Sprint de 2 semanas
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {milestones.map((milestone, index) => (
                <article
                  key={milestone.phase}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-sm font-semibold text-cyan-200">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">{milestone.phase}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{milestone.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{milestone.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-2xl font-semibold text-white">Próxima decisão</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              O próximo passo técnico é consolidar o domínio multi-tenant e desenhar a primeira
              camada de dados para barbearias, profissionais, serviços e agenda.
            </p>

            <div className="mt-6 space-y-4">
              {[
                ["Tenant", "barbershop_id em toda operação"],
                ["Agenda", "motor de disponibilidade e conflito"],
                ["Identidade", "cores, logo e tema por barbearia"],
                ["Entrega", "incrementos demonstráveis por sprint"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-100">
              Objetivo imediato: manter o escopo pequeno, entregar valor visível e evitar que o MVP vire um
              produto grande demais antes da validação com uma barbearia real.
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
