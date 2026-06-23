"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

const steps = [
  "Dados da barbearia",
  "Tema visual e identidade",
  "Usuário administrador",
  "Confirmação e ativação",
];

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    barbershopName: "",
    slug: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    whatsapp: "",
    couponCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let response: Response;

    try {
      response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch {
      setIsSubmitting(false);
      setError("Nao foi possivel conectar ao servidor.");
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json()) as { error?: string })
      : { error: await response.text() };

    if (!response.ok) {
      setIsSubmitting(false);
      setError(payload.error ?? "Nao foi possivel criar a barbearia.");
      return;
    }

    const loginResult = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
      callbackUrl: "/agenda",
    });

    setIsSubmitting(false);

    if (loginResult?.error) {
      router.push("/login?registered=1");
      return;
    }

    router.push("/agenda");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Onboarding</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
          Cadastro inicial da barbearia
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
          Esta tela representa a etapa onde a barbearia entra no sistema e recebe sua identidade,
          acesso inicial e configuração mínima.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Passo {index + 1}</p>
              <h2 className="mt-2 text-lg font-semibold text-white">{step}</h2>
            </article>
          ))}
        </div>

        <form className="mt-8 grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">Dados da barbearia</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm text-slate-300">Nome da barbearia</span>
                <input
                  value={form.barbershopName}
                  onChange={(event) => setForm((current) => ({ ...current, barbershopName: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="Barbearia do João"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Slug público</span>
                <input
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="barbearia-do-joao"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Nome do dono</span>
                <input
                  value={form.ownerName}
                  onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="João Silva"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">E-mail</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="admin@barbeariadojoao.com"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Senha</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="********"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Telefone</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="(11) 99999-9999"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">WhatsApp</span>
                <input
                  value={form.whatsapp}
                  onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="(11) 99999-9999"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm text-slate-300">Cupom de revendedor <span className="text-slate-500">(opcional)</span></span>
                <input
                  value={form.couponCode}
                  onChange={(event) => setForm((current) => ({ ...current, couponCode: event.target.value.toUpperCase() }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="EX: JOAO-AB12"
                />
              </label>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
            <h2 className="text-lg font-semibold text-white">Resultado esperado</h2>
            <p className="text-sm leading-6 text-slate-400">
              Ao concluir o onboarding, a barbearia terá acesso ao painel e começará a usar o sistema
              com a sua própria marca.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Criando tenant..." : "Criar barbearia e acessar"}
            </button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-100">
              Esta etapa cria o tenant no banco, vincula o usuário dono e prepara o caminho para a
              autenticação real e proteção de rotas.
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
