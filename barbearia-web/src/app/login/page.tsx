"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";

import { Logo } from "@/components/Logo";

/* O painel lateral mostrava "Sprint 1 — Autenticação em construção", texto de
   desenvolvimento que chegou a ficar visível para quem entra. Trocado pela
   marca e pelo que o sistema realmente faz hoje. */
const destaques = [
  "Agenda e agendamento online",
  "Comanda, caixa e comissão",
  "Portal do profissional no celular",
  "Área do cliente e app instalável",
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitCallback = searchParams?.get("callbackUrl") ?? null;
  const callbackUrl = explicitCallback ?? "/agenda";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hint = useMemo(() => {
    if (searchParams?.get("registered") === "1") {
      return "Conta criada com sucesso. Entre com seus dados para acessar o tenant.";
    }
    return "A autenticação já conversa com banco e sessão real.";
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    // Sem callback explícito, decide pelo perfil: funcionário vai para o
    // painel; cliente final (sem barbearia vinculada) vai para /cliente.
    if (!explicitCallback) {
      try {
        const session = await fetch("/api/auth/session").then((r) => r.json());
        if (!session?.user?.activeBarbershopId) {
          router.push("/cliente");
          return;
        }
      } catch {
        // segue para o padrão
      }
    }

    router.push(callbackUrl);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Acesso</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
        Entrar
      </h1>
      <p className="mt-2 text-sm text-slate-400">Painel da barbearia ou conta de cliente — o mesmo login serve para os dois.</p>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">{hint}</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">E-mail</span>
          <input
            type="email"
            placeholder="voce@barbearia.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Senha</span>
          <input
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          {isSubmitting ? "Entrando..." : "Entrar no painel"}
        </button>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </form>

      <p className="mt-5 text-center text-sm">
        <a href="/esqueci-senha" className="text-slate-400 hover:text-cyan-300 hover:underline">
          Esqueci minha senha
        </a>
      </p>

      <p className="mt-6 text-center text-sm text-slate-400">
        É cliente e ainda não tem conta?{" "}
        <a
          href={`/cliente/cadastro${explicitCallback ? `?callbackUrl=${encodeURIComponent(explicitCallback)}` : ""}`}
          className="text-cyan-300 hover:underline"
        >
          Criar conta de cliente
        </a>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <Suspense fallback={<div className="rounded-3xl border border-white/10 bg-white/5 p-8" />}>
          <LoginForm />
        </Suspense>

        <aside className="flex flex-col justify-center rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
          <Logo size="lg" />

          <p className="mt-6 text-sm leading-6 text-slate-400">
            Gestão completa para barbearias — da agenda ao caixa, no computador
            e no celular.
          </p>

          <ul className="mt-8 space-y-4 text-sm text-slate-300">
            {destaques.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
