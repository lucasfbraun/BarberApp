"use client";
import { useEffect } from "react";

/**
 * Registra o service worker (`public/sw.js`) — o que torna o app instalavel
 * e permite a tela offline. Nao renderiza nada.
 *
 * Detalhes:
 * - So registra em producao. Em `next dev` o SW atrapalharia o hot reload e
 *   serviria chunks antigos. Para testar o PWA local: `npm run build && npm start`.
 * - Quando uma versao nova do SW assume o controle, recarrega a pagina uma vez
 *   para evitar mistura de assets antigos e novos. O reload nao acontece na
 *   primeira instalacao (quando ainda nao havia controller).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    const onControllerChange = () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* falha no registro nao pode quebrar a pagina */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
