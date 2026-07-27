This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Documentação do projeto

- [`AUTH.md`](./AUTH.md) — login por senha e social (Google/Facebook), vinculação de contas
- [`PWA.md`](./PWA.md) — app instalável da área do cliente (service worker, cache, como testar)
- [`UPLOADS.md`](./UPLOADS.md) — upload de imagem, limites e quando migrar para storage
- [`SECURITY.md`](./SECURITY.md) — segredos, variáveis de ambiente e rotação de credenciais
- [`../pm/portal-do-profissional.md`](../pm/portal-do-profissional.md) — Portal do Profissional: decisões, mapa de entrega e pendências

## As três áreas do sistema

| Área | Rota | Quem usa | Tema |
|---|---|---|---|
| Painel | `/agenda`, `/caixa`, `/estoque`… | Dono, gerente, recepção | Escuro |
| Portal do Profissional | `/profissional` | Barbeiro (e dono que atende) | Claro, mobile-first |
| Área do cliente | `/cliente`, `/s/[slug]` | Cliente final | Claro, PWA instalável |
| Admin master | `/admin` | SUPERADMIN (dono do SaaS) | Escuro/âmbar |

O papel do usuário define para onde ele vai depois do login (`src/proxy.ts`).

### Criando o acesso de um barbeiro

O Portal do Profissional exige que o usuário esteja vinculado a um registro
`Professional`. Como fazer: **Painel → Profissionais → Detalhes → aba "Acesso
ao portal"** → informe e-mail e senha inicial. O que ele pode fazer lá dentro
se ajusta em **Painel → Permissões**.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
