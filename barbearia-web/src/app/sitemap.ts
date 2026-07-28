import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/mailer";
import { filtroPublico } from "@/lib/blog";

/**
 * Mapa do site, servido em /sitemap.xml.
 *
 * Inclui os posts do blog: sem isso, um texto publicado pela automacao levaria
 * semanas para ser descoberto — e o blog existe justamente para trazer busca
 * organica.
 *
 * A pagina publica de cada barbearia (`/s/[slug]`) NAO entra. Sao paginas de
 * clientes nossos, e listá-las num sitemap central mistura o nosso conteudo
 * com o deles. Cada barbearia se divulga pelo proprio link.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixas: MetadataRoute.Sitemap = [
    { url: appUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: appUrl("/blog"), changeFrequency: "daily", priority: 0.8 },
    { url: appUrl("/cadastro"), changeFrequency: "monthly", priority: 0.7 },
    { url: appUrl("/login"), changeFrequency: "yearly", priority: 0.3 },
    { url: appUrl("/revendedor/cadastro"), changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const posts = await prisma.post.findMany({
      where: filtroPublico(),
      select: { slug: true, updatedAt: true, tags: true },
      orderBy: { publishedAt: "desc" },
      take: 500,
    });

    const doBlog: MetadataRoute.Sitemap = posts.map((p) => ({
      url: appUrl(`/blog/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    const tags = [...new Set(posts.flatMap((p) => p.tags))];
    const deTags: MetadataRoute.Sitemap = tags.map((t) => ({
      url: appUrl(`/blog/tag/${encodeURIComponent(t)}`),
      changeFrequency: "weekly",
      priority: 0.4,
    }));

    return [...fixas, ...doBlog, ...deTags];
  } catch {
    // Banco indisponivel nao pode derrubar o sitemap: melhor devolver as
    // rotas fixas do que um 500 que o buscador interpreta como site quebrado.
    return fixas;
  }
}
