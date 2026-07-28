import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // `template` faz cada página virar "Agenda · BarvioApp" sem repetir o nome
  // em toda `metadata` local.
  title: {
    default: "BarvioApp — Gestão completa para barbearias",
    template: "%s · BarvioApp",
  },
  description:
    "Agenda online, comanda, estoque, comissão e app para o cliente. Gestão completa para barbearias.",
  applicationName: "BarvioApp",
  // PWA: icone do iOS e nome ao adicionar a tela de inicio.
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "BarvioApp",
    statusBarStyle: "default",
  },
  // Cartão ao compartilhar o link (WhatsApp, redes). Usa o lockup em PNG:
  // vários leitores de preview ainda não abrem WebP.
  openGraph: {
    type: "website",
    siteName: "BarvioApp",
    title: "BarvioApp — Gestão completa para barbearias",
    description:
      "Agenda online, comanda, estoque, comissão e app para o cliente.",
    locale: "pt_BR",
    images: [{ url: "/brand/barvioapp-lockup.png", width: 320, height: 230 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  // `cover` e o que faz `env(safe-area-inset-*)` valer no iPhone — sem isso a
  // barra inferior do cliente fica atras do indicador de home.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
