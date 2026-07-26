# Agendamento Reformulado e Fuso por Tenant — Documentação

Data: 2026-07-26 · Páginas: `/s/[slug]/agendar` · Arquivos: `src/lib/availability.ts`, `src/app/api/disponibilidade/route.ts`, `src/app/api/profissionais/route.ts`, `src/app/api/servicos/route.ts` · Migration: `20260726000005_link_professionals_to_services`

## 1. Novo fluxo de agendamento

O fluxo de **4 etapas** (serviço → profissional → data/horário → dados do cliente) virou **3 etapas**, no visual claro da área do cliente:

| Etapa | Tela |
|---|---|
| 1 | **Serviço** — lista com categoria, duração e preço |
| 2 | **Profissional + agenda na mesma tela** — faixa de dias com rolagem horizontal (60 dias à frente), avatares dos profissionais que fazem o serviço e, abaixo, a grade de horários livres |
| 3 | **Resumo e confirmação** — serviço, profissional, data, hora, duração e valor, com campo de observação |
| — | **Comprovante** com atalho para "Meus agendamentos" |

A etapa "Seus dados" foi eliminada: o cliente já está logado e nome/telefone vêm da conta. O cabeçalho mostra o **mês da data selecionada**, e o ícone de calendário abre o seletor nativo do celular para pular para uma data distante.

Enquanto nenhum profissional está escolhido, a tela mostra "Escolha um profissional para buscar os horários disponíveis para agendamento" — o mesmo cartão é reaproveitado quando o profissional não tem vaga no dia.

## 2. Fuso horário por tenant (item B4 do cronograma de correções)

**Bug corrigido.** O motor de disponibilidade montava as horas com `new Date()`/`setHours`, ou seja, **no fuso do servidor**. Local funcionava; na Vercel (UTC) uma jornada 09:00–18:00 apareceria como 06:00–15:00 para o cliente no Brasil — a agenda inteira deslocada.

`src/lib/availability.ts` passou a converter explicitamente a partir de `Barbershop.timezone`, usando `Intl.DateTimeFormat` (respeita horário de verão, sem biblioteca). O resultado sai sempre como instante absoluto (ISO/UTC), e a rota calcula os limites do dia civil no fuso da barbearia.

Funções exportadas para reuso: `zonedTimeToUtc`, `dayRangeInTimeZone`, `weekdayOf` e a constante `DEFAULT_TIMEZONE`.

> **B4 ainda não está completo.** As rotas `agendamentos/route.ts`, `comandas/route.ts` e `relatorio/diario/route.ts` continuam montando início/fim de dia no relógio do servidor. É só aplicar o `dayRangeInTimeZone`.

## 3. Vínculo automático profissional ↔ serviço

**Bug corrigido.** Criar um profissional **não vinculava nenhum serviço** a ele, e o agendamento público só lista quem tem vínculo com o serviço escolhido. Resultado: a barbearia via "nenhum profissional disponível" mesmo tendo equipe cadastrada.

Novo comportamento:

- **Profissional novo** nasce vinculado a todos os serviços ativos.
- **Serviço novo** nasce vinculado a todos os profissionais ativos.
- Ambos em transação; desvincular continua manual, na tela do profissional, para quem não faz determinado serviço.

A migration `20260726000005_link_professionals_to_services` resolve quem já estava cadastrado: liga todo profissional ativo a todo serviço ativo **da mesma barbearia**, com `ON CONFLICT DO NOTHING` — vínculos existentes são preservados, inclusive os que foram desativados de propósito.

Brecha conhecida: serviço **reativado** depois de desativado não é revinculado automaticamente a quem entrou na equipe nesse meio-tempo.

## 4. Horários em branco

**Bug corrigido.** A página lia `slot.time`, e `/api/disponibilidade` devolve `{ startsAt, endsAt }` — o campo não existia, então os botões de horário saíam vazios. O rótulo passou a ser derivado de `startsAt` no cliente, como o painel já fazia.

## Pendências / próximos passos sugeridos

- Completar o B4 nas outras três rotas de data.
- Opção "qualquer profissional disponível" na etapa 2.
- Encadear vários serviços numa reserva só (hoje é um horário por vez).
- Revincular automaticamente ao reativar um serviço.
