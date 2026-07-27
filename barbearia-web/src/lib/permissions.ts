/**
 * Permissoes do papel PROFESSIONAL (secao 18 do Portal do Profissional).
 *
 * Fonte unica dos defaults. A tabela `BarbershopPermissions` guarda apenas o
 * que o gestor mudou; a ausencia de linha significa "usar os padroes
 * recomendados". Resolver aqui — e nao no banco — garante que uma permissao
 * nova nasca com valor definido para todas as barbearias, sem migration de
 * dados e sem risco de `undefined` virar `false` por acidente.
 *
 * O que NAO esta aqui e proposital. A secao 18 marca como "Sempre permitido"
 * ou "Nao permitido" um conjunto de itens que a secao 23 reforca; deixa-los
 * configuraveis permitiria ao gestor conceder acesso ao caixa geral ou a
 * comissao de colegas. Esses continuam como regra fixa de codigo.
 */

import { prisma } from "@/lib/prisma";

export type ProfessionalPermissions = {
  canViewOthersAgenda: boolean;
  canCreateAppointment: boolean;
  canReschedule: boolean;
  canCancelAppointment: boolean;
  canCreateWalkIn: boolean;
  canBlockSchedule: boolean;
  canViewCustomerPhone: boolean;
  canEditCustomer: boolean;
  maxDiscountPercent: number;
  canReceivePayment: boolean;
  canViewTeamRanking: boolean;
};

/** Padroes da coluna "Configuracao recomendada" da secao 18. */
export const DEFAULT_PERMISSIONS: ProfessionalPermissions = {
  canViewOthersAgenda: false,
  canCreateAppointment: true,
  canReschedule: true,
  canCancelAppointment: false,
  canCreateWalkIn: false,
  canBlockSchedule: true,
  canViewCustomerPhone: true,
  canEditCustomer: false,
  maxDiscountPercent: 0,
  canReceivePayment: false,
  canViewTeamRanking: false,
};

/** Rotulos em portugues para a tela de configuracao do gestor. */
export const PERMISSION_LABELS: Record<keyof ProfessionalPermissions, string> = {
  canViewOthersAgenda: "Ver a agenda dos colegas",
  canCreateAppointment: "Criar agendamento",
  canReschedule: "Reagendar atendimento",
  canCancelAppointment: "Cancelar atendimento",
  canCreateWalkIn: "Criar encaixe (fora da grade de horarios)",
  canBlockSchedule: "Bloquear o proprio horario",
  canViewCustomerPhone: "Ver o telefone do cliente",
  canEditCustomer: "Editar o cadastro do cliente",
  maxDiscountPercent: "Desconto maximo na comanda (%)",
  canReceivePayment: "Receber pagamento (fechar a comanda)",
  canViewTeamRanking: "Ver o ranking da equipe",
};

/** Explicacao curta mostrada abaixo de cada permissao na tela do gestor. */
export const PERMISSION_HINTS: Partial<Record<keyof ProfessionalPermissions, string>> = {
  canCancelAppointment:
    "Com isto desligado, o barbeiro marca falta mas nao cancela — o cancelamento fica com a recepcao.",
  canCreateWalkIn:
    "Permite agendar em horario ocupado ou fora da jornada. Use com cautela: ignora a grade de disponibilidade.",
  canViewCustomerPhone:
    "Desligue se a barbearia prefere que o contato com o cliente passe sempre pela recepcao.",
  canEditCustomer:
    "Observacoes e preferencias de atendimento continuam liberadas mesmo com isto desligado.",
  maxDiscountPercent:
    "0 desliga o desconto. O limite vale por comanda e e conferido no servidor.",
  canReceivePayment:
    "Desligado, o barbeiro so envia a comanda para o caixa; quem recebe e a recepcao.",
};

export const PERMISSION_KEYS = Object.keys(DEFAULT_PERMISSIONS) as (keyof ProfessionalPermissions)[];

/**
 * Permissoes efetivas do tenant: padroes sobrescritos pelo que o gestor salvou.
 * Se a consulta falhar, devolve os padroes — a agenda do dia nao deve cair
 * porque a tabela de configuracao esta indisponivel, e os padroes sao a
 * hipotese conservadora.
 */
export async function getPermissions(barbershopId: string): Promise<ProfessionalPermissions> {
  try {
    const saved = await prisma.barbershopPermissions.findUnique({
      where: { barbershopId },
    });

    if (!saved) return { ...DEFAULT_PERMISSIONS };

    return {
      canViewOthersAgenda: saved.canViewOthersAgenda,
      canCreateAppointment: saved.canCreateAppointment,
      canReschedule: saved.canReschedule,
      canCancelAppointment: saved.canCancelAppointment,
      canCreateWalkIn: saved.canCreateWalkIn,
      canBlockSchedule: saved.canBlockSchedule,
      canViewCustomerPhone: saved.canViewCustomerPhone,
      canEditCustomer: saved.canEditCustomer,
      maxDiscountPercent: saved.maxDiscountPercent,
      canReceivePayment: saved.canReceivePayment,
      canViewTeamRanking: saved.canViewTeamRanking,
    };
  } catch (error) {
    console.error("[permissions] falha ao ler; usando padroes", error);
    return { ...DEFAULT_PERMISSIONS };
  }
}

/** Normaliza um payload da tela do gestor, descartando campo desconhecido. */
export function sanitizePermissionPayload(
  input: Record<string, unknown>,
): Partial<ProfessionalPermissions> {
  const out: Partial<ProfessionalPermissions> = {};

  for (const key of PERMISSION_KEYS) {
    const value = input[key];
    if (value === undefined) continue;

    if (key === "maxDiscountPercent") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100) continue;
      out.maxDiscountPercent = n;
    } else if (typeof value === "boolean") {
      (out as Record<string, boolean>)[key] = value;
    }
  }

  return out;
}
