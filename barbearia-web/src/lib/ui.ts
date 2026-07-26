/**
 * Vocabulário visual da área do cliente — estilo "editorial".
 *
 * Regras da linguagem (ver pm/identidade-area-do-cliente.md):
 *  - Sem sombra e sem cantos muito arredondados. Estrutura por LINHA fina,
 *    não por cartão flutuante.
 *  - Paleta neutra. Cor só carrega significado (status), nunca decoração.
 *  - Seleção = bloco preto sólido. Não existe "pílula colorida".
 *  - Hierarquia pela tipografia: rótulo minúsculo em caixa alta com tracking
 *    largo + título grande com tracking apertado.
 *
 * Concentrar as classes aqui mantém as seis telas coerentes e torna um
 * ajuste de linguagem uma edição só.
 */

/** Rótulo de seção: "PROFISSIONAL", "HORÁRIOS". */
export const LABEL = "text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400";

/** Título de tela. */
export const TITLE = "text-[28px] font-semibold leading-tight tracking-tight text-neutral-900";

/** Título de seção, dentro da tela. */
export const HEADING = "text-lg font-semibold tracking-tight text-neutral-900";

/** Texto de apoio. */
export const MUTED = "text-sm text-neutral-500";

/** Divisória entre blocos. */
export const RULE = "border-t border-neutral-200";

/** Ação principal. Retangular de propósito. */
export const BUTTON =
  "w-full bg-neutral-900 px-5 py-4 text-sm font-medium tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-40";

/** Ação secundária. */
export const BUTTON_GHOST =
  "w-full border border-neutral-300 px-5 py-4 text-sm font-medium tracking-wide text-neutral-900 transition hover:border-neutral-900";

/** Campo de formulário. */
export const INPUT =
  "w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-3 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900";

/** Bloco selecionável (dia, horário). Estados em `TILE_ON` / `TILE_OFF`. */
export const TILE = "border text-sm transition";
export const TILE_ON = "border-neutral-900 bg-neutral-900 text-white";
export const TILE_OFF = "border-neutral-200 text-neutral-900 hover:border-neutral-900";

/** Cores de status — o único lugar onde cor tem função. */
export const STATUS_TONE: Record<string, string> = {
  SCHEDULED: "text-neutral-900",
  CONFIRMED: "text-emerald-700",
  IN_PROGRESS: "text-amber-700",
  COMPLETED: "text-neutral-400",
  CANCELLED: "text-red-600",
  NO_SHOW: "text-red-600",
  RESCHEDULED: "text-neutral-500",
};
