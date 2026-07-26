# Bloqueios de Agenda — Regras de Negócio e Permissões

Data: 2026-07-26 · Arquivos: `src/app/api/bloqueios/route.ts`, `src/app/api/bloqueios/[id]/route.ts`, `src/lib/auth-guard.ts`

## Conceito

Um **bloqueio de agenda** (`ScheduleBlock`) torna um intervalo de tempo indisponível para agendamentos. Pode cobrir:

- **Um profissional específico** (`professionalId` preenchido) — ex.: folga do barbeiro, consulta médica, almoço estendido.
- **A barbearia inteira** (`professionalId` nulo) — ex.: feriado, reforma, evento.

O intervalo é livre (`startsAt` → `endsAt`): pode ser uma hora, um turno, um dia ou vários dias. O motor de disponibilidade (`src/lib/availability.ts`) exclui automaticamente os horários bloqueados dos slots oferecidos na página pública de agendamento e no painel.

Tipos (`ScheduleBlockType`): `MANUAL_BLOCK` (padrão), demais valores do enum no `prisma/schema.prisma`.

## Regra central: quem bloqueia × quem desbloqueia

| Papel | Criar bloqueio | Escopo do bloqueio | Remover (desbloquear) |
|---|---|---|---|
| OWNER (admin do tenant) | ✅ | Qualquer profissional ou barbearia toda | ✅ |
| MANAGER | ✅ | Qualquer profissional ou barbearia toda | ✅ |
| PROFESSIONAL (barbeiro) | ✅ | **Somente a própria agenda** | ❌ |
| RECEPTION | ❌ | — | ❌ |

**O desbloqueio é exclusivo do admin do tenant (OWNER/MANAGER).** O barbeiro pode bloquear a própria agenda (dia, hora, período), mas não pode remover bloqueio nenhum — **nem os que ele mesmo criou**. Isso dá ao gestor controle final sobre a disponibilidade da equipe: um barbeiro não consegue "sumir" da agenda e voltar sem o gestor saber.

### Como o barbeiro é identificado

O vínculo é feito por `Professional.userId`: o registro do profissional precisa apontar para o usuário logado. Ao criar/listar bloqueios como PROFESSIONAL:

- O sistema resolve o profissional do usuário via `resolveOwnProfessionalId(barbershopId, userId)` (em `src/lib/auth-guard.ts`).
- Se o usuário PROFESSIONAL não tiver `Professional` vinculado e ativo → `403 "Profissional nao vinculado ao usuario."`
- Se tentar bloquear a agenda de outro profissional → `403 "Voce so pode bloquear a propria agenda."`
- O `professionalId` do bloqueio é **forçado** para o próprio, inclusive se omitido (barbeiro não cria bloqueio de barbearia inteira).

## API

### `GET /api/bloqueios?professionalId=&from=&to=`
Lista bloqueios do tenant. Filtros opcionais por profissional e período.
- OWNER/MANAGER/RECEPTION: veem todos os bloqueios.
- PROFESSIONAL: vê **somente os próprios** (filtro forçado no servidor).

### `POST /api/bloqueios`
Cria bloqueio. Papéis permitidos: OWNER, MANAGER, PROFESSIONAL (próprio escopo).

```json
{
  "professionalId": "opcional — omitir p/ bloquear a barbearia toda (só OWNER/MANAGER)",
  "startsAt": "2026-08-01T09:00:00",
  "endsAt": "2026-08-01T12:00:00",
  "reason": "opcional",
  "type": "MANUAL_BLOCK"
}
```

Validações: datas válidas, `endsAt > startsAt`, profissional pertence ao tenant.

### `DELETE /api/bloqueios/[id]`
Remove (desbloqueia). **Somente OWNER/MANAGER.**
- PROFESSIONAL/RECEPTION → `403 "Somente o administrador da barbearia pode desbloquear a agenda."`
- Bloqueio de outro tenant → `404` (isolamento multi-tenant).

## Segurança

- Todas as rotas passam por `resolveTenant` (revalida vínculo, tenant ativo e trial no banco a cada request).
- Escopo sempre limitado ao `barbershopId` do token — sem acesso cruzado entre tenants.
- A restrição de papel é aplicada **no servidor** (não depende de UI).

## Fluxo típico

1. Barbeiro precisa de folga → cria bloqueio na própria agenda (dia/horário).
2. Slots do período somem da página pública e do painel de agenda.
3. Plano mudou? Somente o admin (OWNER/MANAGER) remove o bloqueio e os horários voltam a ficar disponíveis.

## Pendências / próximos passos sugeridos

- UI de bloqueios no painel (hoje a operação é via API; a página `/profissionais` gerencia jornada, mas não há tela dedicada de bloqueios).
- Notificar o admin quando um barbeiro criar bloqueio (e-mail/painel).
- Auditoria de quem criou cada bloqueio (campo `createdByUserId`) — entra junto com o item E3 (auditoria básica) do cronograma de correções.
