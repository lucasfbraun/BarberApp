/**
 * Preferencias de atendimento do cliente (secao 7 do Portal do Profissional).
 *
 * Guardadas em `Customer.preferences` (Json) e nao em colunas: o conjunto
 * varia por barbearia e cresce com o uso. O preco disso e nao ter validacao do
 * banco — entao a validacao vive aqui, e toda escrita passa por
 * `sanitizePreferences`. Nada entra no banco sem passar por esta funcao.
 */

/** Campos livres de texto curto. */
const TEXT_FIELDS = [
  "haircut", // tipo de corte
  "clipperSize", // numero da maquina
  "fadeHeight", // altura do degrade
  "finish", // preferencia de acabamento
  "beard", // modelo de barba
  "products", // produtos utilizados
  "notes", // observacoes especificas
] as const;

/** Campos sensiveis: alergia e restricao. Separados por serem de seguranca. */
const SAFETY_FIELDS = ["skinSensitivity", "restrictions"] as const;

export type CustomerPreferences = Partial<
  Record<(typeof TEXT_FIELDS)[number] | (typeof SAFETY_FIELDS)[number], string>
>;

export const PREFERENCE_LABELS: Record<keyof CustomerPreferences, string> = {
  haircut: "Tipo de corte",
  clipperSize: "Numero da maquina",
  fadeHeight: "Altura do degrade",
  finish: "Acabamento",
  beard: "Modelo de barba",
  products: "Produtos utilizados",
  notes: "Observacoes",
  skinSensitivity: "Sensibilidade de pele",
  restrictions: "Restricoes",
};

export const PREFERENCE_KEYS = [
  ...TEXT_FIELDS,
  ...SAFETY_FIELDS,
] as (keyof CustomerPreferences)[];

/** Campos que a tela destaca em vermelho — o barbeiro precisa ver antes. */
export const SAFETY_KEYS = SAFETY_FIELDS as readonly (keyof CustomerPreferences)[];

const MAX_LENGTH = 500;

/**
 * Aceita apenas as chaves conhecidas, corta o tamanho e descarta vazios.
 * Campo apagado (string vazia) some do objeto em vez de virar `""`.
 */
export function sanitizePreferences(input: unknown): CustomerPreferences {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const source = input as Record<string, unknown>;
  const out: CustomerPreferences = {};

  for (const key of PREFERENCE_KEYS) {
    const value = source[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, MAX_LENGTH);
    if (!trimmed) continue;
    out[key] = trimmed;
  }

  return out;
}

/** Le o Json do banco de volta para um objeto tipado e seguro. */
export function readPreferences(value: unknown): CustomerPreferences {
  return sanitizePreferences(value);
}

/** `true` quando ha alguma informacao de seguranca preenchida. */
export function hasSafetyInfo(prefs: CustomerPreferences): boolean {
  return SAFETY_KEYS.some((key) => Boolean(prefs[key]));
}
