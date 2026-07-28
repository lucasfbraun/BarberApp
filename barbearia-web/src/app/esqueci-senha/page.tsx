"use client";

import { useState } from "react";
import Link from "next/link";

/* Pedido de redefinição de senha (E1).

   A tela SEMPRE mostra a mesma confirmação, exista ou não o e-mail. Dizer
   "e-mail não cadastrado" transformaria a página num verificador de contas —
   qualquer um descobriria quem tem cadastro aqui. */

/* O `main` repete o enquadramento de /login: o layout raiz tem fundo escuro
   mas não centraliza nada, então cada tela de acesso traz o próprio. */
export default function EsqueciSenhaPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
      <div className="w-full">
        <EsqueciSenhaForm />
      </div>
    </main>
  );
}

function EsqueciSenhaForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/senha/esqueci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "Não foi possível processar o pedido.");
        return;
      }

      setMessage(body.message ?? "Se este e-mail estiver cadastrado, enviamos um link.");
      setSent(true);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Acesso</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
        Esqueci minha senha
      </h1>

      {sent ? (
        <>
          <p className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
            {message}
          </p>
          <p className="mt-4 text-sm text-slate-400">
            O link vale por 1 hora e pode ser usado uma vez só.
          </p>
          <Link
            href="/login"
            className="mt-8 block w-full rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-slate-200 transition hover:bg-white/5"
          >
            Voltar para o login
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-400">
            Informe o e-mail da sua conta e enviaremos um link para escolher uma senha nova.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">E-mail</span>
              <input
                type="email"
                required
                placeholder="voce@barbearia.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
            >
              {submitting ? "Enviando..." : "Enviar link"}
            </button>

            {error && <p className="text-sm text-red-300">{error}</p>}
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Lembrou?{" "}
            <Link href="/login" className="text-cyan-300 hover:underline">
              Voltar para o login
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-500">
            Entrou com Google ou Facebook? Sua conta não tem senha — use o mesmo
            botão social na tela de login.
          </p>
        </>
      )}
    </section>
  );
}
