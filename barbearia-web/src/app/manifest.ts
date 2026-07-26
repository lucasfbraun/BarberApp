import type { MetadataRoute } from "next";

/* Web App Manifest — permite instalar a área do cliente como app
   (Android: prompt nativo; iOS: Compartilhar > Adicionar à Tela de Início).
   Servido pelo Next em /manifest.webmanifest. Ver PWA.md. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` fixa a identidade do app: mudar start_url no futuro não cria
    // uma instalação duplicada no dispositivo do cliente.
    id: "/cliente",
    name: "lbraunapp — Agende sua barbearia",
    short_name: "lbraunapp",
    description: "Encontre barbearias, agende horários e reserve produtos.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/cliente",
    // Escopo na raiz para que a página pública da barbearia (/s/[slug])
    // continue dentro do app depois de instalado.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5f9",
    theme_color: "#2563eb",
    categories: ["lifestyle", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Versão com fundo cheio e safe zone, para os recortes do Android.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
