# Portal do Profissional — implementação

**Sprint 25 · 27/07/2026** · Escopo original: [`portal-profissional-barbeiro.md`](./portal-profissional-barbeiro.md)

Este documento registra **o que foi construído, o que ficou de fora e por quê**. O escopo original tem 28 seções; a seção 24 dele define um MVP de 20 itens, e foi esse o recorte entregue.

---

## 1. O que destravou

Antes desta sprint o papel `PROFESSIONAL` existia no enum e tinha guards escritos na API — agenda filtrada, bloqueio da própria agenda, relatório negado — mas **nenhum deles rodava**, porque:

1. `BarbershopUser` só era criado no onboarding, sempre como `OWNER`. Não havia rota nem tela para criar um usuário de barbeiro.
2. Nada preenchia `Professional.userId`, que é o vínculo lido por `resolveOwnProfessionalId()` para descobrir qual barbeiro é o usuário logado.
3. O front não lia o papel em lugar nenhum: a navegação do painel era idêntica para todos.

Ou seja: os guards eram código morto. A peça que destrava tudo é a aba **"Acesso ao portal"** na tela de Profissionais.

---

## 2. Decisões de arquitetura

### 2.1 Acesso criado pelo gestor, não por convite por e-mail

O E2 do cronograma previa convite com token expirável. Não foi esse o caminho: **o projeto não tem provedor de e-mail configurado**, e um convite que não chega é pior do que nenhum convite — o gestor fica esperando um e-mail que nunca sai.

O gestor define e-mail e senha inicial na ficha do profissional. A senha aparece em texto na tela de propósito: ele precisa lê-la para passar ao barbeiro.

**Consequência:** enquanto o E1 (recuperação de senha) não existir, trocar a senha depende de pedir ao gestor. É a maior fragilidade da entrega.

### 2.2 Permissões: tabela por barbearia, mas não para tudo

`BarbershopPermissions` guarda 11 permissões, uma linha por barbearia. **A ausência de linha significa "usar os padrões"**, resolvido em `lib/permissions.ts` — assim uma permissão nova nasce com valor definido para todas as barbearias, sem migration de dados.

Só entraram na tabela os itens que a seção 18 marca como **"Configurável"** ou **"Limitado"**. O que ela marca como "Sempre permitido" ou "Não permitido" continua sendo regra fixa de código:

> Tornar configurável o acesso ao caixa geral ou à comissão dos colegas abriria a porta para o gestor conceder exatamente o que a seção 23 proíbe. A tela de permissões lista esses itens num bloco "Não configurável", para o gestor não procurar um interruptor que não existe.

### 2.3 Dono que também atende

Em barbearia pequena o dono corta cabelo. Se um `OWNER`/`MANAGER` tem um `Professional` vinculado, ele usa o portal normalmente — porém com **todas as permissões liberadas**, porque a seção 18 restringe o papel PROFESSIONAL, não quem já administra o tenant. Sem isso o dono cairia em "sem permissão" na própria barbearia.

### 2.4 Atendimento ≠ pagamento

A seção 6 é explícita: concluir o serviço não é receber o dinheiro. Foram criados dois estados:

- `AppointmentStatus.ARRIVED` — "cliente chegou", presença marcada, atendimento não iniciado.
- `OrderStatus.AWAITING_PAYMENT` — comanda enviada ao caixa, valor não recebido.

**A comissão continua sendo gerada apenas no recebimento** (seção 9, regra 2). A tela de comissões mostra separadamente o que ainda não conta — sem isso o barbeiro soma a comanda aberta de cabeça e reclama do valor no fim do mês.

Isso obrigou a criar a tela `/caixa` no painel: o "enviar para o caixa" precisava de um destino. Antes, o painel só chegava à comanda pelo agendamento do dia.

### 2.5 Fechamento de comanda unificado

Dar ao barbeiro o direito de receber pagamento (`canReceivePayment`) criaria um **segundo caixa**. Em vez de duplicar a lógica, ela foi extraída para `lib/close-order.ts` — baixa de estoque, pagamento e comissão numa transação serializável só, usada pelas duas rotas.

