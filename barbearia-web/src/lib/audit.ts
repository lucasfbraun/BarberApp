/**
 * Trilha de auditoria (secao 20 do Portal do Profissional).
 *
 * Append-only por decisao: nao existe rota de update nem de delete de
 * AuditLog, porque a secao 19, regra 22 exige que o historico de alteracoes
 * nao seja editavel.
 *
 * REGRA IMPORTANTE: `logAudit` NUNCA lanca. Auditoria e um efeito colateral
 * do negocio, nao o negocio — se a gravacao do log falhar, o cancelamento do
 * agendamento (que ja foi commitado) nao pode virar erro 500 na cara do
 * barbeiro. A falha vai para o console e a operacao segue.
 *
 * Por isso tambem a chamada fica FORA da transacao da operacao auditada: se
 * estivesse dentro, um erro de log desfaria a operacao — exatamente o oposto
 * do que se quer.
 */

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Acoes auditadas. Lista fechada (em vez de string livre) para que os
 * filtros do painel e os relatorios nao dependam de alguem lembrar a grafia.
 */
export type AuditAction =
  // agenda
  | "appointment.create"
  | "appointment.confirm"
  | "appointment.arrive"
  | "appointment.start"
  | "appointment.complete"
  | "appointment.reschedule"
  | "appointment.cancel"
  | "appointment.no_show"
  | "schedule.block"
  | "schedule.unblock"
  // comanda
  | "order.open"
  | "order.add_item"
  | "order.remove_item"
  | "order.discount"
  | "order.send_to_cashier"
  | "order.close"
  | "order.reopen"
  // cadastro e acesso
  | "customer.update"
  | "customer.note"
  | "professional.profile_update"
  | "professional.access_grant"
  | "professional.access_revoke"
  | "permissions.update";

export type AuditEntry = {
  barbershopId: string;
  userId?: string | null;
  userName?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  /** Apenas os campos que mudaram — nao o registro inteiro. */
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  /** Request original, para extrair IP e user agent. */
  request?: Request;
};

function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || null;
}

/**
 * Converte o payload para algo que a coluna Json aceita.
 *
 * Passa por `JSON.parse(JSON.stringify(...))` porque os valores vem do
 * dominio e trazem `Date` e `Decimal` do Prisma — nenhum dos dois e
 * `InputJsonValue`. A serializacao resolve os dois de uma vez (Date vira ISO,
 * Decimal vira string) e ainda derruba `undefined`, que quebraria a gravacao.
 */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

/**
 * Grava uma entrada de auditoria. Sempre resolve — nunca rejeita.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        barbershopId: entry.barbershopId,
        userId: entry.userId ?? null,
        userName: entry.userName ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        before: toJson(entry.before),
        after: toJson(entry.after),
        reason: entry.reason ?? null,
        ip: entry.request ? clientIp(entry.request) : null,
        userAgent: entry.request?.headers.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    // Log da falha do log: sem isto, um problema de auditoria some.
    console.error("[audit] falha ao registrar", entry.action, error);
  }
}

/**
 * Diferenca entre dois objetos, restrita as chaves informadas.
 * Devolve `null` quando nada mudou — evita poluir a auditoria com
 * "alteracoes" que nao alteraram nada.
 */
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  keys: (keyof T)[],
): { before: Partial<T>; after: Partial<T> } | null {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  let changed = false;

  for (const key of keys) {
    if (!(key in after)) continue;
    const oldValue = before[key];
    const newValue = after[key] as T[keyof T];

    const normalize = (v: unknown) => (v instanceof Date ? v.toISOString() : v);
    if (normalize(oldValue) === normalize(newValue)) continue;

    b[key] = oldValue;
    a[key] = newValue;
    changed = true;
  }

  return changed ? { before: b, after: a } : null;
}
