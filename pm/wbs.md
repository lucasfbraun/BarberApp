# WBS - Work Breakdown Structure

## 1. Iniciacao
- 1.1 Validar escopo
- 1.2 Definir objetivos do MVP
- 1.3 Identificar stakeholders
- 1.4 Aprovar charter

## 2. Planejamento
- 2.1 Definir arquitetura
- 2.2 Definir backlog do MVP
- 2.3 Definir cronograma
- 2.4 Definir riscos
- 2.5 Definir criterio de aceite

## 3. Fundacao tecnica
- 3.1 Criar projeto Next.js
- 3.2 Configurar TypeScript
- 3.3 Configurar Tailwind
- 3.4 Configurar banco
- 3.5 Configurar autenticacao
- 3.6 Estruturar multi-tenant

## 4. Modulos do MVP
- 4.1 Cadastro da barbearia
- 4.2 Personalizacao visual
- 4.3 Usuarios e permissoes basicas
- 4.4 Profissionais
- 4.5 Servicos
- 4.6 Jornada e bloqueios
- 4.7 Agenda interna
- 4.8 Pagina publica de agendamento
- 4.9 Clientes
- 4.10 Comanda simples
- 4.11 Pagamento informativo
- 4.12 Comissao simples
- 4.13 Relatorio diario

## 4A. Portal do Profissional (MVP — secao 24 do escopo)
- 4A.1 Acesso individual do barbeiro (criado pelo gestor)
- 4A.2 Permissoes por barbearia (BarbershopPermissions)
- 4A.3 Home do dia (proximo cliente, contadores, producao)
- 4A.4 Agenda diaria e semanal
- 4A.5 Maquina de estados do atendimento (confirmar, chegou, iniciar, finalizar, remarcar, cancelar, falta)
- 4A.6 Ficha, historico e preferencias do cliente
- 4A.7 Comanda do barbeiro e envio ao caixa
- 4A.8 Tela de caixa no painel (recebe as comandas enviadas)
- 4A.9 Comissao propria com detalhamento
- 4A.10 Avaliacoes recebidas
- 4A.11 Perfil e bloqueio de horario
- 4A.12 Trilha de auditoria (AuditLog)

## 5. Qualidade e entrega
- 5.1 Testes funcionais
- 5.2 Revisao de seguranca basica
- 5.3 Validacao de fluxo
- 5.4 Preparacao para piloto

## 6. Evolucao pos-MVP
- 6.1 Notificacoes
- 6.2 Lista de espera
- 6.3 Estoque
- 6.4 Produtos
- 6.5 Fidelidade
- 6.6 Pacotes
- 6.7 Financeiro completo
- 6.8 Pagamento online
- 6.9 Multiunidades

## 5A. Monetizacao (sprints 28-29)
- 5A.1 Area /assinatura, acessivel com trial vencido
- 5A.2 Bloqueio seletivo: painel e portal barrados, vitrine publica no ar sem agendar
- 5A.3 Bloqueio de agendamento tambem na API publica (nao so no front)
- 5A.4 Models Subscription e Invoice
- 5A.5 lib/mercado-pago.ts — HTTP direto, sem SDK
- 5A.6 Checkout: cartao com recorrencia (preapproval) e PIX avulso
- 5A.7 Webhook validado, idempotente e responsavel por liberar o acesso
- 5A.8 Renovacao, inadimplencia (PAST_DUE) e carencia
- 5A.9 Lembrete de vencimento do PIX por e-mail
- 5A.10 Status de assinatura e faturas no admin master

## 5B. Blog e aquisicao (sprint 30)
- 5B.1 Model Post com rascunho, agendamento e tags
- 5B.2 Rotas publicas /blog, /blog/[slug], /blog/tag/[tag]
- 5B.3 POST /api/blog autenticado por token, para o n8n
- 5B.4 Sanitizacao do markdown recebido
- 5B.5 /admin/blog para revisar e publicar
- 5B.6 SEO: sitemap, robots, JSON-LD, Open Graph por post e RSS

## 6A. Portal do Profissional — fase 2 (secao 25 do escopo)
- 6A.1 Fila de espera (novo modelo WaitingQueue)
- 6A.2 Indicadores de desempenho e metas
- 6A.3 Portfolio com autorizacao de imagem
- 6A.4 Controle de jornada e ponto
- 6A.5 Resposta do profissional a avaliacao
- 6A.6 Notificacao push real (Web Push + VAPID)
- 6A.7 Comunicacao interna e comunicados
- 6A.8 Ranking da equipe e gamificacao
- 6A.9 Solicitacao de folga/ferias com aprovacao
- 6A.10 Transferencia de atendimento entre profissionais
