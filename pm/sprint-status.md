# Sprint Status

| Sprint | Nome | Status | Observacao |
|---|---|---|---|
| 0 | Preparacao | Concluida | Charter, WBS, cronograma e artefatos basicos prontos |
| 1 | Fundacao tecnica | Concluida | Base do app, navegação, tenant e autenticação conectados |
| 2 | Identidade e cadastro | Concluida | Personalizacao visual, tema por tenant, API de tema, onboarding refinado. Bugs criticos corrigidos (middleware, URLs, validacoes). |
| 3 | Operacao principal | Concluida | CRUD profissionais+servicos. Jornada de trabalho (WorkingHours). Vinculo prof<->servico. Bloqueios de agenda. |
| 4 | Agenda | Concluida | Motor de disponibilidade (lib/availability.ts + /api/disponibilidade). API agendamentos com anti-conflito. Pagina /agenda com visao diaria, filtros e acoes de status. |
| 5 | Agendamento publico | Concluida | API publica de barbershop e agendamento. Pagina /s/[slug] com dados reais. Fluxo /s/[slug]/agendar com 4 etapas (servico, profissional, slots reais, dados do cliente) e tela de confirmacao. |
| 6 | Atendimento e receita | Em andamento | Comanda, pagamento informativo e comissao simples |
| 7 | Relatorios e estabilizacao | Pendente | Relatorio diario, UX e preparo para piloto |
