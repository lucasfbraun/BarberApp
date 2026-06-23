import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const PANEL_ROUTES = [
  "/agenda",
  "/clientes",
  "/profissionais",
  "/servicos",
  "/configuracoes",
  "/relatorio",
  "/comanda",
];

const ADMIN_ROUTES = ["/admin"];
const PUBLIC_ONLY_ROUTES = ["/login", "/cadastro"];

export default async function middleware(
  request: Request & { nextUrl: URL; cookies: { get(name: string): { value: string } | undefined } },
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const { pathname } = request.nextUrl;

  const isPanelRoute = PANEL_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isPublicOnlyRoute = PUBLIC_ONLY_ROUTES.some((r) => pathname.startsWith(r));

  // Redirect unauthenticated users away from protected routes
  if (!isLoggedIn && (isPanelRoute || isAdminRoute)) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from login/cadastro
  if (isLoggedIn && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL("/agenda", request.nextUrl.origin));
  }

  // Admin routes: require SUPERADMIN role
  if (isLoggedIn && isAdminRoute) {
    if (token.role !== "SUPERADMIN") {
      return NextResponse.redirect(new URL("/agenda", request.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Panel routes: check trial expiry
  if (isLoggedIn && isPanelRoute) {
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
    "/clientes/:path*",
    "/profissionais/:path*",
    "/servicos/:path*",
    "/configuracoes/:path*",
    "/relatorio/:path*",
    "/comanda/:path*",
    "/admin/:path*",
    "/login",
    "/cadastro",
  ],
};
