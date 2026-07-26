"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import { BUTTON, INPUT, LABEL, MUTED, TITLE } from "@/lib/ui";

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
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12">
        <p className={LABEL}>Cliente</p>
        <h1 className={`${TITLE} mt-3`}>Bem-vindo de volta</h1>
        <p className={`${MUTED} mt-2`}>Entre para agendar seu horário.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <input
            required
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
          />
          <input
            required
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />

          {error && (
            <p className="border-l-2 border-red-600 py-1 pl-4 text-sm text-red-600">{error}</p>
          )}

          <button type="submit" disabled={submitting} className={BUTTON}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <SocialLoginButtons callbackUrl={callbackUrl} />

        <p className={`${MUTED} mt-10 text-center`}>
          Ainda não tem conta?{" "}
          <Link
            href={`/cliente/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-neutral-900 underline underline-offset-4"
          >
            Criar conta
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-neutral-400">
          <Link href="/cliente" className="hover:text-neutral-900">← Voltar para o início</Link>
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
