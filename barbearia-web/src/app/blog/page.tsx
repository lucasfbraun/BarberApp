import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { LandingNav } from "@/components/LandingNav";
import { filtroPublico, CAMPOS_LISTA, formatarData } from "@/lib/blog";

/* Listagem do blog.

   Server component consultando o banco direto, como a landing já faz com os
   planos. Sem `fetch` para a própria API: seria uma volta desnecessária pela
   rede no mesmo servidor. */

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Gestão, agenda, atendimento e mercado de barbearias. Conteúdo prático para quem toca o negócio.",
  openGraph: {
    title: "Blog · BarvioApp",
    description: "Conteúdo prático sobre gestão e mercado de barbearias.",
  },
};

// Revalida a cada 5 minutos: post publicado pelo n8n aparece sozinho, sem
// deploy, e a página continua estática para quem chega.
export const revalidate = 300;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;

  const posts = await prisma.post
    .findMany({
      where: { ...filtroPublico(), ...(tag ? { tags: { has: tag } } : {}) },
      select: CAMPOS_LISTA,
      orderBy: { publishedAt: "desc" },
      take: 30,
    })
    .catch(() => []);

  // Nuvem de tags a partir do que existe publicado — nada de lista fixa que
  // envelhece.
  const todas = await prisma.post
    .findMany({ where: filtroPublico(), select: { tags: true } })
    .catch(() => []);
  const tags = [...new Set(todas.flatMap((p) => p.tags))].sort();

  return (
    <main className="min-h-screen bg-slate-950">
      {/* `base="/"` porque aqui as âncoras precisam voltar para a home antes
          de rolar — `#planos` sozinho não acharia nada nesta página. */}
      <LandingNav base="/" />

      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Blog</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Gestão de barbearia na prática
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-400">
          Agenda, atendimento, equipe e mercado. Conteúdo direto para quem toca
          o dia a dia do negócio.
        </p>

        {tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                !tag
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                  : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              Todos
            </Link>
            {tags.map((t) => (
              <Link
                key={t}
                href={`/blog/tag/${encodeURIComponent(t)}`}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  tag === t
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <p className="mt-16 border-l-2 border-cyan-400/40 py-2 pl-5 text-slate-400">
            Nenhum post publicado ainda.
          </p>
        ) : (
          <ul className="mt-12 space-y-px">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block border-t border-white/10 py-8 transition hover:border-cyan-400/30"
                >
                  <div className="flex items-baseline gap-4 text-xs text-slate-500">
                    <time dateTime={post.publishedAt?.toISOString()}>
                      {formatarData(post.publishedAt)}
                    </time>
                    {post.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-cyan-400/70">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white group-hover:text-cyan-300">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-3 max-w-2xl leading-7 text-slate-400">{post.excerpt}</p>
                  )}
                  <span className="mt-4 inline-block text-sm text-cyan-400">Ler →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-white/10 px-6 py-10 sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm font-semibold text-white">
            Barvio<span className="text-cyan-400">App</span>
          </span>
          <p className="text-xs text-slate-600">
            © 2026 BarvioApp. Todos os direitos reservados.
          </p>
          <Link href="/blog/rss.xml" className="text-xs text-slate-500 hover:text-white">
            RSS
          </Link>
        </div>
      </footer>
    </main>
  );
}
