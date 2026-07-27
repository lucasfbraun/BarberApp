/**
 * Vocabulario visual do Portal do Profissional.
 *
 * Reaproveita a linguagem "editorial azul" da area do cliente (`lib/ui.ts`) —
 * estrutura por linha fina, sem cartao flutuante, acento `blue-600` — porque o
 * portal e usado no celular pelas mesmas maos e nao faz sentido treinar duas
 * gramaticas visuais.
 *
 * O que muda em relacao ao cliente, e por que:
 *  - ALVOS MAIORES. A secao 27 pede "botoes grandes para uso em celular": o
 *    barbeiro opera de pe, com a mao ocupada, as vezes com luva. Todo alvo
 *    toca no minimo 44px de altura.
 *  - CORES DE STATUS COM PESO. Na area do cliente o status e informativo;
 *    aqui ele dirige a acao seguinte, entao ganha fundo, nao so texto.
 *  - AcAO PRINCIPAL FIXA. A secao 22 pede um botao contextual permanente
 *    ("Iniciar atendimento" / "Finalizar atendimento").
 */

export const PAGE = "min-h-screen bg-slate-50 text-slate-900";

/** Rotulo de secao: "PROXIMO CLIENTE", "HOJE". */
export const LABEL = "text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400";

export const TITLE = "text-[28px] font-semibold leading-tight tracking-tight text-slate-900";
export const HEADING = "text-lg font-semibold tracking-tight text-slate-900";
export const MUTED = "text-sm text-slate-500";
export const RULE = "border-t border-slate-200";

/** Numero grande de indicador (producao, comissao, contagem). */
export const METRIC = "text-2xl font-semibold tracking-tight text-slate-900 tabular-nums";

/** Acao principal. Altura confortavel para uso em pe. */
export const BUTTON =
  "flex w-full items-center justify-center gap-2 bg-blue-600 px-5 py-4 text-sm font-medium tracking-wide text-white transition hover:bg-blue-500 disabled:opacity-40";

export const BUTTON_GHOST =
  "flex w-full items-center justify-center gap-2 border border-slate-300 px-5 py-4 text-sm font-medium tracking-wide text-slate-900 transition hover:border-blue-600 hover:text-blue-600 disabled:opacity-40";

/** Acao destrutiva (cancelar, marcar falta). */
export const BUTTON_DANGER =
  "flex w-full items-center justify-center gap-2 border border-red-300 px-5 py-4 text-sm font-medium tracking-wide text-red-700 transition hover:border-red-600 hover:bg-red-50 disabled:opacity-40";

/** Acao secundaria compacta, usada em linha de agendamento. */
export const CHIP =
  "inline-flex min-h-[44px] items-center justify-center border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-blue-600 hover:text-blue-600 disabled:opacity-40";

export const CHIP_PRIMARY =
  "inline-flex min-h-[44px] items-center justify-center bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-40";

export const INPUT =
  "w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600";

export const TEXTAREA =
  "w-full border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600";

export const SELECT =
  "w-full border-0 border-b border-slate-300 bg-transparent py-3 text-base text-slate-900 outline-none focus:border-blue-600";

/** Aviso em linha — barra azul a esquerda, sem cartao. */
export const NOTICE =
  "border-l-2 border-blue-600 py-1 pl-4 text-sm leading-relaxed text-slate-500";

/** Aviso de atencao — usado em alergia/restricao do cliente. */
export const ALERT =
  "border-l-2 border-red-500 bg-red-50 py-2 pl-4 pr-3 text-sm leading-relaxed text-red-800";

/** Rotulos em portugues de cada status de atendimento. */
export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  ARRIVED: "Cliente chegou",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
  NO_SHOW: "Nao compareceu",
  RESCHEDULED: "Reagendado",
};

/**
 * Cor por status. Fundo — nao so texto — porque na agenda do dia o barbeiro
 * precisa achar "quem esta esperando" de relance.
 */
export const STATUS_TONE: Record<string, string> = {
  SCHEDULED: "bg-slate-100 text-slate-600",
  CONFIRMED: "bg-blue-50 text-blue-700",
  ARRIVED: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-slate-100 text-slate-400",
  CANCELLED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-red-50 text-red-700",
  RESCHEDULED: "bg-slate-100 text-slate-500",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  AWAITING_PAYMENT: "No caixa",
  CLOSED: "Paga",
  CANCELLED: "Cancelada",
  REFUNDED: "Estornada",
};

export const ORDER_STATUS_TONE: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  AWAITING_PAYMENT: "bg-amber-100 text-amber-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-50 text-red-700",
  REFUNDED: "bg-red-50 text-red-700",
};

/** Origem do agendamento, legivel (secao 4). */
export const SOURCE_LABELS: Record<string, string> = {
  admin_panel: "Recepcao",
  public_page: "Portal do cliente",
  professional: "Profissional",
  professional_walk_in: "Encaixe",
  whatsapp: "WhatsApp",
};

export function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatTime(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDayMonth(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

/** "Segunda-feira, 27 de julho" com a primeira letra maiuscula. */
export function formatLongDate(dateStr: string, timeZone: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const text = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
