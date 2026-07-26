"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import { BUTTON, INPUT, LABEL, MUTED, TITLE } from "@/lib/ui";

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/cliente";

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/cliente/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      setError((await res.json()).error ?? "Erro ao criar conta.");
      setSubmitting(false);
      return;
    }

    // Login automático após o cadastro.
    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      router.push(`/cliente/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    router.push(callbackUrl);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12">
        <p className={LABEL}>Cliente</p>
        <h1 className={`${TITLE} mt-3`}>Criar sua conta</h1>
        <p className={`${MUTED} mt-2`}>Agende horários e acompanhe tudo em um só lugar.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <input required placeholder="Seu nome" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={INPUT} />
          <input required type="email" placeholder="E-mail" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={INPUT} />
          <input placeholder="Telefone / WhatsApp" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={INPUT} />
          <input required type="password" minLength={8} placeholder="Senha (mín. 8 caracteres)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={INPUT} />

          {error && (
            <p className="border-l-2 border-red-600 py-1 pl-4 text-sm text-red-600">{error}</p>
          )}

          <button type="submit" disabled={submitting} className={BUTTON}>
            {submitting ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        {/* No social, criar conta e entrar são a mesma ação. */}
        <SocialLoginButtons callbackUrl={callbackUrl} />

        <p className={`${MUTED} mt-10 text-center`}>
          Já tem conta?{" "}
          <Link href={`/cliente/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-slate-900 underline underline-offset-4">
            Entrar
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-slate-400">
          <Link href="/cliente" className="hover:text-slate-900">← Voltar para o início</Link>
        </p>
      </div>
    </div>
  );
}

export default function ClienteCadastroPage() {
  return (
    <Suspense>
      <CadastroForm />
    </Suspense>
  );
}
