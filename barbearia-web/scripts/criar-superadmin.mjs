/**
 * Cria (ou promove) o SUPERADMIN — o acesso ao painel /admin.
 *
 * POR QUE ISTO É UM SCRIPT, E NÃO UMA TELA
 * Quem cria o dono do SaaS não pode ser uma rota HTTP: uma tela pública de
 * "criar primeiro admin" é uma porta que fica aberta para sempre, e uma tela
 * protegida exige um admin que ainda não existe. O caminho seguro é o acesso
 * ao banco, que só quem opera a infraestrutura tem.
 *
 * USO
 *   node scripts/criar-superadmin.mjs seu@email.com "sua-senha" "Seu Nome"
 *
 * Rode uma vez. Depois disso, entre normalmente em /login — o sistema
 * identifica o papel e leva para /admin.
 */

import { PrismaClient, UserRole, TenantStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Barbearia interna à qual o SUPERADMIN fica vinculado. */
const SLUG_INTERNO = "barvioapp-interno";

function encerrar(mensagem, codigo = 1) {
  console.error(`\n  ${mensagem}\n`);
  process.exit(codigo);
}

const [email, senha, nome] = process.argv.slice(2);

if (!email || !senha) {
  encerrar(
    'Uso: node scripts/criar-superadmin.mjs <email> <senha> ["Nome"]\n' +
      '  ex: node scripts/criar-superadmin.mjs lucas@barvioapp.com.br "senha-forte" "Lucas"',
  );
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) encerrar("E-mail inválido.");
if (senha.length < 8) encerrar("A senha precisa de pelo menos 8 caracteres.");

try {
  const emailNormalizado = email.trim().toLowerCase();

  /* O papel mora em BarbershopUser, que exige uma barbearia. O SUPERADMIN
     precisa então de um tenant ao qual se prender.

     Usamos uma barbearia INTERNA em vez de pendurá-lo na de um cliente — ali
     ele apareceria na equipe de alguém, e desativar aquela barbearia
     derrubaria o acesso ao painel do SaaS inteiro.

     Ela precisa estar ACTIVE: o `authorize` do NextAuth só coloca o papel no
     token se a barbearia do vínculo estiver ativa. E `billingExempt` para que
     nenhuma regra de cobrança futura a bloqueie. */
  const interna = await prisma.barbershop.upsert({
    where: { slug: SLUG_INTERNO },
    create: {
      name: "BarvioApp (interno)",
      slug: SLUG_INTERNO,
      status: TenantStatus.ACTIVE,
      billingExempt: true,
    },
    update: { status: TenantStatus.ACTIVE, billingExempt: true },
    select: { id: true },
  });

  const passwordHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.user.upsert({
    where: { email: emailNormalizado },
    create: { name: nome?.trim() || "Admin", email: emailNormalizado, passwordHash },
    // Rodar de novo com outra senha serve para redefini-la — é o caminho de
    // recuperação de quem perdeu o acesso ao painel do SaaS.
    //
    // O nome só é sobrescrito se você passar um: antes o `update` ignorava o
    // argumento, e quem já tinha conta via o nome antigo permanecer, sem
    // entender por quê.
    update: { passwordHash, active: true, ...(nome?.trim() ? { name: nome.trim() } : {}) },
    select: { id: true, name: true },
  });

  await prisma.barbershopUser.upsert({
    where: { barbershopId_userId: { barbershopId: interna.id, userId: usuario.id } },
    create: { barbershopId: interna.id, userId: usuario.id, role: UserRole.SUPERADMIN },
    update: { role: UserRole.SUPERADMIN, active: true },
  });

  /* Ter vínculo com outras barbearias deixou de ser um problema: o papel
     passou a ser decidido pela PORTA de entrada, não por precedência. */
  const outros = await prisma.barbershopUser.findMany({
    where: { userId: usuario.id, active: true, NOT: { barbershopId: interna.id } },
    // Mostra o SLUG junto do nome: é o slug que os outros scripts pedem, e
    // exibir só o nome já levou alguém a procurar uma barbearia inexistente.
    select: { role: true, barbershop: { select: { name: true, slug: true } } },
  });

  const caminhoAdmin = process.env.ADMIN_PATH?.trim().replace(/^\/+|\/+$/g, "") || "admin";

  console.log(`
  SUPERADMIN pronto.

    e-mail  ${emailNormalizado}
    nome    ${usuario.name}
    entrar  /${caminhoAdmin}/login
`);

  console.log(`  A porta de entrada define o papel:

    /${caminhoAdmin}/login   →  painel do sistema (todas as barbearias)
    /login${" ".repeat(Math.max(0, caminhoAdmin.length - 4))}          →  painel da barbearia, se você tiver uma
`);

  if (outros.length > 0) {
    const lista = outros
      .map((o) => `${o.barbershop.name} [slug: ${o.barbershop.slug}] (${o.role})`)
      .join(", ");
    console.log(`  Este e-mail também está vinculado a ${lista} —
  e isso está ok: os dois acessos funcionam, cada um pela sua porta.
`);
  }
} catch (erro) {
  encerrar(`Falhou: ${erro.message}`);
} finally {
  await prisma.$disconnect();
}
