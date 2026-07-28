"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/* Escolha da nova senha (E1).

   O link é validado ao ABRIR a página, não só ao enviar: descobrir que o link
   expirou depois de digitar a senha duas vezes é irritante e evitável. */

/* O `main` repete o enquadramento de /login: o layout raiz tem fundo escuro
   mas não centraliza nada, então cada tela de acesso traz o próprio. */
export default function RedefinirSenhaPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
      <div className="w-full">
        <Suspense
          fallback={
            <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <p className="text-sm text-slate-400">Carregando...</p>
            </section>
          }
        >
          <RedefinirSenhaContent />
        </Suspense>
      </div>
    </main>
  );
}

function RedefinirSenhaContent() {
  const params = useSearchParams();
  const router = useRouter();
  // `useSearchParams()` pode devolver null no Next 16 — sempre com `?.`.
  const token = params?.get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLinkError("Link inválido.");
      setChecking(false);
      return;
    }

    fetch(`/api/senha/redefinir?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.valid) {
          setValid(true);
          setName(body.name ?? null);
        } else {
          setLinkError(body.error ?? "Link inválido.");
        }
      })
      .catch(() => setLinkError("Não foi possível validar o link."))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/senha/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "Não foi possível redefinir a senha.");
        return;
      }

      setDone(true);
      // Leva ao login sozinho — a pessoa acabou de trocar a senha e o próximo
      // passo é entrar.
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const shell = "rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur";

  if (checking) {
    return (
      <section className={shell}>
        <p className="text-sm text-slate-400">Validando o link...</p>
      </section>
    );
  }

  if (!valid) {
    return (
      <section className={shell}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Acesso</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Link não utilizável
        </h1>
        <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {linkError}
        </p>
        <p className="mt-4 text-sm text-slate-400">
          Links de redefinição valem por 1 hora e só podem ser usados uma vez.
        </p>
        <Link
          href="/esqueci-senha"
          className="mt-8 block w-full rounded-2xl bg-cyan-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Pedir um novo link
        </Link>
      </section>
    );
  }

  if (done) {
    return (
      <section className={shell}>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Senha alterada</h1>
        <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          Pronto. Você já pode entrar com a senha nova.
        </p>
        <Link
          href="/login"
          className="mt-8 block w-full rounded-2xl bg-cyan-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Ir para o login
        </Link>
      </section>
    );
  }

  return (
    <section className={shell}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Acesso</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
        {name ? `Olá, ${name}` : "Nova senha"}
      </h1>
      <p className="mt-2 text-sm text-slate-400">Escolha uma senha nova para sua conta.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Nova senha</span>
          <input
            type={show ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Repita a senha</span>
          <input
            type={show ? "text" : "password"}
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Mostrar senha
        </label>

        <p className="text-xs text-slate-500">Mínimo de 8 caracteres.</p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
        >
          {submitting ? "Salvando..." : "Salvar nova senha"}
        </button>

        {error && <p className="text-sm text-red-300">{error}</p>}
      </form>
    </section>
  );
}
