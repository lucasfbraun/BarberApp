/**
 * Transfere a propriedade de uma barbearia para outro e-mail.
 *
 * Operação de suporte: o dono vendeu o negócio, saiu da sociedade, ou o
 * cadastro foi feito com o e-mail errado. Fazer isso na mão no banco é como
 * se apaga o único OWNER e deixa a barbearia órfã.
 *
 * USO
 *   node scripts/transferir-barbearia.mjs <slug> <novo-email> ["Nome"] ["senha"]
 *
 *   slug        identificador da barbearia (o que aparece em /s/<slug>)
 *   novo-email  quem passa a ser OWNER. Se não existir, é criado
 *   Nome        usado só na criação
 *   senha       usada só na criação. Sem ela, a conta nasce sem senha e a
 *               pessoa entra por /esqueci-senha
 *
 * O QUE ACONTECE COM O DONO ANTERIOR
 * Ele é REBAIXADO a MANAGER, não removido. Duas razões: apagar o vínculo
 * perderia o histórico de quem fez o quê, e uma transferência costuma ter um
 * período de convivência. Para tirá-lo de vez, use o painel depois.
 */

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function encerrar(mensagem, codigo = 1) {
  console.error(`\n  ${mensagem}\n`);
  process.exit(codigo);
}

const [slug, email, nome, senha] = process.argv.slice(2);

if (!slug || !email) {
  encerrar(
    'Uso: node scripts/transferir-barbearia.mjs <slug> <novo-email> ["Nome"] ["senha"]\n' +
      '  ex: node scripts/transferir-barbearia.mjs braunbarber joao@exemplo.com "João" "senha-forte"',
  );
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) encerrar("E-mail inválido.");
if (senha && senha.length < 8) encerrar("A senha precisa de pelo menos 8 caracteres.");

try {
  const emailNormalizado = email.trim().toLowerCase();

  // Aceita slug OU nome, mesma razão do script de exclusão: o nome é o que
  // aparece nas telas, e o slug é o que ninguém tem de cabeça.
  const barbearia = await prisma.barbershop.findFirst({
    where: {
      OR: [
        { slug: slug.trim().toLowerCase() },
        { name: { equals: slug.trim(), mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      users: {
        where: { role: UserRole.OWNER, active: true },
        select: { userId: true, user: { select: { email: true, name: true } } },
      },
    },
  });

  if (!barbearia) encerrar(`Barbearia "${slug}" não encontrada.`);

  const donoAtual = barbearia.users[0] ?? null;

  let novoDono = await prisma.user.findUnique({
    where: { email: emailNormalizado },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { role: "SUPERADMIN", active: true },
        select: { id: true },
      },
    },
  });

  /* Mesma invariante do onboarding, pelo outro lado: e-mail de SUPERADMIN não
     é dono de barbearia. O onboarding barra na criação; aqui barra na
     transferência, que seria a porta dos fundos para o mesmo estado. */
  if (novoDono && novoDono.memberships.length > 0) {
    encerrar(
      `${emailNormalizado} é administrador do sistema e não pode ser dono de\n` +
        "  barbearia. Use um e-mail separado para cada papel.",
    );
  }

  if (novoDono && donoAtual?.userId === novoDono.id) {
    encerrar(`${emailNormalizado} já é o dono de ${barbearia.name}. Nada a fazer.`);
  }

  const criandoConta = !novoDono;
  if (!novoDono) {
    novoDono = await prisma.user.create({
      data: {
        name: nome?.trim() || emailNormalizado.split("@")[0],
        email: emailNormalizado,
        // Sem senha, a conta existe mas não entra por senha — o caminho é
        // /esqueci-senha. Melhor do que inventar uma e mandar por WhatsApp.
        passwordHash: senha ? await bcrypt.hash(senha, 10) : null,
      },
      // `memberships` vazio para o objeto ter o mesmo formato do ramo acima.
      select: { id: true, name: true, memberships: { select: { id: true } } },
    });
  }

  /* Rebaixar e promover na MESMA transação: se o primeiro passasse e o
     segundo falhasse, a barbearia ficaria sem nenhum dono — e ninguém
     conseguiria mais entrar no painel dela. */
  await prisma.$transaction(async (tx) => {
    if (donoAtual) {
      await tx.barbershopUser.updateMany({
        where: { barbershopId: barbearia.id, userId: donoAtual.userId },
        data: { role: UserRole.MANAGER },
      });
    }

    await tx.barbershopUser.upsert({
      where: {
        barbershopId_userId: { barbershopId: barbearia.id, userId: novoDono.id },
      },
      create: {
        barbershopId: barbearia.id,
        userId: novoDono.id,
        role: UserRole.OWNER,
      },
      update: { role: UserRole.OWNER, active: true },
    });
  });

  console.log(`
  Transferência concluída — ${barbearia.name}

    novo dono     ${emailNormalizado}${criandoConta ? "  (conta criada)" : ""}
    dono anterior ${donoAtual ? `${donoAtual.user.email} → agora MANAGER` : "não havia"}
`);

  if (criandoConta && !senha) {
    console.log(`  A conta nasceu SEM senha. Peça para ${emailNormalizado} usar
  "Esqueci minha senha" na tela de login para definir a dela.
`);
  }

  console.log(`  Quem estava logado continua com a sessão antiga até sair e entrar
  de novo — o papel viaja no token. Avise para relogar.
`);
} catch (erro) {
  encerrar(`Falhou: ${erro.message}`);
} finally {
  await prisma.$disconnect();
}
