/**
 * Regras compartilhadas do blog.
 *
 * O ponto delicado aqui e a autenticacao do `POST /api/blog`: e uma rota que
 * ESCREVE conteudo publico, chamada por uma automacao. Token dedicado, nunca
 * o `NEXTAUTH_SECRET` — vazou, revoga so este.
 */

import { timingSafeEqual } from "crypto";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/markdown";

/**
 * Confere o token do cabecalho `Authorization: Bearer ...`.
 *
 * Comparacao em tempo constante: com `===`, o tempo de resposta varia
 * conforme quantos caracteres batem, e isso permite descobrir o token
 * caractere a caractere. E barato evitar.
 */
export function blogTokenValido(request: Request): boolean {
  const esperado = process.env.BLOG_API_TOKEN;
  // Sem token configurado a rota fica FECHADA. O contrario — abrir quando
  // nao ha configuracao — seria a falha mais silenciosa possivel.
  if (!esperado) return false;

  const header = request.headers.get("authorization") ?? "";
  const recebido = header.replace(/^Bearer\s+/i, "").trim();
  if (!recebido) return false;

  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Slug unico. Se ja existe, acrescenta sufixo — dois posts com titulo
 * parecido nao podem derrubar a publicacao do segundo.
 */
export async function slugDisponivel(titulo: string, desejado?: string): Promise<string> {
  const base = slugify(desejado || titulo) || "post";
  let slug = base;
  let n = 2;

  while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
    if (n > 50) return `${base}-${Date.now().toString(36)}`;
  }
  return slug;
}

/**
 * Filtro do que o publico pode ver.
 *
 * Post agendado so aparece depois da hora — por isso a comparacao com a data,
 * e nao apenas o status. Sem ela, marcar como SCHEDULED nao adiantaria nada.
 */
export function filtroPublico() {
  return {
    status: "PUBLISHED" as const,
    publishedAt: { lte: new Date() },
  };
}

/** Campos que a listagem devolve. O `content` inteiro nao vai na lista. */
export const CAMPOS_LISTA = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  tags: true,
  publishedAt: true,
  authorName: true,
} as const;

/** Data por extenso, em portugues. */
export function formatarData(data: Date | string | null): string {
  if (!data) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}
