# Sprint Status

| Sprint | Nome | Status | Observacao |
|---|---|---|---|
| 0 | Preparacao | Concluida | Charter, WBS, cronograma e artefatos basicos prontos |
| 1 | Fundacao tecnica | Concluida | Base do app, navegacao, tenant e autenticacao conectados |
| 2 | Identidade e cadastro | Concluida | Personalizacao visual, tema por tenant, API de tema, onboarding refinado. Bugs criticos corrigidos (middleware, URLs, validacoes). |
| 3 | Operacao principal | Concluida | CRUD profissionais+servicos. Jornada de trabalho (WorkingHours). Vinculo prof<->servico. Bloqueios de agenda. |
| 4 | Agenda | Concluida | Motor de disponibilidade (lib/availability.ts + /api/disponibilidade). API agendamentos com anti-conflito. Pagina /agenda com visao diaria, filtros e acoes de status. |
| 5 | Agendamento publico | Concluida | API publica de barbershop e agendamento. Pagina /s/[slug] com dados reais. Fluxo /s/[slug]/agendar com 4 etapas (servico, profissional, slots reais, dados do cliente) e tela de confirmacao. *Reformulado para 3 etapas na sprint 22.* |
| 6 | Atendimento e receita | Concluida | Comanda simples com add/remove itens. Fechamento com 6 formas de pagamento. Calculo de comissao por profissional. Botao abrir comanda na agenda. |
| 7 | Relatorios e estabilizacao | Concluida | Relatorio diario: 4 cards de resumo, breakdown por profissional, tabela de comandas fechadas e todos os agendamentos. |
| 8 | Site de marketing BarvioApp | Concluida | Landing page: nav, hero, stats, 6 features, 3 planos, secao revendedor, CTA e footer. Route group sem sidebar. |
| 9 | Revendedor e cupons | Concluida | POST /api/public/revendedor (cupom NOME-XXXX). Dashboard /revendedor/[coupon]. Campo cupom no onboarding vincula barbearia ao revendedor via BarbershopReseller. |
| 10 | Pacotes e admin de precos | Concluida | Model Plan no schema. Migration SQL com seed dos 3 planos. API CRUD /api/admin/planos. Pagina /admin/planos. Layout /admin com sidebar amber. resolveAdmin helper. |
| 11 | Trial automatico | Concluida | trialEndsAt no Barbershop. Onboarding seta 30 dias. JWT carrega trialEndsAt. Middleware bloqueia painel se expirado. Banner ambar nos ultimos 7 dias. Pagina /trial-expirado. |
| 12 | Admin Master: barbearias e trials | Concluida | API /api/admin/barbearias com filtros e computedStatus. Pagina /admin/barbearias com cards e tabela. Detalhe /admin/barbearias/[id] com acoes: extender trial, trocar plano, ativar/desativar. |
| 13 | Admin Master: revendedores e planos | Concluida | API /api/admin/revendedores (GET + PATCH). Pagina /admin/revendedores com lista, receita/comissao e acoes (aprovar, desativar, editar taxa). Landing page com planos dinamicos do banco via Prisma server component. |
| 14 | Correcoes de seguranca + isencao + bloqueios | Concluida | Blocos 1-3 do cronograma de correcoes (critico/alto/medio). Isencao de contrato (billingExempt) no admin. Barbeiro bloqueia propria agenda; desbloqueio so admin do tenant. |
| 15 | Modulo de estoque | Concluida | Product + StockMovement, saldo automatico, historico auditavel, alertas (minimo/validade), inventario, lucro por produto, venda na comanda com baixa automatica. Pagina /estoque. |
| 16 | Area do cliente final | Concluida | Conta de cliente (login obrigatorio so p/ agendar), diretorio /cliente com busca, ultima barbearia em destaque, meus agendamentos com cancelamento. Pagina /s/[slug] com abas: servicos, detalhes, profissionais (ativos), produtos, avaliacoes + placeholders fidelidade/pacotes/assinaturas. |
| 17 | Fidelidade | Planejada | Programa de fidelidade (Fase 2 do escopo). Aba ja criada na pagina publica como "em breve". |
| 18 | Pacotes de servicos | Planejada | Pacotes/combos (Fase 2). Aba placeholder criada. |
| 19 | Assinaturas de clientes | Planejada | Assinaturas da barbearia p/ cliente final (Fase 3). Aba placeholder criada. Depende do epico de pagamento (antigas sprints 18-20 do escopo). |
| 20 | App instalavel (PWA) | Concluida | Manifest, icones (incl. maskable), service worker com estrategias de cache, tela offline e convite de instalacao (prompt nativo no Android, passo a passo no iOS). Registro so em producao. Doc: pm/pwa.md. |
| 21 | Login social do cliente | Concluida (codigo) | Google e Facebook via NextAuth, model Account, vinculacao por e-mail verificado; painel e admin seguem so com senha. **Provedores nao ativados**: faltam os apps de OAuth e as variaveis de ambiente. Doc: pm/login-social.md. |
| 22 | Agendamento reformulado e fuso por tenant | Concluida | Fluxo de 4 para 3 etapas com profissional e agenda na mesma tela. Correcoes: horarios em branco, fuso do servidor na disponibilidade (B4 parcial) e vinculo automatico profissional<->servico com migration de backfill. Doc: pm/agendamento-e-fuso.md. |
| 23 | Upload de imagem no painel | Concluida | Logo da barbearia com upload (redimensionamento no navegador, data URL no banco) e validacao no servidor; campo de URL mantido. Capa, foto de profissional e imagem de servico seguem por URL. Doc: pm/upload-de-imagens.md. |

