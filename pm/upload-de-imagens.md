# Upload de Imagens no Painel — Documentação

Data: 2026-07-26 · Páginas: `/configuracoes` · Arquivos: `src/lib/image-upload.ts`, `src/components/ImageUploadField.tsx`, `src/app/api/theme/route.ts` · Detalhe técnico: [`barbearia-web/UPLOADS.md`](../barbearia-web/UPLOADS.md)

## Conceito

A **logo da barbearia** passou a aceitar upload de arquivo, além do campo de URL que já existia. O campo antigo continua disponível, recolhido atrás de "ou colar uma URL", para quem já hospeda a arte em outro lugar — e para não quebrar as barbearias que já preencheram URL.

## Decisão de armazenamento: sem storage de arquivos

O projeto **não usa** S3, Vercel Blob nem Cloudinary. A imagem é reduzida **no navegador** e gravada como **data URL** na própria coluna `Barbershop.logoUrl`.

Por quê, por enquanto:

- Nenhum serviço novo para criar, pagar ou configurar.
- Funciona igual em `localhost` e na Vercel, sem token nem bucket.
- A logo é pequena: reduzida para 256px em WebP, fica na casa das dezenas de KB.

O preço: a imagem **não passa por CDN** e viaja junto de todo payload que carrega a barbearia. Aceitável para logo; **não escala** para capa, galeria ou foto de produto.

## Limites

| Limite | Valor |
|---|---|
| Formatos | PNG, JPG, WebP (SVG recusado de propósito) |
| Arquivo de origem | 8 MB |
| Resolução de origem | 8000 px de lado |
| Lado maior após redução | 256 px |
| Data URL gravada | ~150 KB (cliente) / 200 KB (servidor) |

O limite de origem é só a porta de entrada: **não muda o que vai para o banco**, porque a imagem é reduzida para 256px de qualquer forma. Para gravar uma logo mais nítida, o que muda é `LOGO_MAX_DIMENSION`.

O teto de resolução existe porque o canvas consome ~4 bytes por pixel ao decodificar — uma foto de 12000×8000 derrubaria a aba num celular fraco.

## Regras principais

1. **O servidor não confia no cliente** — `sanitizeImage()` no `/api/theme` reaplica formato e tamanho, aceitando só data URL de imagem ou URL `http(s)`/caminho absoluto. Qualquer outra coisa volta 400 com o motivo, exibido na tela.
2. **SVG é recusado** — não dá para normalizar tamanho por canvas de forma confiável e é formato que carrega marcação arbitrária.
3. **`<img>` puro onde o valor pode ser data URL** — o otimizador do `next/image` não lida com `data:`.

## Onde a logo aparece hoje

| Tela | Mostra a logo? |
|---|---|
| `/s/[slug]` — página pública da barbearia | ✅ no cabeçalho |
| `/cliente` — home (estabelecimentos, últimos acessos, busca, próximo agendamento) | ✅ via `ShopAvatar`, cada barbearia com a sua |
| `/configuracoes` — preview ao vivo | ✅ |
| `/cliente/agendamentos` | ❌ a API já manda o `logoUrl`, a tela não usa |
| `/s/[slug]/agendar` | ❌ nenhuma etapa mostra a marca |
| Painel da barbearia (barra lateral) | ❌ mostra "lbraunapp / Painel" fixo |

Sem logo salva, o `ShopAvatar` cai no círculo com a inicial do nome.

## Pendências / próximos passos sugeridos

- Upload para **capa**, **foto de profissional** e **imagem de serviço** — hoje ainda são campo de URL. Capa e foto de profissional pedem storage de verdade, não data URL.
- Preencher as três telas que não mostram a logo.
- Migrar para **Vercel Blob** quando aparecer upload de capa ou galeria, ou quando a tabela `Barbershop` começar a pesar nas consultas. Como o contrato do componente e da coluna é sempre "uma string", a migração não exige mudança de schema — o caminho está descrito no doc técnico.
