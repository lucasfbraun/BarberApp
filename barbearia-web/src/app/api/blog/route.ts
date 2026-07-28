/**
 * GET  /api/blog?tag=&take=&skip=   — listagem publica dos posts publicados
 * POST /api/blog                    — publicacao pelo n8n, via token
 *
 * O POST e a porta de entrada da automacao. Tres cuidados, nesta ordem de
 * importancia:
 *
 *  1. Token dedicado (`BLOG_API_TOKEN`), comparado em tempo constante.
 *  2. Rate limit por IP — a rota escreve no banco.
 *  3. `DRAFT` como padrao: texto de automacao nao vai ao ar assinado pela
 *     empresa sem alguem ler antes.
 */

import { NextResponse } from "next/server";
import { PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";
import { markdownToPlainText } from "@/lib/markdown";
import { blogTokenValido, slugDisponivel, filtroPublico, CAMPOS_LISTA } from "@/lib/blog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag")?.trim();
  const take = Math.min(Number(searchParams.get("take") ?? 12), 50);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

  try {
    const where = {
      ...filtroPublico(),
      ...(tag ? { tags: { has: tag } } : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: CAMPOS_LISTA,
        orderBy: { publishedAt: "desc" },
        take,
        skip,
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({ posts, total, take, skip });
  } catch (error) {
    console.error("[blog GET]", error);
    return NextResponse.json({ error: "Erro ao listar os posts." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (isRateLimited(`blog-post:${getClientIp(request)}`, { limit: 30, windowMs: 60 * 60_000 })) {
    return rateLimitResponse();
  }

  if (!blogTokenValido(request)) {
    // Mensagem sem detalhe: nao dizemos se o token esta errado ou ausente.
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      content?: string;
      slug?: string;
      excerpt?: string;
      coverUrl?: string;
      tags?: string[];
      status?: string;
      publishAt?: string;
      authorName?: string;
      seoTitle?: string;
      seoDescription?: string;
      source?: string;
    };

    const title = body.title?.trim();
    const content = body.content?.trim();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Informe ao menos `title` e `content`." },
        { status: 400 },
      );
    }
    if (title.length > 200) {
      return NextResponse.json({ error: "Titulo muito longo." }, { status: 400 });
    }
    // Teto de tamanho: a rota e automatizada, e um texto de megabytes seria
    // erro de fluxo, nao um post.
    if (content.length > 100_000) {
      return NextResponse.json({ error: "Conteudo muito longo." }, { status: 400 });
    }

    // Status: aceita apenas o que o enum conhece, e o padrao e rascunho.
    let status: PostStatus = PostStatus.DRAFT;
    if (body.status && body.status.toUpperCase() in PostStatus) {
      status = body.status.toUpperCase() as PostStatus;
    }

    // `publishAt` no futuro implica agendamento, mesmo que o payload diga
    // PUBLISHED — senao o post sairia agora e o campo seria decorativo.
    let publishedAt: Date | null = null;
    if (body.publishAt) {
      const data = new Date(body.publishAt);
      if (isNaN(data.getTime())) {
        return NextResponse.json({ error: "`publishAt` invalido." }, { status: 400 });
      }
      publishedAt = data;
      if (data > new Date() && status === PostStatus.PUBLISHED) {
        status = PostStatus.SCHEDULED;
      }
    } else if (status === PostStatus.PUBLISHED) {
      publishedAt = new Date();
    }

    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t) => typeof t === "string").map((t) => t.trim().toLowerCase()).slice(0, 8)
      : [];

    const slug = await slugDisponivel(title, body.slug);

    const post = await prisma.post.create({
      data: {
        slug,
        title,
        content,
        // Sem resumo informado, deriva do proprio texto: a listagem e o
        // compartilhamento precisam de um, e um post sem resumo fica pobre.
        excerpt: body.excerpt?.trim() || markdownToPlainText(content, 180),
        coverUrl: body.coverUrl?.trim() || null,
        tags,
        status,
        publishedAt,
        authorName: body.authorName?.trim() || "Equipe BarvioApp",
        source: body.source?.trim() || "n8n",
        seoTitle: body.seoTitle?.trim() || null,
        seoDescription: body.seoDescription?.trim() || null,
      },
      select: { id: true, slug: true, title: true, status: true, publishedAt: true },
    });

    return NextResponse.json(
      {
        post,
        url: `/blog/${post.slug}`,
        aviso:
          status === PostStatus.DRAFT
            ? "Criado como rascunho. Revise e publique em /admin/blog."
            : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[blog POST]", error);
    return NextResponse.json({ error: "Nao foi possivel criar o post." }, { status: 503 });
  }
}
