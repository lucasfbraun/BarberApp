import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

import { ADMIN_DIR, adminBasePath } from "@/lib/admin-path";

/**
 * Middleware de rotas (o `proxy.ts` do Next 16).
 *
 * Tres publicos, tres regras:
 *  - PAINEL (`/agenda`, `/estoque`, …): equipe administrativa. Barra o
 *    PROFESSIONAL, que tem o portal proprio.
 *  - PORTAL (`/profissional`): barbeiro. Aberto tambem a OWNER/MANAGER,
 *    porque em barbearia pequena o dono tambem atende.
 *  - ADMIN (`/admin`): so SUPERADMIN.
 *
 * O middleware e a PRIMEIRA barreira, nao a unica: toda rota de API revalida
 * vinculo e papel no banco (`resolveTenant` / `resolveProfessional`). Aqui a
 * decisao vem do JWT, que pode estar ate 30 dias desatualizado — bom o
 * suficiente para escolher para onde mandar alguem, insuficiente para
 * autorizar uma escrita.
 */

const PANEL_ROUTES = [
  "/agenda",
  "/caixa",
  "/clientes",
  "/profissionais",
  "/servicos",
  // `/estoque` e `/permissoes` faltavam no matcher: as APIs ja estavam
  // protegidas, mas quem nao estava logado via a pagina quebrar em vez de ser
  // levado ao login.
  "/estoque",
  "/permissoes",
  "/configuracoes",
  "/relatorio",
  "/comanda",
];

const PORTAL_ROUTES = ["/profissional"];
const ADMIN_ROUTES = ["/admin"];
/**
 * Rotas so para quem NAO esta logado.
 *
 * `/esqueci-senha` e `/redefinir-senha` ficam de fora de proposito: quem esta
 * logado em outro aparelho e clicou no link do e-mail precisa conseguir abrir
 * a pagina, nao ser redirecionado para a agenda.
 */
const PUBLIC_ONLY_ROUTES = ["/login", "/cadastro"];

/** Para onde mandar cada papel depois do login. */
function homeForRole(role: string | undefined, adminBase: string): string {
  if (role === "SUPERADMIN") return adminBase;
  if (role === "PROFESSIONAL") return "/profissional";
  return "/agenda";
}

/**
 * Casa a rota por SEGMENTO, nao por prefixo de string.
 *
 * `startsWith` simples quebraria aqui: "/profissionais" (tela do painel)
 * comeca com "/profissional" (o portal), entao a mesma URL seria classificada
 * como painel E como portal ao mesmo tempo. Exigir fim de string ou barra
 * separa os dois.
 */