| 24 | Identidade visual da area do cliente | Concluida | Redesign editorial das 6 telas do cliente para se afastar da semelhanca com o AppBarber: listas com divisoria no lugar de cartoes, sem sombra, cantos retos, paleta neutra e mudancas estruturais (dias, profissionais, horarios, abas, carrinho). Barra inferior mantida. Vocabulario em src/lib/ui.ts. Doc: pm/identidade-area-do-cliente.md. |
| 25 | Portal do Profissional (MVP) | Concluida | Portal do barbeiro em /profissional: acesso individual criado pelo gestor, home do dia, agenda diaria/semanal com maquina de estados (confirmar, chegou, iniciar, finalizar, remarcar, cancelar, falta), ficha e preferencias do cliente, comanda com envio ao caixa, comissao propria, avaliacoes, perfil e bloqueios. Tabela de permissoes por barbearia (secao 18) com tela no painel. Trilha de auditoria (AuditLog). Nova tela /caixa no painel recebe as comandas enviadas. Resolve E2 e E3 do cronograma de correcoes. Doc: pm/portal-do-profissional.md e pm/portal-profissional-barbeiro.md (escopo original). |

| 26 | Fechamento do cronograma de correcoes | Concluida | Blocos 4 e 5 fechados: B1 (IDOR no DELETE de servicos), B2 (zero `any` no projeto), B3 (revendedor na transacao), B4 (fuso por tenant em todas as rotas e no front), B6/N2 (guard e conflito no PATCH de agendamentos), B7 (validacao e auditoria no admin), N1 (IDs por tenant na comanda) e E1 (recuperacao de senha). Docs: pm/recuperacao-de-senha.md. Restam apenas os testes e o QA manual. |

| 27 | Marca BarvioApp | Concluida | Logo aplicado em todo o sistema; nome provisorio lbraunapp substituido. Componente Logo com variante escura (lockup) e clara (azulejo + nome em texto). Icones do PWA, favicon e Open Graph regenerados; service worker em v2. Doc: pm/marca-barvioapp.md. |

| 28 | Area de assinatura e bloqueio pos-trial | Planejada | O portal de tenants (/admin) ja existe desde as sprints 12-13, assim como o trial de 30 dias e o bloqueio. Falta o outro lado: /trial-expirado e um beco sem saida (manda para a landing e para o WhatsApp). Esta sprint cria a area /assinatura, acessivel mesmo com trial vencido, e implementa o bloqueio seletivo — dono e equipe barrados, pagina publica no ar mas sem agendar. Doc: pm/assinatura-e-pos-trial.md. |
| 29 | Pagamento via Mercado Pago | Planejada | **Substitui o Stripe** previsto na secao 8A do escopo. Cartao de credito com recorrencia automatica (API /preapproval) e PIX como cobranca avulsa mensal com lembrete. Sem SDK novo: HTTP via fetch, como o mailer. Webhook validado, idempotente e responsavel por liberar o acesso. Models Subscription e Invoice. Doc: pm/pagamento-mercado-pago.md. |
| 30 | Blog na landing page | Planejada | Posts no banco com API autenticada por token, para o n8n publicar por HTTP sem depender de deploy. Rotas /blog, /blog/[slug], /blog/tag/[tag] e /admin/blog para revisao. Rascunho como padrao — texto de automacao nao vai ao ar sem revisao. Sitemap, RSS e Open Graph por post. Doc: pm/blog.md. |

> Sprints 20-27 foram executadas antes das 17-19, que continuam planejadas. A numeracao segue a ordem de registro, nao a cronologica.
>
> **Dependencia entre as sprints 28 e 29:** a 28 entrega a tela de escolha de plano, mas so a 29 faz o dinheiro entrar. Ate a 29 existir, a 28 sozinha nao resolve o problema de negocio — ela apenas troca um beco sem saida por uma vitrine sem caixa. Vale trata-las como uma entrega so, ou aceitar que a 28 fica incompleta por um periodo.
