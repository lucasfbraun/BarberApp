# Módulo de Estoque — Documentação

Data: 2026-07-26 · Página: `/estoque` · APIs: `/api/produtos`, `/api/estoque/*`

## O que o módulo cobre

- **Saldo por produto** — mantido automaticamente pelas movimentações; nunca editado à mão.
- **Histórico de entradas e saídas** — toda alteração de saldo gera um registro imutável com saldo resultante (`balanceAfter`), quem registrou e quando.
- **Custo por produto** — custo unitário atual no cadastro; cada venda congela o custo do momento no movimento (lucro histórico não muda quando o custo é atualizado).
- **Lucro por produto** — receita − custo das vendas do período, por produto e total.
- **Alertas de estoque baixo** — produto com saldo ≤ estoque mínimo aparece nos cards, na tabela e na aba Alertas.
- **Validade** — data única por produto; alertas de vencidos e vencendo em 30 dias.
- **Inventário** — valor em estoque (saldo × custo) e valor potencial de venda (saldo × preço).

## Modelo de dados (prisma/schema.prisma)

**Product**: nome, descrição, SKU (único por barbearia), categoria livre (bar, cosmético...), unidade, custo, preço de venda, saldo, estoque mínimo, validade, `sellable` (pode ir para comanda), `active`.

**StockMovement**: tipo, quantidade **com sinal** (+entrada/−saída), `balanceAfter` (auditoria), custo e preço praticados, motivo, vínculo com comanda (`orderId`/`orderItemId`) e autor (`createdById`).

Tipos de movimento: entradas `PURCHASE` (compra), `RETURN` (devolução), `ADJUSTMENT_IN`; saídas `SALE` (venda — só via comanda), `CONSUMPTION` (uso interno), `LOSS` (perda/quebra), `ADJUSTMENT_OUT`.

Migration: `20260726000002_add_inventory` (rodar `npx prisma migrate deploy` + `npx prisma generate` em `barbearia-web`).

## Permissões

| Ação | OWNER/MANAGER | RECEPTION | PROFESSIONAL |
|---|---|---|---|
| Ver produtos, saldos, movimentações, resumo | ✅ | ✅ | ❌ |
| Registrar entrada/saída | ✅ | ✅ | ❌ |
| Criar/editar produto (custo, preço, mínimo, validade) | ✅ | ❌ | ❌ |
| Atualizar custo do produto a partir de uma compra | ✅ | ❌ (a compra registra o custo no histórico, mas não altera o cadastro) | ❌ |
| Excluir/desativar produto | ✅ | ❌ | ❌ |

## Regras de negócio

1. **Saldo nunca fica negativo** — saída maior que o saldo é recusada (409), inclusive em requisições simultâneas (transação serializável).
2. **Venda só pela comanda** — o tipo `SALE` é bloqueado no endpoint de movimentações; a baixa acontece no fechamento da comanda, na mesma transação do pagamento e da comissão. Se faltar saldo no fechamento, o caixa é bloqueado com mensagem clara.
3. **Produto na comanda** — só produtos `active` + `sellable` e com saldo; o preço vem do catálogo (pode ser sobrescrito); o estoque é validado ao adicionar e novamente ao fechar.
4. **Exclusão vira desativação** quando o produto tem histórico (preserva auditoria e relatórios).
5. **Saldo inicial** informado no cadastro gera uma movimentação `PURCHASE` ("Saldo inicial do cadastro") — histórico completo desde o dia zero.
6. **Lucro preciso** — movimentos `SALE` guardam `unitCost` e `unitPrice` do momento; o relatório soma a partir deles, não do cadastro atual.

## APIs

- `GET /api/produtos?q=&category=&active=&lowStock=1&expiring=30` — lista com flags calculadas (lowStock, expired, expiringSoon, stockValue).
- `POST /api/produtos` — cria (com `initialQuantity` opcional).
- `GET/PATCH/DELETE /api/produtos/[id]` — detalhe com últimas 50 movimentações / edição / exclusão-desativação.
- `GET /api/estoque/movimentacoes?productId=&type=&from=&to=&take=&skip=` — histórico paginado.
- `POST /api/estoque/movimentacoes` — registra entrada/saída `{ productId, type, quantity, unitCost?, reason?, updateProductCost? }`.
- `GET /api/estoque/resumo?from=&to=` — inventário, alertas e lucro do período (padrão 30 dias).
- `PATCH /api/comandas/[id]` com `action: "add_item"` aceita `item.productId` (venda de produto).

## Tela `/estoque`

Cards (produtos ativos, valor em estoque, valor potencial, lucro 30d, abaixo do mínimo, vencidos/vencendo) + 3 abas: **Produtos** (tabela com badges de alerta, form de cadastro/edição), **Movimentações** (form de registro + histórico) e **Alertas** (estoque baixo, vencidos, vencendo, lucro por produto). Na comanda, novo bloco "Adicionar produto do estoque".

## Fora do escopo desta entrega (roadmap)

- Controle de validade **por lote** (FEFO) — hoje é data única por produto.
- Notificações push/e-mail de estoque baixo (hoje o alerta é visual no painel).
- Pedido de compra / fornecedores.
- Código de barras com leitor.
- Parcelamento e pagamento dividido na comanda (pendência já registrada anteriormente).
