/**
 * GET /api/admin/blog — todos os posts, inclusive rascunho e agendado.
 *
 * Separada da rota publica de proposito: `/api/blog` filtra por publicado, e
 * a tela de revisao precisa justamente do que AINDA nao esta publicado.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const admin = await resolveAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const posts = await prisma.post.findMany({
      orderBy: [
        // Rascunho primeiro: e o que exige acao de quem abre a tela.
        { status: "asc" },
        { updatedAt: "desc" },
      ],
      take: 200,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[admin/blog]", error);
    return NextResponse.json({ error: "Erro ao carregar os posts." }, { status: 503 });
  }
}
