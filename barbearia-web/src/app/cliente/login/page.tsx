"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import SocialLoginButtons from "@/components/SocialLoginButtons";

/* Erros do login social chegam por querystring (ver callbacks.signIn em
   lib/auth.ts e pages.error do NextAuth). */
const SOCIAL_ERRORS: Record<string, string> = {
  SemEmail:
    "Sua conta não liberou o e-mail. Autorize o compartilhamento do e-mail ou crie a conta com e-mail e senha.",
  EmailNaoVerificado:
    "O provedor não confirmou esse e-mail. Verifique o e-mail na conta do Google/Facebook e tente de novo.",
  ContaInativa: "Esta conta está inativa. Fale com a barbearia.",
  ContaDeBarbearia:
    "Contas de barbearia entram pelo painel, com e-mail e senha.",
  ErroInterno: "Tivemos um problema ao entrar. Tente novamente em instantes.",
  AccessDenied: "Você cancelou a autorização.",
  OAuthAccountNotLinked: "Este e-mail já entra por outro método. Use o login original.",
};

function socialErrorMessage(code: string | null): string {
  if (!code) return "";
  return SOCIAL_ERRORS[code] ?? "Não foi possível entrar com essa conta. Tente novamente.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/cliente";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => socialErrorMessage(searchParams?.get("error") ?? null));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);
    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.push(callbackUrl);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
        {/* Saudação no padrão da home */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Olá! <span className="text-blue-600">Bem-vindo de volta</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Entre para agendar seu horário.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
              </svg>
              <input
                required
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400"
              />
            </div>

            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                required
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400"
              />
            </div>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <SocialLoginButtons callbackUrl={callbackUrl} />
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Ainda não tem conta?{" "}
          <Link
            href={`/cliente/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-blue-600 hover:underline"
          >
            Criar conta grátis
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          <Link href="/cliente" className="hover:underline">← Voltar para o início</Link>
        </p>
      </div>
    </div>
  );
}

export default function ClienteLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
