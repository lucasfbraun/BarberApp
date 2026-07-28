/**
 * Data civil no navegador — utilitarios do PAINEL.
 *
 * Existe por um motivo especifico: `new Date().toISOString().slice(0, 10)`
 * devolve a data em UTC, nao a do usuario. Depois das 21h no horario de
 * Brasilia isso ja aponta para o dia seguinte — a agenda abria no dia errado
 * justamente no fim do expediente, quando a barbearia ainda esta cheia.
 *
 * `en-CA` formata como YYYY-MM-DD, exatamente o formato que a API espera.
 *
 * Nas telas do portal do profissional o fuso vem da barbearia (a API devolve
 * `timezone` na resposta). Aqui usamos o fuso do proprio aparelho, que para o
 * painel — usado dentro da loja — e o mesmo.
 */

/** Hoje, "YYYY-MM-DD", no fuso do aparelho. */
export function todayLocalDate(timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Soma dias a uma data civil sem passar pelo relogio local. */
export function addDaysToDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** "27/07/2026" a partir de "2026-07-27", sem criar Date no fuso local. */
export function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
