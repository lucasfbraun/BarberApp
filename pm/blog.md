# Blog na landing page

**Implementado · 28/07/2026** · Sprint 30

> **Status: entregue.** Dois posts publicados na migration. Falta apenas
> configurar `BLOG_API_TOKEN` para o n8n começar a publicar.
>
> | Entregue | Onde |
> |---|---|
> | Model `Post` + migration com 2 posts | `prisma/migrations/20260728000001_blog/` |
> | Renderizador de markdown seguro | `lib/markdown.ts` |
> | Teste do renderizador (15 vetores de XSS) | `scripts/test-markdown.mjs` |
> | Listagem, post e tag | `/blog`, `/blog/[slug]`, `/blog/tag/[tag]` |
> | API pública e do n8n | `GET`/`POST /api/blog`, `PATCH`/`DELETE /api/blog/[id]` |
> | Revisão e publicação | `/admin/blog` |
> | SEO | `sitemap.ts`, `robots.ts`, `/blog/rss.xml`, JSON-LD, Open Graph |
> | Link na landing | menu e rodapé |

Objetivo duplo: atrair barbearias por busca orgânica (o custo de aquisição de um SaaS pequeno é o maior obstáculo) e servir de destino para uma automação de conteúdo no **n8n**.

---

## Decisão: posts no banco, com API

Os posts ficam em tabela do Postgres, publicados por uma **API autenticada por token**. Foi a escolha justamente por causa do n8n.

As alternativas e por que não:

| Opção | Por que não |
|---|---|
| Markdown no repositório | O n8n teria que abrir commit ou PR no GitHub, e **cada post exigiria um deploy**. Automação que depende de build é automação frágil |
| CMS externo (Notion, Sanity) | Boa escrita, mas adiciona serviço de terceiro, custo e mais um lugar para a coisa quebrar. Vai contra a regra de usar só a stack atual |
| Banco + API | O n8n faz um POST e acabou. Permite rascunho, agendamento, edição pelo painel e revisão antes de publicar |

---

## Modelo previsto

```prisma
model Post {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  excerpt     String?
  content     String     // markdown
  coverUrl    String?
  tags        String[]
  status      PostStatus @default(DRAFT)   // DRAFT, SCHEDULED, PUBLISHED
  publishedAt DateTime?
  authorName  String     @default("Equipe BarvioApp")
  /// Marca posts vindos da automação, para revisão e para medir o que rende.
  source      String     @default("manual") // "manual" | "n8n"
  seoTitle    String?
  seoDescription String?
  views       Int        @default(0)
  ...
  @@index([status, publishedAt])
}
```

---

## Rotas

| Rota | Função |
|---|---|
| `/blog` | Lista dos publicados, com paginação e filtro por tag |
| `/blog/[slug]` | Post, renderizado a partir do markdown |
| `/blog/tag/[tag]` | Posts de uma tag |
| `GET /api/blog` | Listagem pública |
| `POST /api/blog` | **Publicação pelo n8n**, protegida por token |
| `PATCH /api/blog/[id]` | Edição — admin master ou token |
| `/admin/blog` | Tela do admin: revisar, editar, publicar, despublicar |

### Como o n8n publica

```
POST /api/blog
Authorization: Bearer <BLOG_API_TOKEN>

{
  "title":    "Como organizar a agenda da sua barbearia",
  "content":  "## Introdução\n...",
  "excerpt":  "Três hábitos que reduzem o buraco entre atendimentos.",
  "tags":     ["gestão", "agenda"],
  "coverUrl": "https://...",
  "status":   "DRAFT",
  "publishAt": "2026-08-05T09:00:00Z"
}
```

**O padrão é `DRAFT`, de propósito.** Texto gerado por automação entrando direto no ar, com o nome da empresa assinando, é como se publica um erro factual ou uma frase sem sentido para o mundo inteiro ver. O fluxo previsto é: n8n cria rascunho → você revisa em `/admin/blog` → publica. Quem quiser correr o risco muda o padrão depois, sabendo o que está fazendo.

---

## Segurança

O `POST /api/blog` é uma rota que **escreve conteúdo público**. Três cuidados:

1. **Token dedicado** (`BLOG_API_TOKEN`), não o `NEXTAUTH_SECRET`. Vazou, revoga só ele.
2. **Comparação em tempo constante** no token, e rate limit por IP.
3. **Sanitizar o markdown na renderização.** Markdown aceita HTML embutido — sem sanitização, um post com `<script>` vira XSS na landing. Renderizar sem `dangerouslySetInnerHTML` cru, ou passar por sanitizador.

O terceiro é o mais importante: é conteúdo que chega por API, potencialmente de um fluxo automatizado que consome texto de fora.

---

## SEO

O blog só faz sentido se for encontrado. O mínimo:

- `generateMetadata` por post, com título, descrição e Open Graph próprios
- `sitemap.xml` incluindo os posts publicados
- `robots.txt`
- JSON-LD de `Article`
- Feed RSS
- URLs limpas em `/blog/[slug]`, sem data no caminho

O projeto já tem `manifest.ts`; `sitemap.ts` e `robots.ts` seguem o mesmo padrão do App Router.

---

## Critérios de aceite

- [ ] `/blog` lista os publicados, com paginação
- [ ] `/blog/[slug]` renderiza markdown com metadata e Open Graph próprios
- [ ] Post agendado só aparece depois da data
- [ ] `POST /api/blog` cria rascunho com token válido e recusa sem ele
- [ ] Markdown com HTML malicioso não executa
- [ ] `sitemap.xml` inclui os posts
- [ ] `/admin/blog` permite revisar, editar e publicar
- [ ] O blog não interfere no desempenho da landing (posts não bloqueiam o render da home)

---

## Fora desta sprint

Comentários, newsletter, autores múltiplos, busca dentro do blog, tradução. E o **fluxo do n8n em si** — a sprint entrega a porta de entrada; o que passa por ela é configuração sua, do lado de lá.
