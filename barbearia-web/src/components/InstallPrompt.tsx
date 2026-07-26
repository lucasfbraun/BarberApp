"use client";
import { useEffect, useState } from "react";

/**
 * Sugere adicionar o app à tela inicial.
 * - Android/Chrome: captura o evento `beforeinstallprompt` e dispara o
 *   prompt nativo de instalação ao tocar em "Adicionar".
 * - iOS/Safari: não existe prompt nativo — mostra o passo a passo
 *   (Compartilhar → Adicionar à Tela de Início).
 * - Não aparece se já estiver instalado (modo standalone) e, se dispensado,
 *   só volta a aparecer depois de 14 dias.
 */

const DISMISS_KEY = "lb_install_dismissed_at";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function recentlyDismissed(): boolean {
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    return Date.now() - Number(at) < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

export default function InstallPrompt({
  /* Distância do rodapé. Padrão assume a barra inferior do cliente;
     telas com botão flutuante (ex.: carrinho em /s/[slug]) usam um valor maior. */
  bottomClass = "bottom-16",
}: { bottomClass?: string } = {}) {
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    if (isIos()) {
      // Pequeno atraso para não competir com o carregamento da página.
      const t = setTimeout(() => setMode("ios"), 1500);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setMode("hidden");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setMode("hidden");
    else dismiss();
    setDeferred(null);
  }

  if (mode === "hidden") return null;

  return (
    <div className={`fixed inset-x-0 ${bottomClass} z-40 px-5 pb-2`}>
      <div className="mx-auto max-w-lg border border-blue-600 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Instalar
            </p>
            <p className="mt-1.5 text-base font-medium tracking-tight text-slate-900">
              Adicione à tela inicial
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Acesse suas barbearias com um toque, como um app.
            </p>
          </div>
          <button onClick={dismiss} aria-label="Fechar" className="shrink-0 text-slate-400 hover:text-slate-900">
            ✕
          </button>
        </div>

        {mode === "ios" && showIosSteps && (
          <ol className="mt-4 space-y-1.5 border-l-2 border-blue-600 pl-4 text-sm text-slate-500">
            <li>1. Toque em <span className="text-slate-900">Compartilhar</span> <span aria-hidden>⎋</span> na barra do Safari</li>
            <li>2. Role e toque em <span className="text-slate-900">Adicionar à Tela de Início</span></li>
            <li>3. Confirme em <span className="text-slate-900">Adicionar</span></li>
          </ol>
        )}

        <div className="mt-5 flex items-center gap-5">
          {mode === "android" ? (
            <button onClick={install} className="bg-blue-600 px-5 py-3 text-sm font-medium tracking-wide text-white transition hover:bg-blue-500">
              Adicionar
            </button>
          ) : (
            <button onClick={() => setShowIosSteps(!showIosSteps)} className="bg-blue-600 px-5 py-3 text-sm font-medium tracking-wide text-white transition hover:bg-blue-500">
              {showIosSteps ? "Entendi" : "Ver como fazer"}
            </button>
          )}
          <button onClick={dismiss} className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-900">
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