De quebra isso fechou o **B5**: o `paymentMethod` agora é validado contra o enum antes de qualquer escrita. Antes ia como `as never` e um valor inválido só estourava dentro da transação, virando um 503 "Erro ao fechar a comanda" — mensagem errada para um erro de entrada.

### 2.6 Notificações derivadas, não push

`/api/profissional/notificacoes` **deriva** os eventos do estado atual (agendamentos alterados desde um instante), e a tela consulta periodicamente.

Push real exige service worker com Web Push, chaves VAPID e um serviço de entrega — nada disso existe no projeto. Derivar do banco entrega o valor do MVP (o barbeiro vê que algo mudou) **sem prometer tempo real**. Push verdadeiro está na fase 2.

### 2.7 Fuso horário

Todas as rotas novas usam `dayRangeInTimeZone`/`todayInTimeZone` a partir de `Barbershop.timezone`. Nenhuma usa `new Date().toISOString().slice(0,10)` nem `setHours`, que operam no relógio do servidor — em UTC na Vercel, a janela do dia sai três horas deslocada.

---

## 3. Mapa de entrega por seção do escopo

| Seção | Situação | Observação |
|---|---|---|
| 2. Perfil de acesso | ✅ Entregue | Sem "unidade/filial" (não há multiunidade) nem status Suspenso/Férias — só ativo/inativo |
| 3. Página inicial | ✅ Entregue | Sem "clientes aguardando" da fila (fila é fase 2); a contagem usa os marcados como ARRIVED |
| 4. Agenda | ✅ Entregue | Visões diária e semanal. **Mensal não** — pouco útil em tela de celular e cara de construir |
| 5. Disponibilidade e bloqueio | 🔶 Parcial | Bloqueio pontual e por período: sim. **Solicitação de folga/férias com aprovação: não** (exige fluxo de aprovação inteiro) |
| 6. Atendimento e comanda | ✅ Entregue | Sem gorjeta, sem pausa de atendimento, sem transferência entre profissionais |
| 7. Cliente e histórico | ✅ Entregue | Preferências estruturadas em `Customer.preferences` (Json). **Alergias e restrições aparecem no topo, em vermelho** — é a única informação da tela que, se passar despercebida, machuca alguém. Sem fotos antes/depois |
| 8. Fila de espera | ❌ Fase 2 | Exige modelo novo; só faz sentido para barbearia que atende por ordem de chegada |
| 9. Comissões | ✅ Entregue | Com detalhamento e separação serviço/produto. Sem gorjeta, bônus, adiantamento e estorno |
| 10. Indicadores | 🔶 Parcial | Os do dia estão na home. Painel completo de desempenho com período: fase 2 |
| 11. Notificações | 🔶 Parcial | No sistema, por polling. Sem push, e-mail ou WhatsApp |
| 12. Perfil profissional | ✅ Entregue | Barbeiro edita foto, nome e bio; o resto é do administrador e aparece somente leitura |
| 13. Portfólio | ❌ Fase 2 | Depende de storage de arquivos (hoje imagem é data URL no Postgres — ver `UPLOADS.md`) e de consentimento de imagem |
| 14. Controle de jornada | ❌ Fase 2 | Ponto eletrônico é um módulo próprio |
| 15. Avaliações | 🔶 Parcial | Visualização com média e distribuição. **Responder avaliação não**: falta o campo no modelo `Review` |
| 16. Metas | ❌ Fase 2 | |
| 17. Comunicação interna | ❌ Fase 2 | |
| 18. Permissões | ✅ Entregue | 11 configuráveis + bloco explícito do que não é configurável |
| 20. Auditoria | ✅ Entregue | `AuditLog` append-only. **Falta a tela de consulta no painel** — a API existe (`/api/auditoria`) |
| 23. O que não deve aparecer | ✅ Entregue | Middleware barra o barbeiro no painel; a navegação é filtrada por papel |
| 26. Critérios de aceite | ✅ Conferidos | Um a um, exceto o teste de responsividade em aparelho real |

---

