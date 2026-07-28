# Assinatura e bloqueio pós-trial

**Planejado · 28/07/2026** · Sprints 28 e 29

---

## O que já existe

Boa parte do pedido "portal para gerenciar todos os tenants" **já está pronto** desde as sprints 12 e 13:

| Já funciona | Onde |
|---|---|
| Painel do admin master, restrito a `SUPERADMIN` | `/admin` |
| Lista de todas as barbearias com filtros, busca e status derivado (trial, ativa, expirada, isenta, inativa) | `/admin/barbearias` |
| Detalhe do tenant com ações: estender trial, trocar plano, ativar/desativar, isentar de cobrança | `/admin/barbearias/[id]` |
| Cadastro de planos com preço, limite de profissionais e features | `/admin/planos` |
| Revendedores com receita e comissão acumuladas | `/admin/revendedores` |
| Trial de 30 dias a partir da criação (`trialEndsAt = agora + 30 dias`) | `api/onboarding` |
| Bloqueio do painel e do portal quando o trial vence | `proxy.ts` + `resolveTenant` |
| Aviso nos últimos 7 dias | `(panel)/layout.tsx` |

**Portanto o item 1 do pedido está ~70% entregue.** O que falta é o outro lado: hoje `/trial-expirado` é um beco sem saída — manda o dono para a landing (`/#planos`) e para o WhatsApp. Não há como escolher plano nem pagar dentro do sistema.

---

## O que falta construir

### Sprint 28 — Área de assinatura e bloqueio seletivo

**A tela.** Uma área `/assinatura`, acessível **mesmo com o trial vencido**, onde o dono vê os planos, o que está usando hoje e escolhe. É o único lugar que o tenant bloqueado alcança.

**A regra de bloqueio.** O comportamento decidido:

| Quem | Trial vencido |
|---|---|
| Dono e equipe (painel) | Bloqueado — só `/assinatura` |
| Barbeiro (portal) | Bloqueado — vê aviso para falar com o dono |
| Página pública `/s/[slug]` | **No ar**, mas sem agendar |
| Cliente final | Vê serviços, preços e endereço; o botão de agendar some com aviso de indisponibilidade temporária |

> **Por que a vitrine continua no ar.** Derrubar a página pública faria o cliente final achar que a barbearia fechou — ele culpa a barbearia, não o sistema. Manter a vitrine visível preserva a reputação de quem está avaliando o produto, e o botão de agendar sumindo já cria a pressão necessária no dono.

**Onde isso é implementado.** O bloqueio hoje vive em dois lugares e precisa de um terceiro:

1. `proxy.ts` — redireciona páginas do painel e do portal. Precisa liberar `/assinatura`.
2. `resolveTenant` (`lib/auth-guard.ts`) — devolve 403 nas APIs. Já cobre tudo.
3. **Novo:** `api/public/agendamentos` e `api/disponibilidade` precisam recusar quando o tenant está com trial vencido — hoje são rotas públicas que não consultam o status de cobrança.

**Atenção — o JWT mente.** `trialEndsAt` é carregado no token no momento do login e vale 30 dias. Depois de assinar, o dono continuaria bloqueado até relogar (é o que o texto atual da página pede: "saia e entre novamente"). Isso precisa sumir: a checagem de bloqueio deve ler o banco, como `resolveTenant` já faz, ou a sessão deve ser atualizada no retorno do pagamento.

---

## Modelo de dados previsto

```prisma
model Subscription {
  id                String   @id @default(cuid())
  barbershopId      String   @unique
  planId            String
  status            SubscriptionStatus   // TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED
  provider          String               // "mercadopago"
  providerRef       String?              // id do preapproval
  currentPeriodEnd  DateTime
  cancelAtPeriodEnd Boolean  @default(false)
  ...
}

model Invoice {
  id            String   @id @default(cuid())
  barbershopId  String
  amount        Decimal  @db.Decimal(10, 2)
  status        String   // pending, paid, failed, refunded
  method        String   // pix, credit_card
  providerRef   String?  // id do pagamento
  paidAt        DateTime?
  dueAt         DateTime
  ...
}
```

`Barbershop.trialEndsAt` e `billingExempt` continuam como estão — a isenção precisa seguir prevalecendo sobre qualquer assinatura.

---

## Critérios de aceite

- [ ] Tenant com trial vencido consegue abrir `/assinatura` e nada mais do painel
- [ ] Barbeiro com trial vencido vê aviso claro, não uma tela de erro
- [ ] Página pública continua acessível, sem botão de agendar
- [ ] `POST /api/public/agendamentos` recusa tenant vencido, mesmo com o front adulterado
- [ ] Assinar libera o acesso **sem precisar deslogar**
- [ ] `billingExempt` continua liberando tudo, ignorando trial e assinatura
- [ ] Admin master vê o status de assinatura na lista de barbearias
