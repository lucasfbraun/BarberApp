# Change Log

| Data | Mudanca | Solicitante | Status |
|---|---|---|---|
| 2026-06-21 | Inicio da estruturacao do projeto com abordagem PMBOK | Usuario | Implementado |
| 2026-06-21 | Definicao do MVP e do roadmap por fases | Usuario | Implementado |
| 2026-06-21 | Criacao da base do cronograma e artefatos de gestao | Usuario | Implementado |
| 2026-06-21 | Correcao critica: proxy.ts renomeado para middleware.ts (rotas estavam desprotegidas) | Claude | Implementado |
| 2026-06-21 | Correcao de URLs nas paginas publicas /s/[slug]/agendar | Claude | Implementado |
| 2026-06-21 | Adicao de validacao de slug (regex) e senha minima (8 chars) no onboarding | Claude | Implementado |
| 2026-06-21 | Schema Prisma: adicao de WorkingHours, ScheduleBlocks e enum ScheduleBlockType | Claude | Implementado |
| 2026-06-21 | Criacao de src/lib/auth-guard.ts com resolveTenant, guardRole, MANAGER_ROLES, STAFF_ROLES | Claude | Implementado |
| 2026-06-21 | CRUD de profissionais: GET/POST /api/profissionais, GET/PATCH/DELETE /api/profissionais/[id] | Claude | Implementado |
| 2026-06-21 | CRUD de servicos: GET/POST /api/servicos, GET/PATCH/DELETE /api/servicos/[id] | Claude | Implementado |
| 2026-06-21 | Paginas /profissionais e /servicos com UI funcional (listagem, formulario inline, ativar/desativar) | Claude | Implementado |
| 2026-06-21 | Cronograma Excel e sprint-status.md atualizados: Sprint 2 concluida, Sprint 3 em andamento | Claude | Implementado |
| 2026-06-21 | API PUT /api/profissionais/[id]/jornada — upsert semanal de WorkingHours | Claude | Implementado |
| 2026-06-21 | API GET/POST/DELETE /api/profissionais/[id]/servicos — vinculo profissional x servico | Claude | Implementado |
| 2026-06-21 | API GET/POST /api/bloqueios + DELETE /api/bloqueios/[id] — bloqueios de agenda | Claude | Implementado |
| 2026-06-21 | Pagina /profissionais expandida com painel de jornada e vinculos inline | Claude | Implementado |
| 2026-06-21 | src/lib/availability.ts — motor de disponibilidade (slots, jornada, pausas, bloqueios, conflitos) | Claude | Implementado |
| 2026-06-21 | GET /api/disponibilidade — slots livres por profissional+servico+data (publico e interno) | Claude | Implementado |
| 2026-06-21 | GET/POST /api/agendamentos + GET/PATCH /api/agendamentos/[id] — CRUD completo com anti-conflito | Claude | Implementado |
| 2026-06-21 | Pagina /agenda com visao diaria, novo agendamento, selecao de slots e acoes de status | Claude | Implementado |
| 2026-06-21 | Cronograma Excel e sprint-status.md atualizados: Sprints 3 e 4 concluidos, Sprint 5 em andamento | Claude | Implementado |
| 2026-06-21 | GET /api/public/barbershop/[slug] — retorna barbearia, servicos e profissionais sem autenticacao | Claude | Implementado |
| 2026-06-21 | POST /api/public/agendamentos — cria agendamento publico sem JWT, com anti-conflito e auto-customer | Claude | Implementado |
| 2026-06-21 | Pagina /s/[slug] reescrita com dados reais (servicos e profissionais do banco) | Claude | Implementado |
| 2026-06-21 | Pagina /s/[slug]/agendar reescrita: fluxo 4 etapas (servico, profissional, slots reais, dados) + confirmacao | Claude | Implementado |
| 2026-06-21 | Sprint 5 concluida. Sprint 6 (comanda e receita) iniciada. | Claude | Implementado |
| 2026-06-22 | Novas features adicionadas ao escopo: site lbraunapp, revendedor com cupom e comissao percentual, pacotes com painel admin, trial automatico | Usuario | Planejado |
| 2026-06-22 | Cronograma atualizado: Sprints 8-11 e IDs 24-29 adicionados ao MVP | Claude | Implementado |

## Regra
Toda mudanca de escopo apos o baselining deve ser registrada aqui antes de virar desenvolvimento.