## 4. Mapa de arquivos

**Dados** — `prisma/schema.prisma`, `prisma/migrations/20260727000001_professional_portal/`
`BarbershopPermissions`, `AuditLog`, `AppointmentStatus.ARRIVED`, `OrderStatus.AWAITING_PAYMENT`, `Appointment.arrivedAt/startedAt/rescheduledFrom`, `Customer.preferences`.

**Bibliotecas** — `src/lib/`
`permissions.ts` (padrões e resolução) · `professional-guard.ts` (contexto do barbeiro) · `audit.ts` (log append-only) · `close-order.ts` (caixa unificado) · `customer-preferences.ts` (Json validado) · `ui-pro.ts` (vocabulário visual).

**API** — `src/app/api/`
`profissional/*` (resumo, agenda, agendamentos, clientes, comandas, comissões, avaliações, perfil, notificações) · `profissionais/[id]/acesso` · `permissoes` · `auditoria`.

**Telas** — `src/app/(profissional)/profissional/*` (portal) · `(panel)/permissoes` · `(panel)/caixa`.

---

## 4A. Correções de segurança feitas na mesma sprint

Duas falhas de severidade **Alta**, encontradas na análise do projeto e fechadas depois da entrega do portal:

**N1 · `POST /api/comandas` aceitava IDs de outra barbearia.** Só o `appointmentId` era conferido; `customerId`, `professionalId` e `items[].serviceId` iam direto para o `create`. A comanda passava a exibir nome de cliente e profissional de outro tenant, e ao fechar nascia uma `Commission` com `barbershopId` daqui e `professionalId` de lá — corrompendo o relatório das duas barbearias. Os quatro identificadores agora passam por `findFirst` com `barbershopId`.

**N2 · `PATCH /api/agendamentos/[id]` sem guard de papel nem revalidação de conflito.** Qualquer papel do tenant alterava qualquer agendamento — enquanto o `GET` da lista já restringia o barbeiro à própria agenda. A escrita era mais frouxa que a leitura. E mover `startsAt` não checava sobreposição, contornando toda a transação serializável do `POST`: dava para criar horário duplicado pela porta dos fundos.

A rota ganhou cinco proteções: guard de papel, restrição do `PROFESSIONAL` à própria agenda (no `GET` e no `PATCH`), bloqueio de alteração em atendimento finalizado, `endsAt > startsAt`, e conflito revalidado em transação serializável. Cancelar passou a exigir papel e motivo.

> **Efeito na interface:** a agenda do painel agora pergunta o motivo ao cancelar. Antes mandava um `"Cancelado pelo painel"` fixo — o que tornava a auditoria inútil justamente na ação que mais precisa ser explicada seis meses depois. A tela também passou a mostrar os erros das ações; antes a resposta era ignorada e um clique negado simplesmente não fazia nada.

## 5. Pendências conhecidas

1. **`npx prisma migrate deploy && npx prisma generate` são obrigatórios** antes do primeiro `npm run dev`. São duas migrations novas (`20260727000001_professional_portal` e `20260727000002_password_reset`), e o código usa os modelos sem `as any` — de propósito, para não repetir a dívida do B2. Até o client ser regenerado, o TypeScript acusa erro. O `npm run build` e o `postinstall` já rodam o generate.
2. ~~Recuperação de senha (E1)~~ — **entregue em 27/07**. Ver [`recuperacao-de-senha.md`](./recuperacao-de-senha.md). Configure `RESEND_API_KEY` e `MAIL_FROM` antes de produção.
3. **Tela de auditoria no painel** — a API existe (`/api/auditoria`), a interface não.
4. **Sem testes.** As regras mais delicadas desta entrega (máquina de estados, teto de desconto, geração de comissão) não têm cobertura. É a maior fragilidade que resta.
5. **`npm run lint && npx tsc --noEmit`** não foram executados: o ambiente de análise é Linux e o `node_modules` do projeto foi instalado no Windows. Rodar localmente antes do deploy.
6. **Rate limit ainda é em memória**, por instância serverless. Migrar para Upstash quando o volume justificar.
