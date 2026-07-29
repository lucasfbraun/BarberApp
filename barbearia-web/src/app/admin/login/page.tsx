"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/* Entrada do painel do SaaS.

   Separada do /login por um motivo prático: enviando `scope: "admin"`, o
   `authorize` escolhe o vínculo SUPERADMIN. Pelo /login, o mesmo e-mail entra
   como dono da própria barbearia. A porta decide o papel.

   Sem marca e sem link para o resto do site: quem chega aqui já sabe onde
   está, e uma página anônima entrega menos a quem tropeçou no caminho. */

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);

    const res = await signIn("credentials", {
      email,
      password: senha,
      scope: "admin",
      redirect: false,
    });

    if (!res?.ok) {
      // Mensagem única, sem distinguir "senha errada" de "não é admin": as
      // duas informações juntas ajudariam quem está testando credenciais.
      setErro("Credenciais inválidas ou sem permissão para este painel.");
      setEnviando(false);
      return;
    }

    // Volta para onde tentou ir, se veio de um redirecionamento.
    router.push(params?.get("callbackUrl") || ".");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
            Restrito
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Painel do sistema</h1>

          <form onSubmit={entrar} className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">E-mail</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Senha</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40"
              />
            </label>

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-40"
            >
              {enviando ? "Entrando..." : "Entrar"}
            </button>

            {erro && <p className="text-sm text-red-300">{erro}</p>}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Esta área é do administrador do sistema. Donos de barbearia entram
          pela página normal de acesso.
        </p>
      </div>
    </main>
  );
}
