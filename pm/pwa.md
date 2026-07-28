# App Instalável (PWA) — Documentação

Data: 2026-07-26 · Arquivos: `src/app/manifest.ts`, `public/sw.js`, `public/offline.html`, `src/components/ServiceWorkerRegister.tsx`, `src/components/InstallPrompt.tsx` · Detalhe técnico: [`barbearia-web/PWA.md`](../barbearia-web/PWA.md)

## Conceito

A área do cliente (`/cliente`, `/s/[slug]`) pode ser **instalada como aplicativo** no celular: o cliente adiciona à tela inicial e passa a abrir em tela cheia, com ícone próprio, sem barra do navegador. Não há app nativo nem loja envolvida — é o próprio site, instalado pelo navegador.

Nenhuma dependência externa foi usada (sem `next-pwa`): são quatro arquivos versionados junto com o código.

## Por que o service worker é obrigatório

Além do cache, ele é **pré-requisito de instalabilidade**: o Chromium só dispara o evento `beforeinstallprompt` — o convite nativo de instalação — quando existe um service worker registrado com handler de `fetch`. Sem ele, o botão "Adicionar" nunca apareceria no Android; sobraria só o caminho manual do iOS.

## Estratégia de cache

| Rota | Estratégia | Motivo |
|---|---|---|
| `/api/*` | **nunca cacheia** | dados, sessão e autenticação precisam ser sempre frescos |
| Navegação (HTML) | network-first → cache → `/offline.html` | conteúdo novo com rede; algo útil sem ela |
| `/_next/static/*`, `/icons/*`, imagens, fontes | cache-first | arquivos com hash no nome, imutáveis |
| Demais `GET` same-origin | stale-while-revalidate | responde rápido e atualiza em segundo plano |

Nenhuma página renderiza dados do cliente no HTML (todas são client components que buscam pela API), então o HTML cacheado não guarda informação pessoal. **Ao criar página com dado sensível renderizado no servidor, incluir a rota na lista de exclusão do service worker.**

## Regras principais

1. **Registro só em produção** — em `next dev` o service worker serviria chunks antigos e atrapalharia o hot reload. Para testar: `npm run build && npm start`.
2. **Versionamento explícito** — `CACHE_VERSION` no topo de `public/sw.js` nomeia os caches; ao mudar as regras, incrementar. O `activate` apaga todo cache com nome diferente do par atual.
3. **Recarga controlada** — quando uma versão nova do SW assume, a página recarrega **uma vez** para não misturar assets antigos e novos. Não recarrega na primeira instalação.
4. **Convite não insiste** — o `InstallPrompt` se esconde quando o app já está instalado e, se dispensado, só volta depois de 14 dias (`localStorage`).

## Onde o convite aparece

`/cliente`, `/cliente/agendamentos` e `/s/[slug]` — esta última costuma ser a primeira tela de quem chega pelo link da barbearia. Fica fora de login, cadastro e do fluxo de agendamento, para não competir com a ação principal.

## Identidade visual

Ícones em `public/icons/`: `icon-192`, `icon-512`, `icon-maskable-512` (fundo cheio com safe zone, para os recortes do Android) e `apple-touch-icon`. O manifesto usa `id: "/cliente"` fixo, `start_url: /cliente` e `scope: "/"` — escopo na raiz para que a página da barbearia continue dentro do app depois de instalado.

O `viewportFit: "cover"` no layout raiz é o que faz `env(safe-area-inset-bottom)` valer no iPhone, mantendo a barra inferior acima do indicador de home.

## Limitações conhecidas

- **Sem push notifications** — lembretes de agendamento continuam dependendo de WhatsApp/e-mail (ainda não implementados).
- **Sem sincronização offline** — sem rede o cliente lê o que já visitou, mas não agenda nem cancela; as rotas `/api` exigem conexão.
- **Ícone é do BarvioApp, não da barbearia** — o manifesto é único para o sistema. Personalizar por tenant exigiria manifesto dinâmico por slug.
- **Escopo na raiz** — o painel da barbearia e o admin também abrem em modo standalone se acessados pelo app instalado. É intencional, mas essas telas não foram desenhadas para isso.
- **iOS** — cada navegador tem seu armazenamento; instalar pelo Safari não aproveita nada do Chrome.

## Pendências / próximos passos sugeridos

- Testar a instalação em device real (Android e iPhone) — o checklist de DevTools está no doc técnico.
- Push notification para lembrete de horário, quando houver o épico de notificações.
