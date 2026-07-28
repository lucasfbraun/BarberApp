/**
 * PATCH  /api/blog/[id] — edita, publica ou despublica
 * DELETE /api/blog/[id] — remove
 *
 * Aceita duas identidades: o SUPERADMIN logado (tela /admin/blog) ou o token
 * do n8n. As duas com o mesmo poder — quem tem o token ja publica pelo POST.
 */

import { NextResponse } from "next/server";
import { PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";
import { blogTokenValido } from "@/lib/blog";
import { markdownToPlainText } from "@/lib/markdown";

/** Admin logado OU token valido. */
async function autorizado(request: Request): Promise<boolean> {
  if (blogTokenValido(request)) return true;
  const admin = await resolveAdmin(request);
  return !(admin instanceof NextResponse);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existente = await prisma.post.findUnique({
      where: { id },
      select: { id: true, status: true, publishedAt: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Post nao encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      title?: string;
      content?: string;
      excerpt?: string;
      coverUrl?: string | null;
      tags?: string[];
      status?: string;
      publishAt?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
    };

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "O titulo nao pode ficar vazio." }, { status: 400 });
      }
      data.title = title.slice(0, 200);
    }
    if (body.content !== undefined) {
      const content = body.content.trim();
      if (!content) {
        return NextResponse.json({ error: "O conteudo nao pode ficar vazio." }, { status: 400 });
      }
      if (content.length > 100_000) {
        return NextResponse.json({ error: "Conteudo muito longo." }, { status: 400 });
      }
      data.content = content;
      // Resumo derivado acompanha o texto, a menos que haja um proprio.
      if (body.excerpt === undefined) data.excerpt = markdownToPlainText(content, 180);
    }
    if (body.excerpt !== undefined) data.excerpt = body.excerpt.trim() || null;
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl?.trim() || null;
    if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle?.trim() || null;
    if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription?.trim() || null;

    if (body.tags !== undefined) {
      data.tags = Array.isArray(body.tags)
        ? body.tags.filter((t) => typeof t === "string").map((t) => t.trim().toLowerCase()).slice(0, 8)
        : [];
    }

    if (body.status !== undefined) {
      const novo = body.status.toUpperCase();
      if (!(novo in PostStatus)) {
        return NextResponse.json({ error: "Status invalido." }, { status: 400 });
      }
      data.status = novo as PostStatus;

      // Publicar sem data definida usa agora. Sem isto, o post entraria no
      // ar com `publishedAt` nulo e sumiria do filtro publico.
      if (novo === PostStatus.PUBLISHED && !existente.publishedAt && body.publishAt === undefined) {
        data.publishedAt = new Date();
      }
    }

    if (body.publishAt !== undefined) {
      if (body.publishAt === null) {
        data.publishedAt = null;
      } else {
        const quando = new Date(body.publishAt);
        if (isNaN(quando.getTime())) {
          return NextResponse.json({ error: "`publishAt` invalido." }, { status: 400 });
        }
        data.publishedAt = quando;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const post = await prisma.post.update({
      where: { id },
      data,
      select: { id: true, slug: true, title: true, status: true, publishedAt: true },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[blog PATCH]", error);
    return NextResponse.json({ error: "Nao foi possivel atualizar." }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const removidos = await prisma.post.deleteMany({ where: { id } });
    if (removidos.count === 0) {
      return NextResponse.json({ error: "Post nao encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[blog DELETE]", error);
    return NextResponse.json({ error: "Nao foi possivel excluir." }, { status: 503 });
  }
}
