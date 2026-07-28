/**
 * Redefinicao de senha — geracao e verificacao de token (E1).
 *
 * O token vai por e-mail em claro; no banco fica so o SHA-256 dele. Assim um
 * vazamento do banco nao entrega tokens utilizaveis — mesmo raciocinio do
 * hash de senha, com a diferenca de que aqui basta SHA-256: o token ja tem
 * 256 bits de entropia aleatoria, entao nao ha o que quebrar por forca bruta
 * e nao precisamos do custo do bcrypt.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** Validade do link. Curto o suficiente para limitar a janela de uso indevido. */
export const RESET_TOKEN_TTL_MINUTES = 60;

/** Tamanho minimo da senha nova — mesmo do cadastro. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Gera o par (token em claro, hash para o banco).
 * `base64url` evita caracteres que quebram em querystring.
 */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Comparacao em tempo constante.
 *
 * A busca no banco e por `tokenHash` (indice unico), entao na pratica a
 * comparacao ja aconteceu no Postgres. Esta funcao existe para os casos em
 * que precisamos conferir dois hashes em memoria sem abrir uma brecha de
 * timing.
 */
export function tokensMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Valida a senha nova. Devolve a mensagem de erro, ou `null` se estiver ok. */
export function validatePassword(password: string | undefined): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > 200) {
    // Teto para nao gastar CPU do bcrypt com entrada absurda.
    return "Senha muito longa.";
  }
  return null;
}

/** Corpo do e-mail de redefinicao. */
export function resetEmailBody(name: string, link: string): { text: string; html: string } {
  const text = [
    `Ola, ${name}.`,
    "",
    "Recebemos um pedido para redefinir a sua senha no lbraunapp.",
    "Para escolher uma senha nova, abra o link abaixo:",
    "",
    link,
    "",
    `O link vale por ${RESET_TOKEN_TTL_MINUTES} minutos e pode ser usado uma vez so.`,
    "",
    "Se nao foi voce quem pediu, ignore esta mensagem: sua senha continua a mesma.",
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.6;">
      <p>Olá, ${escapeHtml(name)}.</p>
      <p>Recebemos um pedido para redefinir a sua senha no <strong>lbraunapp</strong>.</p>
      <p>
        <a href="${escapeHtml(link)}"
           style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 20px; text-decoration: none;">
          Escolher nova senha
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">
        O link vale por ${RESET_TOKEN_TTL_MINUTES} minutos e pode ser usado uma vez só.<br>
        Se não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.
      </p>
    </div>
  `.trim();

  return { text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
