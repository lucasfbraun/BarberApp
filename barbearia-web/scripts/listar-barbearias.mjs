/**
 * Lista as barbearias cadastradas.
 *
 * Existe porque os outros scripts pedem o SLUG, e o slug não é o que aparece
 * nas telas nem nas mensagens — é fácil confundir com o nome. Este é o script
 * para rodar primeiro.
 *
 * USO
 *   node scripts/listar-barbearias.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function situacao(b) {
  if (b.status !== "ACTIVE") return "inativa";
  if (b.billingExempt) return "isenta";
  if (b.planId) return "com plano";
  if (b.trialEndsAt && b.trialEndsAt < new Date()) return "trial vencido";
  if (b.trialEndsAt) {
    const dias = Math.ceil((b.trialEndsAt - new Date()) / 86400000);
    return `trial (${dias}d)`;
  }
  return "sem trial";
}

try {
  const barbearias = await prisma.barbershop.findMany({
    select: {
      name: true,
      slug: true,
      status: true,
      planId: true,
      trialEndsAt: true,
      billingExempt: true,
      createdAt: true,
      _count: { select: { appointments: true, professionals: true } },
      users: {
        where: { role: "OWNER", active: true },
        select: { user: { select: { email: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (barbearias.length === 0) {
    console.log("\n  Nenhuma barbearia cadastrada.\n");
  } else {
    console.log(`\n  ${barbearias.length} barbearia(s):\n`);
    console.log(
      "  " +
        "SLUG".padEnd(26) +
        "NOME".padEnd(26) +
        "SITUAÇÃO".padEnd(16) +
        "AGEND.".padStart(7) +
        "  DONO",
    );
    console.log("  " + "─".repeat(100));

    for (const b of barbearias) {
      console.log(
        "  " +
          b.slug.slice(0, 25).padEnd(26) +
          b.name.slice(0, 25).padEnd(26) +
          situacao(b).padEnd(16) +
          String(b._count.appointments).padStart(7) +
          "  " +
          (b.users[0]?.user.email ?? "—"),
      );
    }
    console.log(`
  O SLUG é o que os outros scripts pedem — e é o que aparece na URL
  pública, em /s/<slug>.
`);
  }
} catch (erro) {
  console.error(`\n  Falhou: ${erro.message}\n`);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
