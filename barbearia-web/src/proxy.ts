import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

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
const PUBLIC_ONLY_ROUTES = ["/login", "/cadastro"];

/** Para onde mandar cada papel depois do login. */
function homeForRole(role: string | undefined): string {
  if (role === "SUPERADMIN") return "/admin";
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
  const { pathname } = request.nextUrl;
  const role = token?.role as string | undefined;

  const isPanelRoute = matches(pathname, PANEL_ROUTES);
  const isPortalRoute = matches(pathname, PORTAL_ROUTES);
  const isAdminRoute = matches(pathname, ADMIN_ROUTES);
  const isPublicOnlyRoute = matches(pathname, PUBLIC_ONLY_ROUTES);

  // Nao autenticado em rota protegida: manda para o login preservando o destino.
  if (!isLoggedIn && (isPanelRoute || isPortalRoute || isAdminRoute)) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Ja logado tentando abrir login/cadastro: vai para a casa do seu papel.
  if (isLoggedIn && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL(homeForRole(role), request.nextUrl.origin));
  }

  if (isLoggedIn && isAdminRoute) {
    if (role !== "SUPERADMIN") {
      return NextResponse.redirect(new URL(homeForRole(role), request.nextUrl.origin));
    }
    return NextResponse.next();
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
    return NextResponse.redirect(new URL("/admin", request.nextUrl.origin));
  }

  // Trial vencido bloqueia painel e portal: o vencimento e da barbearia, e
  // deixar o barbeiro atendendo enquanto o dono esta bloqueado nao faz sentido.
  if (isLoggedIn && (isPanelRoute || isPortalRoute)) {
    const trialEndsAt = token.trialEndsAt ? new Date(token.trialEndsAt as string) : null;
    if (trialEndsAt && trialEndsAt < new Date()) {
      return NextResponse.redirect(new URL("/trial-expirado", request.nextUrl.origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/agenda/:path*",
    "/caixa/:path*",
    "/clientes/:path*",
    "/profissionais/:path*",
    "/servicos/:path*",
    "/estoque/:path*",
    "/permissoes/:path*",
    "/configuracoes/:path*",
    "/relatorio/:path*",
    "/comanda/:path*",
    "/profissional/:path*",
    "/admin/:path*",
    "/login",
    "/cadastro",
  ],
};
