import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const protectedRoutes = ["/agenda", "/clientes", "/profissionais", "/servicos", "/configuracoes"];
const publicOnlyRoutes = ["/login", "/cadastro"];

export default async function middleware(request: Request & { nextUrl: URL; cookies: { get(name: string): { value: string } | undefined } }) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isPublicOnlyRoute = publicOnlyRoutes.some((route) => pathname.startsWith(route));

  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL("/agenda", request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/agenda/:path*", "/clientes/:path*", "/profissionais/:path*", "/servicos/:path*", "/configuracoes/:path*", "/login", "/cadastro"],
};