# Imagens e upload

## Decisao atual: sem storage de arquivos

O projeto **nao usa** S3, Vercel Blob nem Cloudinary. A imagem enviada pelo
painel e reduzida **no navegador** e gravada como **data URL** na propria
coluna do Postgres (`Barbershop.logoUrl`).

Por que assim, por enquanto:

- Nenhum servico novo para criar, pagar ou configurar.
- Funciona igual em `localhost` e na Vercel, sem token nem bucket.
- A logo e pequena. Reduzida para 256px em WebP, fica na casa das dezenas
  de KB — cabe numa coluna de texto sem doer.

O preco disso: a imagem **nao passa por CDN** e viaja junto de todo payload
que carrega a barbearia. E aceitavel para logo; **nao** escala para foto de
capa, galeria ou foto de produto.

## Onde esta implementado

| Arquivo | Papel |
|---|---|
| `src/lib/image-upload.ts` | Valida, redimensiona no canvas e gera a data URL. So client. |
| `src/components/ImageUploadField.tsx` | Campo do painel: upload, preview, remover e "ou colar uma URL". |
| `src/app/api/theme/route.ts` | `sanitizeImage()` — o servidor revalida antes de gravar. |
| `src/app/(panel)/configuracoes/page.tsx` | Usa o campo para a logo. |

Hoje **so a logo** tem upload. Capa, foto de profissional e imagem de
servico continuam sendo campo de URL.

## Limites

| Limite | Valor | Onde |
|---|---|---|
| Formatos | PNG, JPG, WebP | cliente e servidor |
| Arquivo de origem | 5 MB | `MAX_SOURCE_BYTES` |
| Lado maior apos reducao | 256 px | `LOGO_MAX_DIMENSION` |
| Data URL gravada | ~150 KB (cliente) / 200 KB (servidor) | `MAX_STORED_CHARS` / `MAX_IMAGE_CHARS` |

O cliente tenta qualidade 0.85, depois 0.70 e 0.55 antes de desistir. Se o
navegador nao suportar WebP, cai para PNG — mantendo a transparencia, que e o
que interessa numa logo.

**SVG e recusado de proposito.** Nao da para normalizar tamanho por canvas de
forma confiavel e e um formato que carrega marcacao arbitraria; para logo, o
PNG resolve.

O servidor **nao confia no cliente**: `sanitizeImage()` reaplica formato e
tamanho, e so aceita data URL de imagem ou URL `http(s)`/caminho absoluto.
Qualquer outra coisa volta 400 com o motivo, que o painel exibe.

## Detalhe de renderizacao

Onde o valor pode ser data URL, use `<img>` puro em vez de `next/image` — o
otimizador do Next nao lida com `data:`. Isso vale para o preview em
configuracoes e para o campo de upload.

## Quando migrar para storage de verdade

Sinais de que a decisao acima venceu:

- Aparecer upload de **capa**, galeria ou foto de produto.
- A tabela `Barbershop` comecar a pesar nas consultas.
- Precisar de variantes (thumbnail, retina) ou de cache de borda.

O caminho mais curto, ja que o deploy e na Vercel, e o **Vercel Blob**:

1. Criar o store no painel da Vercel e gerar `BLOB_READ_WRITE_TOKEN`.
2. `npm i @vercel/blob` e uma rota `POST /api/upload` que recebe o arquivo e
   devolve a URL publica.
3. Trocar o `resizeImageToDataUrl` do `ImageUploadField` por uma chamada a
   essa rota — o restante da interface nao muda, porque o componente ja
   emite "uma string que e a imagem".
4. Migrar os registros existentes: quem tiver `logoUrl` comecando com
   `data:` e reenviado para o Blob e a coluna passa a guardar a URL.

Como o contrato do componente e do banco e sempre "uma string", a migracao
nao exige mudanca de schema.
