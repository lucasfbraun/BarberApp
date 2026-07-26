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

export default function InstallPrompt() {
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
    <div className="fixed inset-x-0 bottom-16 z-40 px-4 pb-2">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            lb
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Adicione à tela inicial</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Acesse suas barbearias com um toque, como um app.
            </p>

            {mode === "ios" && showIosSteps && (
              <ol className="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <li>1. Toque em <span className="font-semibold">Compartilhar</span> <span aria-hidden>⎋</span> na barra do Safari</li>
                <li>2. Role e toque em <span className="font-semibold">Adicionar à Tela de Início</span></li>
                <li>3. Confirme em <span className="font-semibold">Adicionar</span></li>
              </ol>
            )}

            <div className="mt-2.5 flex gap-2">
              {mode === "android" ? (
                <button onClick={install}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500">
                  Adicionar
                </button>
              ) : (
                <button onClick={() => setShowIosSteps(!showIosSteps)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500">
                  {showIosSteps ? "Entendi" : "Ver como fazer"}
                </button>
              )}
              <button onClick={dismiss} className="rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-slate-700">
                Agora não
              </button>
            </div>
          </div>
          <button onClick={dismiss} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      </div>
    </div>
  );
}
