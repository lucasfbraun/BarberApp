/**
 * Formatação de dinheiro — ponto único.
 *
 * Existiam três jeitos espalhados pela base, dois deles errados:
 *
 *  - `toFixed(0)`  → ARREDONDAVA. Um plano de R$ 19,90 aparecia como "R$ 20"
 *                    na landing. Preço anunciado diferente do cobrado não é
 *                    detalhe estético.
 *  - `toFixed(2)`  → formato americano: "R$ 19.90" com PONTO, e sem separador
 *                    de milhar ("R$ 1234.50" em vez de "R$ 1.234,50").
 *  - `toLocaleString("pt-BR", ...)` → correto, mas repetido em 12 arquivos.
 *
 * Tudo que exibe valor deve passar por aqui.
 */

const FORMATADOR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** "R$ 1.234,50". Aceita Decimal do Prisma, string ou número. */
export function formatBRL(value: number | string | { toString(): string }): string {
  return FORMATADOR.format(Number(value));
}

/**
 * Separa reais e centavos para a vitrine de preços, onde o centavo aparece
 * menor ao lado do número grande.
 *
 * Usa `formatToParts` em vez de aritmética: `19.90 - 19` dá
 * 0.8999999999999986 em ponto flutuante, e arredondar isso à mão é como o
 * centavo se perde. Aqui quem separa é o próprio formatador — o mesmo que
 * gera o texto no resto do sistema, então não há como divergir.
 */
export function splitBRL(value: number | string): { reais: string; centavos: string } {
  const partes = FORMATADOR.formatToParts(Number(value));

  const reais = partes
    .filter((p) => p.type === "integer" || p.type === "group")
    .map((p) => p.value)
    .join("");

  const centavos = partes.find((p) => p.type === "fraction")?.value ?? "00";

  return { reais, centavos };
}
