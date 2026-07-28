import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { markdownToHtml, markdownToPlainText, tempoDeLeitura } from "@/lib/markdown";
import { filtroPublico, formatarData } from "@/lib/blog";
import { appUrl } from "@/lib/mailer";

export const revalidate = 300;

async function buscarPost(slug: string) {
  return prisma.post
    .findFirst({ where: { slug, ...filtroPublico() } })
    .catch(() => null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await buscarPost(slug);
  if (!post) return { title: "Post não encontrado" };

  const descricao =
    post.seoDescription || post.excerpt || markdownToPlainText(post.content, 160);

  return {
    title: post.seoTitle || post.title,
    description: descricao,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description: descricao,
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.authorName],
      tags: post.tags,
      // Sem capa própria, cai no cartão da marca — melhor que preview vazio.
      images: [{ url: post.coverUrl || "/brand/barvioapp-og.png" }],
    },
  };
}

/** Gera as páginas dos posts existentes no build; o resto vem sob demanda. */
export async function generateStaticParams() {
  const posts = await prisma.post
    .findMany({ where: filtroPublico(), select: { slug: true }, take: 100 })
    .catch(() => []);
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await buscarPost(slug);
  if (!post) notFound();

  const html = markdownToHtml(post.content);
  const minutos = tempoDeLeitura(post.content);

  const relacionados = await prisma.post
    .findMany({
      where: {
        ...filtroPublico(),
        id: { not: post.id },
        ...(post.tags.length > 0 ? { tags: { hasSome: post.tags } } : {}),
      },
      select: { id: true, slug: true, title: true, excerpt: true },
      orderBy: { publishedAt: "desc" },
      take: 2,
    })
    .catch(() => []);

  /* JSON-LD: é o que faz o post aparecer como artigo na busca, com data e
     autor, em vez de um resultado genérico. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Organization", name: post.authorName },
    publisher: {
      "@type": "Organization",
      name: "BarvioApp",
      logo: { "@type": "ImageObject", url: appUrl("/brand/barvioapp-lockup.png") },
    },
    mainEntityOfPage: appUrl(`/blog/${post.slug}`),
  };

  return (
    <main className="min-h-screen bg-slate-950">
      <script
        type="application/ld+json"
        // Conteúdo gerado por nós a partir de JSON.stringify — não é entrada
        // do usuário sendo interpretada como HTML.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link href="/blog" className="text-sm text-slate-400 transition hover:text-white">
            ← Blog
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <time dateTime={post.publishedAt?.toISOString()}>
            {formatarData(post.publishedAt)}
          </time>
          <span>·</span>
          <span>{minutos} min de leitura</span>
          {post.tags.map((t) => (
            <Link
              key={t}
              href={`/blog/tag/${encodeURIComponent(t)}`}
              className="text-cyan-400/70 transition hover:text-cyan-300"
            >
              {t}
            </Link>
          ))}
        </div>

        <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-6 border-l-2 border-cyan-400/40 pl-5 text-lg leading-8 text-slate-300">
            {post.excerpt}
          </p>
        )}

        {/* O HTML vem de `markdownToHtml`, que escapa TODO o conteúdo antes de
            converter. Nenhuma tag da saída vem do texto original — só as que o
            renderizador emite. Ver o comentário no topo de lib/markdown.ts. */}
        <div
          className="mt-10"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-16 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-8">
          <h2 className="text-xl font-semibold text-white">
            Organize sua barbearia sem planilha
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Agenda online, comanda, comissão e app para o cliente. 30 dias grátis,
            sem cartão.
          </p>
          <Link
            href="/cadastro"
            className="mt-6 inline-block rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Começar agora
          </Link>
        </div>

        {relacionados.length > 0 && (
          <section className="mt-16 border-t border-white/10 pt-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Continue lendo
            </h2>
            <ul className="mt-6 space-y-6">
              {relacionados.map((r) => (
                <li key={r.id}>
                  <Link href={`/blog/${r.slug}`} className="group block">
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300">
                      {r.title}
                    </h3>
                    {r.excerpt && (
                      <p className="mt-1 text-sm leading-6 text-slate-400">{r.excerpt}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
