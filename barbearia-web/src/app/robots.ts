import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/mailer";

/**
 * robots.txt.
 *
 * As áreas logadas ficam fora do índice. Não é segurança — quem quiser
 * acessar não lê robots.txt — mas evita que o buscador gaste rastreamento em
 * páginas que só devolvem redirecionamento para o login, e que URLs internas
 * apareçam em resultado de busca.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/agenda",
        "/caixa",
        "/clientes",
        "/comanda",
        "/configuracoes",
        "/estoque",
        "/permissoes",
        "/profissionais",
        "/profissional",
        "/relatorio",
        "/servicos",
        "/cliente/",
        "/redefinir-senha",
        "/trial-expirado",
      ],
    },
    sitemap: appUrl("/sitemap.xml"),
  };
}
