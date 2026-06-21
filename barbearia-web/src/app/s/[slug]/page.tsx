import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Barbershop = Awaited<ReturnType<typeof getBarbershop>>;

async function getBarbershop(slug: string) {
  return prisma.barbershop.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      accentColor: true,
      logoUrl: true,
      services: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          price: true,
          category: { select: { name: true } },
        },
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      },
      professionals: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          bio: true,
          photoUrl: true,
          displayOrder: true,
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
    },
  });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatPrice(price: number) {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PublicBarbershopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const barbershop = await getBarbershop(slug);
  if (!barbershop) return notFound();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Hero */}
          <div className="space-y-6 p-6 sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Agendamento online
            </div>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">/{slug}</p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {barbershop.name}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Escolha o serviço, o profissional e o horário — sem precisar baixar aplicativo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Rápido", "Agendamento em poucos passos"],
                ["Simples", "Interface limpa no celular"],
                ["Instantâneo", "Confirmação na hora"],
              ].map(([title, description]) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/s/${slug}/agendar`}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Agendar agora
              </Link>
              <a
                href="#servicos"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                Ver serviços
              </a>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 bg-slate-950/70 p-6 sm:p-8 lg:p-10">
            {barbershop.professionals.length > 0 && (
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
                  Profissionais
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {barbershop.professionals.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-slate-950 to-amber-400/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                {barbershop.services.length} serviço{barbershop.services.length !== 1 ? "s" : ""}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Pronto para te atender</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Escolha o que você quer e encontre o horário ideal.
              </p>
              <Link
                href={`/s/${slug}/agendar`}
                className="mt-5 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Agendar agora
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Serviços</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">O que você quer fazer hoje?</h2>
          </div>
          <Link
            href={`/s/${slug}/agendar`}
            className="text-sm font-semibold text-cyan-200 underline-offset-4 hover:underline"
          >
            Agendar
          </Link>
        </div>

        {barbershop.services.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">Nenhum serviço disponível no momento.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbershop.services.map((service) => (
              <article
                key={service.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/40 p-5"
              >
                {service.category && (
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {service.category.name}
                  </p>
                )}
                <p className="mt-2 text-lg font-semibold text-white">{service.name}</p>
                {service.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{service.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-sm text-slate-400">{formatDuration(service.durationMinutes)}</span>
                  <span className="text-sm font-semibold text-cyan-200">{formatPrice(Number(service.price))}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
