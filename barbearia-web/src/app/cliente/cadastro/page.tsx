"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

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
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Criar <span className="text-blue-600">sua conta</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Agende horários e acompanhe tudo em um só lugar.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Seu nome" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400" />
            <input required type="email" placeholder="E-mail" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400" />
            <input placeholder="Telefone / WhatsApp" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400" />
            <input required type="password" minLength={8} placeholder="Senha (mín. 8 caracteres)" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400" />

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
            )}

            <button type="submit" disabled={submitting}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
              {submitting ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href={`/cliente/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          <Link href="/cliente" className="hover:underline">← Voltar para o início</Link>
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
