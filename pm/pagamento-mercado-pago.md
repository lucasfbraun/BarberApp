# Pagamento — Mercado Pago

**Planejado · 28/07/2026** · Sprint 29

> **Mudança de escopo.** O escopo original (seção 8A, antigas sprints 18–20) previa **Stripe**. Fica substituído por **Mercado Pago**, por decisão de 28/07. O motivo é de mercado: o público são barbearias brasileiras, e PIX é o meio de pagamento que elas usam. O Stripe não processa PIX com a mesma naturalidade nem tem a mesma familiaridade com o comerciante local.

---

## O que vamos cobrar

Assinatura mensal do BarvioApp por barbearia, no plano escolhido (`Plan` já existe no banco, com preço e limite de profissionais).

Não confundir com o **caixa da barbearia** (`Order`, `Payment`), que registra o que o cliente final paga pelo corte. São dois fluxos financeiros separados que não se tocam:

```
Cliente final → paga o corte → Payment (caixa da barbearia)
Dono da barbearia → paga a mensalidade → Invoice (receita do BarvioApp)
```

---

## Meios de pagamento

### Cartão de crédito — recorrência automática

Via API de **assinaturas** do Mercado Pago (`/preapproval`). O mecanismo agenda e cobra as parcelas sozinho, na periodicidade definida. É o caminho principal: sem intervenção do dono a cada mês, e sem churn por esquecimento.

### PIX — cobrança avulsa mensal com lembrete

Decisão tomada: **PIX não terá débito recorrente nesta fase.** Todo mês o sistema gera uma cobrança PIX e avisa por e-mail alguns dias antes do vencimento.

O Banco Central prevê o **PIX Automático** (débito recorrente autorizado) plenamente operacional em 2026. Fica registrado como possível evolução, mas planejar em cima de algo que ainda depende de disponibilidade e de suporte do provedor adicionaria um risco desnecessário a uma sprint que já tem bastante superfície.

---

## Arquitetura

Mesma regra que vem sendo seguida: **sem SDK novo**. A comunicação com o Mercado Pago é HTTP direto via `fetch`, como já é feito com o Resend em `lib/mailer.ts`. Trocar de provedor volta a ser trocar um arquivo.

```
lib/mercado-pago.ts        cliente HTTP: criar preferência, preapproval, consultar pagamento
api/assinatura/checkout    inicia o pagamento, devolve o link ou o QR do PIX
api/webhooks/mercadopago   recebe as notificações e atualiza Subscription/Invoice
```

### O webhook é o coração

**A confirmação de pagamento nunca vem do navegador.** O usuário pode fechar a aba, perder conexão ou voltar pela URL de sucesso sem ter pago. Quem libera o acesso é o webhook, e só ele.

Três exigências não negociáveis:

1. **Validar a assinatura da notificação.** Sem isso, qualquer um libera a própria assinatura mandando um POST forjado.
2. **Ser idempotente.** O Mercado Pago reenvia notificações. Processar duas vezes não pode gerar duas `Invoice` nem estender o período duas vezes.
3. **Responder rápido (2xx) e processar depois.** Webhook lento vira reenvio, que vira duplicata.

### Variáveis de ambiente

```bash
MERCADOPAGO_ACCESS_TOKEN=""    # produção e sandbox são tokens diferentes
MERCADOPAGO_WEBHOOK_SECRET=""  # valida a assinatura da notificação
```

Mesma disciplina do `RESEND_API_KEY`: sem as variáveis, o checkout falha com erro explícito em produção e usa o modo sandbox em desenvolvimento. Falhar em silêncio num fluxo de cobrança é a pior opção possível.

---

## Fluxo

```
Trial vence
   ↓
Dono abre /assinatura (única rota liberada)
   ↓
Escolhe plano e meio de pagamento
   ↓
   ├─ Cartão → preapproval no MP → autoriza → recorrência ativa
   └─ PIX    → QR code → paga → confirmação
   ↓
Webhook do Mercado Pago
   ↓
Subscription = ACTIVE · Invoice = paid · currentPeriodEnd += 1 mês
   ↓
Acesso liberado SEM precisar deslogar
```

### Renovação e inadimplência

- **Cartão:** o MP cobra sozinho. Webhook de falha → `PAST_DUE` → e-mail avisando → carência de alguns dias → bloqueio.
- **PIX:** lembrete alguns dias antes do vencimento, cobrança gerada, e a mesma carência se não pagar.

A **carência** é uma decisão de negócio a definir. Cortar o acesso no minuto seguinte ao vencimento por um cartão que falhou uma vez irrita um cliente que ia pagar.

---

## Riscos

| Risco | Tratamento |
|---|---|
| Webhook forjado libera assinatura de graça | Validação de assinatura obrigatória, sem exceção |
| Notificação duplicada gera cobrança/crédito em dobro | Idempotência por `providerRef` |
| Dono paga e continua bloqueado porque o JWT é velho | Bloqueio lê o banco, não o token; ou a sessão é atualizada no retorno |
| Sandbox e produção trocados | Tokens em variáveis separadas por ambiente na Vercel |
| Estorno ou chargeback não reflete no acesso | Tratar os eventos de refund no webhook |

---

## Critérios de aceite

- [ ] Assinar no cartão cria `Subscription` ativa com recorrência no Mercado Pago
- [ ] Pagar no PIX gera `Invoice` paga e estende o período em um mês
- [ ] Webhook com assinatura inválida é recusado
- [ ] Webhook reenviado não duplica `Invoice` nem estende o período duas vezes
- [ ] Falha de cobrança marca `PAST_DUE` e dispara e-mail
- [ ] Acesso volta imediatamente após o pagamento, sem deslogar
- [ ] Admin master enxerga status de assinatura e histórico de faturas por barbearia
- [ ] Nada disso interfere no caixa da barbearia (`Order`/`Payment`)

---

## Fontes

- [Guia de pagamentos recorrentes — Mercado Pago](https://www.mercadopago.com.br/blog/como-receber-pagamentos-recorrentes)
- [Assinaturas com pagamento autorizado — Documentação](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments)
- [PIX Automático para assinaturas — Mercado Pago](https://www.mercadopago.com.br/blog/pix-automatico-vender-pacotes-assinaturas)
