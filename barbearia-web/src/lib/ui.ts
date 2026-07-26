/**
 * Vocabulário visual da área do cliente — "editorial azul".
 *
 * Regras da linguagem (ver pm/identidade-area-do-cliente.md):
 *  - Estrutura por LINHA fina, não por cartão flutuante. Sem sombra,
 *    sem cantos arredondados. É isso que diferencia da concorrência.
 *  - Cinza da família `slate` (frio, puxado para o azul) e acento
 *    `blue-600` (#2563eb) — o mesmo do manifesto do PWA e da barra
 *    inferior, para o app instalado ficar coerente de ponta a ponta.
 *  - O azul carrega AÇÃO e SELEÇÃO. Verde/vermelho/âmbar só em status.
 *  - Hierarquia pela tipografia: rótulo minúsculo em caixa alta com
 *    tracking largo + título grande com tracking apertado.
 *
 * Concentrar as classes aqui mantém as seis telas coerentes e torna um
 * ajuste de linguagem uma edição só.
 */

/** Acento da marca. Trocar aqui muda a identidade inteira. */
export const ACCENT_TEXT = "text-blue-600";
export const ACCENT_BORDER = "border-blue-600";

/** Fundo das telas do cliente — branco levemente azulado. */
export const PAGE = "bg-slate-50 text-slate-900";

/** Rótulo de seção: "PROFISSIONAL", "HORÁRIOS". */
export const LABEL = "text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400";

/** Título de tela. */
export const TITLE = "text-[28px] font-semibold leading-tight tracking-tight text-slate-900";

/** Título de seção, dentro da tela. */
export const HEADING = "text-lg font-semibold tracking-tight text-slate-900";

/** Texto de apoio. */
export const MUTED = "text-sm text-slate-500";

/** Divisória entre blocos. */
export const RULE = "border-t border-slate-200";

/** Ação principal. Retangular de propósito. */
export const BUTTON =
  "w-full bg-blue-600 px-5 py-4 text-sm font-medium tracking-wide text-white transition hover:bg-blue-500 disabled:opacity-40";

/** Ação secundária. */
export const BUTTON_GHOST =
  "w-full border border-slate-300 px-5 py-4 text-sm font-medium tracking-wide text-slate-900 transition hover:border-blue-600 hover:text-blue-600";

/** Campo de formulário. */
export const INPUT =
  "w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600";

/** Bloco selecionável (dia, horário). Estados em `TILE_ON` / `TILE_OFF`. */
export const TILE = "border text-sm transition";
export const TILE_ON = "border-blue-600 bg-blue-600 text-white";
export const TILE_OFF = "border-slate-200 text-slate-900 hover:border-blue-600 hover:text-blue-600";

/** Aviso em linha — barra azul à esquerda, sem cartão. */
export const NOTICE = "border-l-2 border-blue-600 py-1 pl-4 text-sm leading-relaxed text-slate-500";

/** Cores de status — o único lugar onde a cor não é a da marca. */
export const STATUS_TONE: Record<string, string> = {
  SCHEDULED: "text-blue-600",
  CONFIRMED: "text-emerald-600",
  IN_PROGRESS: "text-amber-600",
  COMPLETED: "text-slate-400",
  CANCELLED: "text-red-600",
  NO_SHOW: "text-red-600",
  RESCHEDULED: "text-slate-500",
};
