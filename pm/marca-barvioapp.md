# Marca BarvioApp

**28/07/2026** · substitui o nome provisório `lbraunapp`

---

## Arquivos

| Arquivo | Uso |
|---|---|
| `public/brand/barvioapp-lockup.webp` | Lockup completo, **fundo transparente**. Só em fundo escuro |
| `public/brand/barvioapp-lockup.png` | Mesmo lockup, opaco. Fallback do `<img>` |
| `public/brand/barvioapp-og.png` | Cartão de compartilhamento, 1200×630, **opaco** |
| `public/brand/barvioapp-tile.webp` | Símbolo sobre azulejo escuro arredondado. Para telas claras |
| `public/icons/icon-192 · icon-512 · icon-maskable-512 · apple-touch-icon` | PWA |
| `src/app/favicon.ico` | 16, 32 e 48 px, PNG **RGBA** dentro do ICO |

### Duas armadilhas que já custaram um build

**O ICO precisa ser RGBA.** Gerei primeiro a partir de uma imagem RGB, e o Turbopack quebrou o build inteiro com `The PNG is not in RGBA format!`. O decodificador dele (crate `image` do Rust) recusa PNG sem canal alfa dentro de um ICO. O `src/app/favicon.ico` é o **único** arquivo de imagem que o Next processa — os de `public/` são servidos crus e podem ser RGB à vontade.

**A imagem de Open Graph precisa ser opaca.** WhatsApp e redes sociais compõem o preview sobre fundo branco. Com PNG transparente, o wordmark branco desapareceria e sobraria só o símbolo. Por isso a `-og.png` tem o fundo da marca embutido — e é a única do conjunto que não é transparente por escolha.

O original enviado (1536×1024) não foi versionado — os derivados saem dele. **Guarde o arquivo-fonte fora do repositório**, é dele que sai qualquer variante futura.

---

## Como aplicar

Sempre pelo componente `src/components/Logo.tsx`, nunca com `<img>` solto:

```tsx
<Logo size="lg" />                    // fundo escuro: lockup completo
<Logo variant="light" size="sm" />    // fundo claro: azulejo + nome em texto
<LogoLink size="sm" />                // igual, mas leva à home
```

Tamanhos: `sm` (cabeçalhos e barras), `md` (padrão), `lg` (telas de acesso).

---

## Por que duas variantes

O logo foi desenhado sobre fundo escuro, com sombreado 3D e brilho. Em fundo claro o "B" branco e o wordmark somem.

Tentei extrair uma versão clara por código — recolorindo o que é neutro e removendo o fundo. **Não funcionou**: a peça tem sombra difusa embutida, que vira halo cinza ao redor, e o volume 3D perde sentido quando invertido.

A solução foi tratar as telas claras de outro jeito: o símbolo entra num **azulejo escuro arredondado**, como ícone de aplicativo, e o nome é renderizado em **texto** (`Barvio` em `slate-900` + `App` em `blue-600`). Parece proposital em vez de improvisado, fica nítido em qualquer tamanho, e o leitor de tela lê "Barvio App" sem depender de `alt`.

**Se um dia você gerar uma versão clara do logo no mesmo lugar onde criou este**, ela fica melhor que qualquer coisa extraída por código — é só trocar o `variant="light"` do componente para usá-la.

---

## Detalhes que já foram tratados

- **`CACHE_VERSION` do service worker subiu para `v2`.** Sem isso, quem já tem o PWA instalado continuaria vendo o ícone antigo: o `activate` só apaga caches cujo nome não bate com o atual.
- **`background_color` do manifest** virou `#0a0f1e`, o azul quase preto da marca — a tela de abertura do app não pisca branco.
- **WebP como formato principal.** O lockup em PNG tem 190 KB por causa do gradiente; em WebP, 15 KB. O PNG ficou só como fallback reduzido e para o Open Graph.
- **Painel lateral do `/login`** mostrava "Sprint 1 — Autenticação em construção", texto de desenvolvimento visível para quem entrava. Substituído pela marca e pelo que o sistema faz hoje.

---

## Pendências

1. **`public/brand/barvioapp-marca.png` ficou como arquivo vazio de 1×1** — era o símbolo isolado, usado só para montar o azulejo, e não consegui apagá-lo daqui. **Delete manualmente.**
2. **Domínio.** O remetente dos e-mails virou `nao-responda@barvioapp.com.br` como padrão. O domínio precisa existir e estar verificado no provedor, senão o envio é recusado. Configure `MAIL_FROM` com um endereço real.
3. **Nome do repositório** ainda é `BarberApp` no GitHub — só cosmético, mas vale alinhar.
4. **Favicon em `src/app/favicon.ico`** é o caminho do App Router. Se sobrar um `public/favicon.ico` antigo, ele tem precedência — confira depois do deploy.
