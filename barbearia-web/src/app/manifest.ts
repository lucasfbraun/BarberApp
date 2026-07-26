import type { MetadataRoute } from "next";

/* Web App Manifest — permite instalar a área do cliente como app
   (Android: prompt nativo; iOS: Compartilhar > Adicionar à Tela de Início). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "lbraunapp — Agende sua barbearia",
    short_name: "lbraunapp",
    description: "Encontre barbearias, agende horários e reserve produtos.",
    start_url: "/cliente",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
