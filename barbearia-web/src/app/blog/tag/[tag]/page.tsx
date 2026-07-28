import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { filtroPublico, CAMPOS_LISTA, formatarData } from "@/lib/blog";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const nome = decodeURIComponent(tag);
  return {
    title: `Posts sobre ${nome}`,
    description: `Conteúdo sobre ${nome} para donos de barbearia.`,
    alternates: { canonical: `/blog/tag/${tag}` },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const nome = decodeURIComponent(tag).toLowerCase();

  const posts = await prisma.post
    .findMany({
      where: { ...filtroPublico(), tags: { has: nome } },
      select: CAMPOS_LISTA,
      orderBy: { publishedAt: "desc" },
      take: 30,
    })
    .catch(() => []);

  return (
    <main className="min-h-screen bg-slate-950">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:px-10">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link href="/blog" className="text-sm text-slate-400 transition hover:text-white">
            ← Todos os posts
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Tag</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">{nome}</h1>
        <p className="mt-3 text-slate-400">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 border-l-2 border-cyan-400/40 py-2 pl-5 text-slate-400">
            Nenhum post com esta tag ainda.
          </p>
        ) : (
          <ul className="mt-12 space-y-px">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block border-t border-white/10 py-8 transition hover:border-cyan-400/30"
                >
                  <time
                    dateTime={post.publishedAt?.toISOString()}
                    className="text-xs text-slate-500"
                  >
                    {formatarData(post.publishedAt)}
                  </time>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white group-hover:text-cyan-300">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-3 max-w-2xl leading-7 text-slate-400">{post.excerpt}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
