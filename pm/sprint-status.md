# Sprint Status

| Sprint | Nome | Status | Observacao |
|---|---|---|---|
| 0 | Preparacao | Concluida | Charter, WBS, cronograma e artefatos basicos prontos |
| 1 | Fundacao tecnica | Concluida | Base do app, navegacao, tenant e autenticacao conectados |
| 2 | Identidade e cadastro | Concluida | Personalizacao visual, tema por tenant, API de tema, onboarding refinado. Bugs criticos corrigidos (middleware, URLs, validacoes). |
| 3 | Operacao principal | Concluida | CRUD profissionais+servicos. Jornada de trabalho (WorkingHours). Vinculo prof<->servico. Bloqueios de agenda. |
| 4 | Agenda | Concluida | Motor de disponibilidade (lib/availability.ts + /api/disponibilidade). API agendamentos com anti-conflito. Pagina /agenda com visao diaria, filtros e acoes de status. |
| 5 | Agendamento publico | Concluida | API publica de barbershop e agendamento. Pagina /s/[slug] com dados reais. Fluxo /s/[slug]/agendar com 4 etapas (servico, profissional, slots reais, dados do cliente) e tela de confirmacao. |
| 6 | Atendimento e receita | Concluida | Comanda simples com add/remove itens. Fechamento com 6 formas de pagamento. Calculo de comissao por profissional. Botao abrir comanda na agenda. |
| 7 | Relatorios e estabilizacao | Concluida | Relatorio diario: 4 cards de resumo, breakdown por profissional, tabela de comandas fechadas e todos os agendamentos. |
| 8 | Site de marketing lbraunapp | Concluida | Landing page: nav, hero, stats, 6 features, 3 planos, secao revendedor, CTA e footer. Route group sem sidebar. |
| 9 | Revendedor e cupons | Concluida | POST /api/public/revendedor (cupom NOME-XXXX). Dashboard /revendedor/[coupon]. Campo cupom no onboarding vincula barbearia ao revendedor via BarbershopReseller. |
| 10 | Pacotes e admin de precos | Concluida | Model Plan no schema. Migration SQL com seed dos 3 planos. API CRUD /api/admin/planos. Pagina /admin/planos. Layout /admin com sidebar amber. resolveAdmin helper. |
| 11 | Trial automatico | Concluida | trialEndsAt no Barbershop. Onboarding seta 30 dias. JWT carrega trialEndsAt. Middleware bloqueia painel se expirado. Banner ambar nos ultimos 7 dias. Pagina /trial-expirado. |
| 12 | Admin Master: barbearias e trials | Concluida | API /api/admin/barbearias com filtros e computedStatus. Pagina /admin/barbearias com cards e tabela. Detalhe /admin/barbearias/[id] com acoes: extender trial, trocar plano, ativar/desativar. |
| 13 | Admin Master: revendedores e planos | Concluida | API /api/admin/revendedores (GET + PATCH). Pagina /admin/revendedores com lista, receita/comissao e acoes (aprovar, desativar, editar taxa). Landing page com planos dinamicos do banco via Prisma server component. |
