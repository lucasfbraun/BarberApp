/**
 * Rate limiting simples por IP (janela deslizante, em memória).
 *
 * Observação: em ambiente serverless (Vercel) cada instância tem sua própria
 * memória, então o limite é "por instância" — é uma proteção básica contra
 * spam/burst. Para limite global e persistente, migrar para Upstash Redis
 * (@upstash/ratelimit) quando houver conta configurada.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitOptions = {
  /** Máximo de requisições dentro da janela */
  limit: number;
  /** Janela em milissegundos */
  windowMs: number;
};

/** Extrai o IP do cliente dos headers (Vercel/proxies). */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Retorna true se a requisição EXCEDEU o limite (deve ser bloqueada).
 * A chave deve combinar rota + IP, ex.: `onboarding:${ip}`.
 */
export function isRateLimited(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  // Limpeza defensiva para não crescer sem limite.
  if (buckets.size > MAX_BUCKETS) buckets.clear();

  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= opts.limit) {
    buckets.set(key, bucket);
    return true;
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return false;
}

/** Resposta 429 padrão. */
export function rateLimitResponse() {
  return new Response(
    JSON.stringify({ error: "Muitas requisicoes. Aguarde um momento e tente novamente." }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}
