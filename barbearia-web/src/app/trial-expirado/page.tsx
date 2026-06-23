import Link from "next/link";

export default function TrialExpiradoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/10 text-3xl">
          ⏰
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">Seu período de teste encerrou</h1>
        <p className="mt-3 text-slate-400">
          Os 30 dias de teste gratuito do lbraunapp chegaram ao fim.
          Para continuar usando o sistema, escolha um plano.
        </p>
        <div className="mt-8 space-y-3">
          <Link
            href="/#planos"
            className="block rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Ver planos e assinar
          </Link>
          <Link
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white transition hover:bg-white/10"
          >
            Falar com suporte via WhatsApp
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-600">
          Já assinou?{" "}
          <Link href="/api/auth/signout" className="text-cyan-400 hover:underline">
            Saia e entre novamente
          </Link>{" "}
          para atualizar seu acesso.
        </p>
      </div>
    </div>
  );
}
