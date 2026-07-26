"use client";
import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

/**
 * Botões de "Entrar com Google/Facebook" da área do cliente.
 *
 * Consulta /api/auth/providers e só mostra o que está realmente configurado
 * no servidor — sem as variáveis de ambiente do provedor, o componente não
 * renderiza nada. Ver AUTH.md.
 */

const LABELS: Record<string, string> = {
  google: "Continuar com Google",
  facebook: "Continuar com Facebook",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.89z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l3.99-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.28 6.63l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

export default function SocialLoginButtons({ callbackUrl }: { callbackUrl: string }) {
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;
    getProviders()
      .then((providers) => {
        if (!active) return;
        const available = Object.keys(providers ?? {}).filter((id) => id in LABELS);
        setIds(available);
      })
      .catch(() => setIds([]));
    return () => {
      active = false;
    };
  }, []);

  if (ids.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">ou</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-4 space-y-2.5">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            disabled={busy !== ""}
            onClick={() => {
              setBusy(id);
              signIn(id, { callbackUrl });
            }}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {id === "google" ? <GoogleIcon /> : <FacebookIcon />}
            {busy === id ? "Redirecionando..." : LABELS[id]}
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Usamos apenas seu nome e e-mail para criar a conta.
      </p>
    </div>
  );
}
