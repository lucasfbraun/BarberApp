/**
 * Exclui uma barbearia e TODOS os dados dela.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ISTO É IRREVERSÍVEL. Não há lixeira, não há desfazer.
 *
 *  Some: agendamentos, clientes, comandas, pagamentos, comissões, produtos,
 *  movimentações de estoque, avaliações, profissionais, serviços, jornadas,
 *  bloqueios, permissões e a trilha de auditoria.
 *
 *  NÃO some: as contas de usuário (elas são independentes da barbearia).
 * ─────────────────────────────────────────────────────────────────────────
 *
 * USO
 *   node scripts/excluir-barbearia.mjs <slug>
 *
 * Mostra o que será apagado e pede confirmação digitando o slug. Para pular
 * a confirmação — só em automação, sabendo o que está fazendo:
 *   node scripts/excluir-barbearia.mjs <slug> --sim
 *
 * ANTES DE RODAR EM PRODUÇÃO: tenha um backup. O Neon tem restauração por
 * ponto no tempo; confirme que está ativa.
 */

import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function encerrar(mensagem, codigo = 1) {
  console.error(`\n  ${mensagem}\n`);
  process.exit(codigo);
}

function perguntar(texto) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(texto, (resposta) => {
      rl.close();
      resolve(resposta.trim());
    }),
  );
}

const [alvoBruto, flag] = process.argv.slice(2);
if (!alvoBruto) {
  encerrar(
    "Uso: node scripts/excluir-barbearia.mjs <slug-ou-nome> [--sim]\n" +
      "  ex: node scripts/excluir-barbearia.mjs minha-barbearia\n\n" +
      "  Para ver o que existe: node scripts/listar-barbearias.mjs",
  );
}

const alvo = alvoBruto.trim();

try {
  /* Aceita slug OU nome. O nome é o que aparece nas telas e nas mensagens dos
     outros scripts; exigir o slug faria a pessoa caçar um dado que ela não
     tem à mão. */
  const barbearia = await prisma.barbershop.findFirst({
    where: {
      OR: [
        { slug: alvo.toLowerCase() },
        { name: { equals: alvo, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          professionals: true,
          services: true,
          customers: true,
          appointments: true,
          orders: true,
          payments: true,
          commissions: true,
          products: true,
          stockMovements: true,
          reviews: true,
          scheduleBlocks: true,
          auditLogs: true,
        },
      },
      users: {
        where: { active: true },
        select: { role: true, user: { select: { email: true } } },
      },
    },
  });

  if (!barbearia) {
    // Em vez de só dizer "não encontrada", mostra o que existe — na maioria
    // das vezes o que faltou foi saber o slug.
    const todas = await prisma.barbershop.findMany({
      select: { name: true, slug: true },
      orderBy: { createdAt: "asc" },
    });
    encerrar(
      `Nenhuma barbearia com slug ou nome "${alvo}".\n\n` +
        (todas.length
          ? "  Existem:\n" +
            todas.map((b) => `    ${b.slug.padEnd(28)} ${b.name}`).join("\n")
          : "  Não há nenhuma barbearia cadastrada."),
    );
  }

  /* Guarda-corpo: a barbearia interna é o que prende o papel SUPERADMIN.
     Apagá-la derruba o acesso ao painel do SaaS inteiro. */
  if (barbearia.slug === "barvioapp-interno") {
    encerrar(
      "Esta é a barbearia INTERNA, que sustenta o acesso ao painel do SaaS.\n" +
        "  Apagá-la tira o SUPERADMIN do ar. Se realmente precisar, refaça o\n" +
        "  acesso depois com scripts/criar-superadmin.mjs.",
    );
  }

  const c = barbearia._count;
  const total = Object.values(c).reduce((s, n) => s + n, 0);

  console.log(`
  ${barbearia.name}  (/s/${barbearia.slug})
  criada em ${barbearia.createdAt.toLocaleDateString("pt-BR")}

  Será apagado:
    ${String(c.appointments).padStart(5)}  agendamentos
    ${String(c.customers).padStart(5)}  clientes
    ${String(c.orders).padStart(5)}  comandas
    ${String(c.payments).padStart(5)}  pagamentos
    ${String(c.commissions).padStart(5)}  comissões
    ${String(c.professionals).padStart(5)}  profissionais
    ${String(c.services).padStart(5)}  serviços
    ${String(c.products).padStart(5)}  produtos
    ${String(c.stockMovements).padStart(5)}  movimentações de estoque
    ${String(c.reviews).padStart(5)}  avaliações
    ${String(c.scheduleBlocks).padStart(5)}  bloqueios de agenda
    ${String(c.auditLogs).padStart(5)}  registros de auditoria
    ${String(c.users).padStart(5)}  vínculos de equipe

  Equipe vinculada (as CONTAS permanecem):
${barbearia.users.map((u) => `    ${u.user.email} (${u.role})`).join("\n") || "    nenhuma"}
`);

  if (flag !== "--sim") {
    const resposta = await perguntar(
      `  Isto é IRREVERSÍVEL (${total} registros).\n  Digite "${barbearia.slug}" para confirmar: `,
    );
    if (resposta !== barbearia.slug) {
      encerrar("Cancelado. Nada foi apagado.", 0);
    }
  }

  await prisma.$transaction(async (tx) => {
    /* ServiceCategory tem `barbershopId` mas NENHUMA chave estrangeira para
       Barbershop — conferido no schema. Sem apagar aqui, as categorias
       ficariam órfãs no banco para sempre, invisíveis e sem dono.

       (WorkingHours também não tem FK para Barbershop, mas cascateia por
       Professional, então não precisa de tratamento.) */
    await tx.serviceCategory.deleteMany({ where: { barbershopId: barbearia.id } });

    // O resto cai por cascata: todas as 15 relações declaram onDelete: Cascade.
    await tx.barbershop.delete({ where: { id: barbearia.id } });
  });

  console.log(`
  Apagada: ${barbearia.name}

  As contas de usuário continuam existindo. Quem tinha sessão aberta segue
  com o token antigo até sair e entrar de novo — e aí não achará mais a
  barbearia.
`);
} catch (erro) {
  encerrar(`Falhou: ${erro.message}`);
} finally {
  await prisma.$disconnect();
}
