# PWA — area do cliente

A area do cliente (`/cliente`, `/s/[slug]`) e instalavel como aplicativo:
o cliente adiciona o lbraunapp a tela inicial do celular e passa a abrir em
tela cheia, sem barra do navegador, com icone proprio.

Nao ha app nativo nem loja envolvida — e o proprio site, instalado pelo
navegador. Nenhuma dependencia externa foi usada (sem `next-pwa`): sao
quatro arquivos simples, versionados junto com o codigo.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/app/manifest.ts` | Manifesto (nome, icones, cores, `start_url`). O Next publica em `/manifest.webmanifest`. |
| `public/sw.js` | Service worker: handler de `fetch`, caches e fallback offline. |
| `src/components/ServiceWorkerRegister.tsx` | Registra o SW no navegador. Montado no `layout.tsx` raiz. |
| `public/offline.html` | Tela mostrada quando nao ha rede nem versao em cache. |
| `src/components/InstallPrompt.tsx` | Convite "Adicione a tela inicial". |
| `public/icons/` | `icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon`. |

Metadados complementares ficam em `src/app/layout.tsx`: `appleWebApp`
(nome e barra de status no iOS), `themeColor` e `viewportFit: "cover"`
— este ultimo e o que faz `env(safe-area-inset-bottom)` valer no iPhone,
mantendo a barra inferior acima do indicador de home.

## Por que o service worker e obrigatorio

Alem do cache, ele e **pre-requisito de instalabilidade**: o Chromium so
dispara o evento `beforeinstallprompt` — o convite nativo de instalacao —
quando existe um service worker registrado com handler de `fetch`. Sem
`public/sw.js`, o botao "Adicionar" do `InstallPrompt` nunca apareceria no
Android; so restaria o caminho manual do iOS.

## Estrategia de cache

Definida em `public/sw.js`. So requisicoes `GET` de mesma origem entram no
fluxo; qualquer outra coisa passa direto para a rede.

| Rota | Estrategia | Motivo |
|---|---|---|
| `/api/*` | **nunca cacheia** | dados, sessao e autenticacao precisam ser sempre frescos |
| Navegacao (HTML) | network-first → cache → `/offline.html` | conteudo novo quando ha rede; algo util quando nao ha |
| `/_next/static/*`, `/icons/*`, imagens, fontes | cache-first | arquivos com hash no nome, imutaveis |
| Demais `GET` same-origin | stale-while-revalidate | responde rapido e atualiza em segundo plano |

Nenhuma pagina do app renderiza dados do cliente no HTML — todas sao client
components que buscam pela API — entao o HTML cacheado nao guarda informacao
pessoal. **Ao criar paginas com dados sensiveis renderizados no servidor,
adicione a rota a lista de exclusao no `fetch` do SW.**

## Ciclo de vida e versionamento

- `CACHE_VERSION` no topo de `public/sw.js` nomeia os caches
  (`lb-static-v1`, `lb-runtime-v1`).
- **Ao alterar as regras do SW, incremente `CACHE_VERSION`.** No `activate`,
  todo cache com nome diferente do par atual e apagado.
- O SW usa `skipWaiting()` + `clients.claim()`: a versao nova assume assim
  que baixa. Para nao misturar assets antigos e novos, o
  `ServiceWorkerRegister` recarrega a pagina **uma vez** quando um novo SW
  assume o controle — e nao recarrega na primeira instalacao, quando ainda
  nao havia controller.

## Desenvolvimento e testes

O SW **so e registrado em producao** (`process.env.NODE_ENV === "production"`).
Em `next dev` ele serviria chunks antigos e atrapalharia o hot reload.

Para testar o PWA localmente:

```bash
npm run build && npm start
# abra http://localhost:3000/cliente
```

Checklist no Chrome (DevTools):

1. **Application → Manifest** — sem erros; icones e `id` carregados.
2. **Application → Service Workers** — `sw.js` "activated and is running".
3. **Application → Cache Storage** — caches `lb-static-v1` e `lb-runtime-v1`.
4. **Lighthouse → Installability** — deve passar.
5. **Network → Offline**, recarregue: pagina ja visitada abre do cache;
   rota nova mostra `/offline.html`.
6. Icone de instalar na barra de endereco (desktop) ou banner do
   `InstallPrompt` (Android).

No iPhone nao existe prompt nativo: o `InstallPrompt` mostra o passo a passo
(Compartilhar → Adicionar a Tela de Inicio). Teste no **Safari** — outros
navegadores no iOS nao instalam.

> Instalacao exige HTTPS. Funciona em `localhost` e em producao (Vercel);
> nao funciona abrindo por IP da rede local sem certificado.

## Onde o convite de instalacao aparece

`InstallPrompt` esta em `/cliente`, `/cliente/agendamentos` e `/s/[slug]`
(esta ultima costuma ser a primeira tela de quem chega pelo link da
barbearia). Fica de fora das telas de login, cadastro e do fluxo de
agendamento, para nao competir com a acao principal.

O componente se esconde sozinho quando o app ja esta instalado (`display-mode:
standalone`) e, se dispensado, so volta depois de 14 dias — controle guardado
em `localStorage` (`lb_install_dismissed_at`). A prop `bottomClass` ajusta a
altura em telas com botao flutuante.

## Limitacoes conhecidas

- **Sem push notifications.** Lembretes de agendamento continuam dependendo
  de WhatsApp/e-mail (ainda nao implementados).
- **Sem sincronizacao offline.** Sem rede o cliente le o que ja visitou, mas
  nao consegue agendar nem cancelar — as rotas `/api` exigem conexao.
- **Escopo na raiz (`/`).** O painel da barbearia e o admin tambem abrem em
  modo standalone se acessados pelo app instalado. E intencional (para manter
  `/s/[slug]` dentro do app), mas essas telas nao foram desenhadas para isso.
- **iOS.** Cada navegador tem seu proprio armazenamento; instalar pelo Safari
  nao aproveita nada do Chrome, e vice-versa.