function matches(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default async function middleware(
  request: Request & {
    nextUrl: URL;
    cookies: { get(name: string): { value: string } | undefined };
  },
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;

  const adminBase = adminBasePath();
  const adminMovido = adminBase !== ADMIN_DIR;
  let { pathname } = request.nextUrl;

  // ── Caminho proprio do painel do SaaS ─────────────────────────────────────
  //
  // Os arquivos ficam em `app/admin/*`; a URL publica pode ser outra. Duas
  // metades que so funcionam juntas:
  //
  //   1. `/<segredo>/x` e REESCRITO para `/admin/x` — a URL na barra continua
  //      sendo a secreta, e o Next serve a pagina certa.
  //   2. `/admin/x` vira 404 — senao o caminho original continuaria valendo e
  //      esconder nao teria servido para nada.
  let reescrever: URL | null = null;

  if (adminMovido) {
    if (pathname === adminBase || pathname.startsWith(`${adminBase}/`)) {
      const destino = ADMIN_DIR + pathname.slice(adminBase.length);
      reescrever = new URL(destino, request.nextUrl.origin);
      reescrever.search = request.nextUrl.search;
      // Daqui para baixo, as regras de papel avaliam o caminho REAL.
      pathname = destino;
    } else if (pathname === ADMIN_DIR || pathname.startsWith(`${ADMIN_DIR}/`)) {
      // 404, e nao redirecionamento para o login: um redirecionamento
      // confirmaria que existe um painel ali.
      return NextResponse.rewrite(new URL("/nao-encontrado", request.nextUrl.origin));
    }
  }

  const isPanelRoute = matches(pathname, PANEL_ROUTES);
  const isPortalRoute = matches(pathname, PORTAL_ROUTES);
  const isAdminRoute = matches(pathname, ADMIN_ROUTES);
  const isPublicOnlyRoute = matches(pathname, PUBLIC_ONLY_ROUTES);
  // A tela de login do painel precisa ficar aberta a quem ainda nao entrou.
  const isAdminLogin = pathname === `${ADMIN_DIR}/login`;

  // Nao autenticado em rota protegida.
  if (!isLoggedIn && (isPanelRoute || isPortalRoute || (isAdminRoute && !isAdminLogin))) {
    // O painel do SaaS tem porta propria: mandar para o /login comum faria a
    // pessoa entrar como dona da barbearia e nunca chegar ao admin.
    const destino = isAdminRoute ? `${adminBase}/login` : "/login";
    const loginUrl = new URL(destino, request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Ja logado tentando abrir login/cadastro: vai para a casa do seu papel.
  if (isLoggedIn && (isPublicOnlyRoute || isAdminLogin)) {
    return NextResponse.redirect(
      new URL(homeForRole(role, adminBase), request.nextUrl.origin),
    );
  }

  if (isLoggedIn && isAdminRoute) {
    if (role !== "SUPERADMIN") {
      return NextResponse.redirect(
        new URL(homeForRole(role, adminBase), request.nextUrl.origin),
      );
    }
    return reescrever ? NextResponse.rewrite(reescrever) : NextResponse.next();
  }

  // Painel administrativo: o barbeiro nao entra. A secao 23 do Portal do
  // Profissional lista o que ele nao deve ver — caixa, relatorios, estoque,
  // configuracao — e e exatamente o que mora aqui.
  if (isLoggedIn && isPanelRoute && role === "PROFESSIONAL") {
    return NextResponse.redirect(new URL("/profissional", request.nextUrl.origin));
  }

  // Portal: papeis que atendem. O SUPERADMIN nao tem registro de profissional,
  // entao cairia num 403 da API — melhor redirecionar antes.
  if (isLoggedIn && isPortalRoute && role === "SUPERADMIN") {
    return NextResponse.redirect(new URL(adminBase, request.nextUrl.origin));
  }

  // Trial vencido bloqueia painel e portal: o vencimento e da barbearia, e
  // deixar o barbeiro atendendo enquanto o dono esta bloqueado nao faz sentido.
  if (isLoggedIn && (isPanelRoute || isPortalRoute)) {
    const trialEndsAt = token.trialEndsAt ? new Date(token.trialEndsAt as string) : null;
    if (trialEndsAt && trialEndsAt < new Date()) {
      return NextResponse.redirect(new URL("/trial-expirado", request.nextUrl.origin));
    }
  }

  // A reescrita precisa valer tambem aqui. Sem isto, a tela de login do
  // painel (que nao cai em nenhuma regra acima, por ser aberta) chegaria ao
  // Next com a URL secreta e daria 404.
  return reescrever ? NextResponse.rewrite(reescrever) : NextResponse.next();
}

/**
 * O matcher e ESTATICO — nao aceita valor de variavel de ambiente. Como o
 * caminho do painel e configuravel, o middleware precisa ver todas as
 * requisicoes de pagina e decidir em tempo de execucao.
 *
 * Ficam de fora os arquivos servidos direto (estaticos, imagens da marca,
 * service worker, SEO) e as rotas de API, que ja se protegem sozinhas com
 * `resolveTenant` / `resolveAdmin`.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|icons|sw\\.js|offline\\.html|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml).*)",
  ],
};
