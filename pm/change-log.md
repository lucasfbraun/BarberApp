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

| 2026-06-22 | Sprint 6 concluida: comanda simples, fechamento com pagamento e calculo de comissao por profissional | Claude | Implementado |
| 2026-06-22 | Sprint 7 concluida: relatorio diario com cards, breakdown por profissional e tabela de comandas | Claude | Implementado |
| 2026-06-22 | Sprint 8 concluida: landing page lbraunapp com route group sem sidebar | Claude | Implementado |
| 2026-06-22 | Sprint 9 concluida: modulo revendedor — cadastro, cupom unico NOME-XXXX, dashboard publico, vinculo no onboarding | Claude | Implementado |
| 2026-06-22 | Sprint 10 concluida: model Plan, migration SQL com seed, API CRUD admin/planos, painel /admin | Claude | Implementado |
| 2026-06-22 | Sprint 11 concluida: trial automatico (trialEndsAt, JWT, middleware, banner, pagina /trial-expirado) | Claude | Implementado |
| 2026-06-22 | Sprint 12 concluida: admin barbearias com lista, filtros, detalhe e acoes (trial, plano, status) | Claude | Implementado |
| 2026-06-22 | Sprint 13 concluida: admin revendedores com PATCH e landing page com planos dinamicos do banco | Claude | Implementado |
| 2026-06-22 | Cronograma Excel e escopo-software-barbearia.md atualizados — IDs 28-33 concluidos, checklist MVP marcado, secao 8 atualizada | Claude | Implementado |
| 2026-07-26 | Bloco 2 (Alto) do cronograma de correcoes: A1 IDOR comanda, A2 dashboard revendedor sem PII/receita, A3 revalidacao de sessao no banco, A4 revendedor PENDING | Claude | Implementado |
| 2026-07-26 | Bloco 3 (Medio): M1 transacao anti-corrida no agendamento, M2 role guards (relatorio/tema/agenda/comandas), M3 trial bloqueia API, M5 validacoes, M6 rate limit por IP | Claude | Implementado |
| 2026-07-26 | Isencao de contrato: campo billingExempt + acao set_exempt no admin, badge/filtro "Isenta"; correcao: plano ativo nao e mais bloqueado por trial vencido | Usuario | Implementado |
| 2026-07-26 | Bloqueios de agenda: PROFESSIONAL cria bloqueio na propria agenda; desbloqueio exclusivo de OWNER/MANAGER; doc em pm/bloqueios-de-agenda.md | Usuario | Implementado |
| 2026-07-26 | Modulo de estoque: Product + StockMovement, APIs produtos/movimentacoes/resumo, pagina /estoque, venda de produto na comanda com baixa automatica e lucro; doc em pm/estoque.md | Usuario | Implementado |
| 2026-07-26 | Area do cliente final: conta com login obrigatorio p/ agendar, diretorio de barbearias com busca, ultima barbearia em destaque, meus agendamentos com cancelamento; doc em pm/area-do-cliente.md | Usuario | Implementado |
| 2026-07-26 | Pagina publica da barbearia com abas: servicos, detalhes, profissionais (so ativos), produtos (vitrine do estoque), avaliacoes com media; fidelidade/pacotes/assinaturas como "em breve" (sprints 17-19). Sprint-status atualizado (sprints 14-19) | Usuario | Implementado |
| 2026-07-26 | Tema claro (fundo branco) e responsividade mobile em toda a jornada do cliente | Usuario | Implementado |
| 2026-07-26 | Carrinho do cliente (reserva sem pagamento): servico reserva agenda do profissional, produto vira encomenda na comanda; drawer com remover itens e total estimado | Usuario | Implementado |
| 2026-07-26 | Home do cliente no layout de app: saudacao com data, busca, ultimo agendamento, banners, ultimos acessos e bottom nav fixa | Usuario | Implementado |
| 2026-07-26 | Login proprio do cliente em /cliente/login na identidade visual da area do cliente; cadastro alinhado e fluxos do cliente redirecionados | Usuario | Implementado |
| 2026-07-26 | PWA parte 1: manifest, icones e banner de instalacao na home do cliente (prompt nativo Android, passo a passo iOS) | Usuario | Implementado |
| 2026-07-26 | PWA parte 2: service worker com estrategias de cache, fallback offline, icone maskable e viewportFit cover; InstallPrompt tambem em /s/[slug] e /cliente/agendamentos; doc em pm/pwa.md | Usuario | Implementado |
| 2026-07-26 | Login social do cliente (Google e Facebook): model Account, passwordHash nullable, vinculacao por e-mail verificado, painel segue so com senha; doc em pm/login-social.md. Provedores ainda NAO ativados (faltam os apps de OAuth) | Usuario | Implementado |
| 2026-07-26 | Fluxo de agendamento reescrito: 3 etapas com profissional e agenda na mesma tela, faixa de dias e resumo final; doc em pm/agendamento-e-fuso.md | Usuario | Implementado |
| 2026-07-26 | Correcao: horarios apareciam em branco (pagina lia slot.time, API devolve startsAt/endsAt) | Claude | Implementado |
| 2026-07-26 | Correcao B4 (parcial): fuso por tenant no motor de disponibilidade — jornada montada a partir de Barbershop.timezone em vez do relogio do servidor. Faltam agendamentos, comandas e relatorio diario | Claude | Implementado |
| 2026-07-26 | Correcao: profissional novo nao era vinculado a nenhum servico e sumia do agendamento publico. Vinculo automatico nos dois sentidos + migration de backfill (20260726000005) | Usuario | Implementado |
| 2026-07-26 | Upload da logo da barbearia em /configuracoes: redimensionamento no navegador e data URL no banco, com validacao no servidor; campo de URL mantido; doc em pm/upload-de-imagens.md | Usuario | Implementado |
| 2026-07-26 | Limite do arquivo de logo elevado de 5 MB para 8 MB, com teto novo de resolucao (8000px) para nao derrubar o navegador | Usuario | Implementado |
| 2026-07-26 | Redesign da area do cliente para se afastar da semelhanca com o AppBarber: linguagem editorial (listas com divisoria, sem sombra, cantos retos, paleta neutra) e mudancas estruturais em dias, profissionais, horarios, abas e carrinho. Vocabulario em src/lib/ui.ts; barra inferior mantida. Doc em pm/identidade-area-do-cliente.md | Usuario | Implementado |


## Regra
Toda mudanca de escopo apos o baselining deve ser registrada aqui antes de virar desenvolvimento.
