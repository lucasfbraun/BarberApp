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
  title: "lbraunapp — Sistema de gestão para barbearias",
  description:
    "Agenda online, gestão de profissionais, controle de serviços e relatórios para barbearias.",
  // PWA: icone do iOS e nome ao adicionar a tela de inicio.
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "lbraunapp",
    statusBarStyle: "default",
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
