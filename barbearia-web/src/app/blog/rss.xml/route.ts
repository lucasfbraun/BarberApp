/**
 * Feed RSS em /blog/rss.xml.
 *
 * Vale o esforco por dois motivos: agregadores ainda trazem leitor fiel, e o
 * feed e a forma mais simples de outra ferramenta (inclusive o proprio n8n)
 * acompanhar o que foi publicado.
 */

import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/mailer";
import { filtroPublico } from "@/lib/blog";

export const revalidate = 3600;

/** Escapa o que quebraria o XML. Sem isto, um `&` no titulo invalida o feed. */
function xml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await prisma.post
    .findMany({
      where: filtroPublico(),
      select: { slug: true, title: true, excerpt: true, publishedAt: true, tags: true },
      orderBy: { publishedAt: "desc" },
      take: 30,
    })
    .catch(() => []);

  const itens = posts
    .map((p) => {
      const url = appUrl(`/blog/${p.slug}`);
      return `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${p.publishedAt?.toUTCString() ?? ""}</pubDate>
      ${p.excerpt ? `<description>${xml(p.excerpt)}</description>` : ""}
      ${p.tags.map((t) => `<category>${xml(t)}</category>`).join("\n      ")}
    </item>`;
    })
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog BarvioApp</title>
    <link>${xml(appUrl("/blog"))}</link>
    <description>Gestão, agenda e mercado de barbearias.</description>
    <language>pt-BR</language>
    <atom:link href="${xml(appUrl("/blog/rss.xml"))}" rel="self" type="application/rss+xml"/>
${itens}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
