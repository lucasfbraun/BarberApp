"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";

const benefits = [
  "Acesso ao painel da barbearia",
  "Proteção por tenant",
  "Base para perfis e permissões",
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/agenda";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hint = useMemo(() => {
    if (searchParams.get("registered") === "1") {
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

    router.push(callbackUrl);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Acesso</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Entrar no painel da barbearia
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
            {hint}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">E-mail</span>
              <input
                type="email"
                placeholder="voce@barbearia.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Senha</span>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
        </section>

        <aside className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
            Sprint 1
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Autenticação em construção</h2>
          <ul className="mt-6 space-y-4 text-sm text-slate-300">
            {benefits.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            O login agora valida credenciais contra o banco, carrega a barbearia ativa do usuário e
            redireciona para a área protegida.
          </div>
        </aside>
      </div>
    </main>
  );
}
