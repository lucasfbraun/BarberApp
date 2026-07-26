# Identidade Visual da Área do Cliente — Documentação

Data: 2026-07-26 · Vocabulário: `src/lib/ui.ts` · Telas: `/cliente`, `/cliente/login`, `/cliente/cadastro`, `/cliente/agendamentos`, `/s/[slug]`, `/s/[slug]/agendar`

## Motivo

A primeira versão da jornada do cliente ficou **próxima demais do AppBarber** — fundo claro azulado, cartões arredondados com sombra, avatares redondos em fila, horários em pílulas. O fluxo de agendar em especial foi construído a partir de um print daquele app, então herdou a estrutura inteira.

A decisão foi diferenciar pela **estrutura**, não só pela paleta: trocar cor mantendo os mesmos componentes não resolveria a semelhança.

## Direção: editorial azul

A diferenciação vem da **estrutura**, não da paleta — por isso o azul da marca foi mantido. Trocar de cor não resolveria a semelhança, e tirar o azul deixaria a barra inferior (que continuou como estava) órfã dentro de telas cinzas.

| Princípio | Como se aplica |
|---|---|
| Estrutura por linha, não por cartão | Listas com divisória de 1px; nada de `rounded-3xl` + `shadow` |
| Sem sombra | Nenhuma `shadow-*` na área do cliente |
| Cantos retos | Botões, campos e blocos sem arredondamento; pílulas foram eliminadas |
| Azul é a marca | `blue-600` (#2563eb) — o mesmo do manifesto do PWA e da barra inferior, para o app instalado ficar coerente de ponta a ponta |
| Cinza frio | Família `slate`, puxada para o azul; fundo das telas em `slate-50` |
| Azul carrega ação e seleção | Botão principal, aba ativa, dia e horário escolhidos, foco de campo, barra dos avisos |
| Cor só com significado | Verde/vermelho/âmbar aparecem apenas em status de agendamento e erro |
| Hierarquia tipográfica | Rótulo minúsculo em caixa alta com tracking largo + título grande com tracking apertado |

## Mudanças estruturais (o que mais afasta da referência)

| Componente | Antes | Agora |
|---|---|---|
| Faixa de dias | Círculos numerados em linha | Blocos retangulares encostados, sigla do dia em cima e número grande embaixo; escolhido preenche de azul |
| Escolha do profissional | Avatares redondos em fila horizontal | Grade de retratos 3:4 em preto e branco, ganhando cor e moldura ao serem escolhidos |
| Horários | Grade solta de pílulas | Agrupados por **Manhã / Tarde / Noite** em blocos retos |
| Cabeçalho do agendar | Botões redondos + título centralizado | Link de voltar em texto + título grande na página |
| Resumo da reserva | Cartão com linhas | Data e hora em tipografia grande + lista de divisórias |
| Lista de barbearias | Cartões com sombra e avatar redondo | Linhas com divisória e marca quadrada |
| Meus agendamentos | Cartão com etiqueta colorida | Coluna de data (dia grande + mês) à esquerda, status como texto |
| Abas da barbearia | Pílulas coloridas | Texto com sublinhado na aba ativa |
| Botão do carrinho | Círculo flutuante com emoji | Retângulo preto "Reservas" com contador |
| Campos de formulário | Caixa arredondada com fundo cinza | Linha inferior apenas, escurecendo no foco |

## O que NÃO mudou

- **A barra de navegação inferior** (`ClienteBottomNav`) — pedido explícito do usuário.
- O painel da barbearia e o admin, que seguem no tema escuro com ciano.
- Qualquer regra de negócio: a mudança é só de apresentação.

## Onde mexer

`src/lib/ui.ts` concentra o vocabulário (`ACCENT_TEXT`, `ACCENT_BORDER`, `PAGE`, `LABEL`, `TITLE`, `HEADING`, `MUTED`, `RULE`, `BUTTON`, `BUTTON_GHOST`, `INPUT`, `TILE`, `TILE_ON`, `TILE_OFF`, `NOTICE`, `STATUS_TONE`). Ajustar a linguagem é editar esse arquivo, não as seis telas.

Para trocar o tom do azul, mexer em `ACCENT_TEXT`/`ACCENT_BORDER` e nas classes `blue-600` de `BUTTON`, `TILE_ON` e `INPUT`. Se mudar, atualizar junto o `theme_color` do `src/app/manifest.ts` e o `viewport.themeColor` do layout raiz — são a mesma cor.

Ao criar tela nova na área do cliente, importar de lá em vez de escrever classes soltas — é o que mantém a coerência.

## Pendências / próximos passos sugeridos

- Rodar em device real: a grade de retratos e a faixa de dias precisam de conferência de toque no celular.
- Avaliar se o preto e branco nas fotos dos profissionais agrada as barbearias — é o ponto mais opinativo da direção e sai com uma classe só (`grayscale`).
- A landing page (`/`) e o cadastro de barbearia seguem no visual antigo; se a marca for unificada, entram numa próxima passada.
