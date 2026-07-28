/**
 * Envio de e-mail transacional.
 *
 * SEM DEPENDENCIA NOVA — por decisao. O projeto nao usa nodemailer nem SDK de
 * provedor; aqui falamos HTTP direto com a API do provedor via `fetch`, que ja
 * existe no runtime. Trocar de provedor e trocar esta funcao, nao o
 * `package.json`.
 *
 * TRES MODOS, conforme o ambiente:
 *  1. `RESEND_API_KEY` configurado  -> envia de verdade;
 *  2. nada configurado, em DEV      -> imprime o e-mail no console do servidor,
 *                                      para o fluxo poder ser testado sem conta
 *                                      de provedor;
 *  3. nada configurado, em PRODUCAO -> falha explicitamente. Um e-mail de
 *                                      redefinicao que silenciosamente nao sai
 *                                      e pior do que um erro: a pessoa fica
 *                                      esperando para sempre.
 */

export type MailMessage = {
  to: string;
  subject: string;
  /** Corpo em texto puro. Obrigatorio — nem todo cliente exibe HTML. */
  text: string;
  html?: string;
};

export type MailResult =
  | { ok: true; delivered: boolean; provider: string }
  | { ok: false; error: string };

function fromAddress(): string {
  // Remetente verificado no provedor. Sem isso o envio e recusado.
  return process.env.MAIL_FROM || "nao-responda@barvioapp.com.br";
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // Modo 2 e 3: sem provedor configurado.
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mailer] RESEND_API_KEY ausente em producao — e-mail NAO enviado");
      return { ok: false, error: "Servico de e-mail nao configurado." };
    }

    // Em desenvolvimento, o link vai para o console — e o que permite testar
    // o fluxo inteiro sem conta de provedor.
    console.info(
      [
        "",
        "──────────── E-MAIL (modo desenvolvimento) ────────────",
        `Para:     ${message.to}`,
        `Assunto:  ${message.subject}`,
        "",
        message.text,
        "───────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { ok: true, delivered: false, provider: "console" };
  }

  // Modo 1: envio real.
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[mailer] provedor recusou", response.status, detail.slice(0, 500));
      return { ok: false, error: "Nao foi possivel enviar o e-mail." };
    }

    return { ok: true, delivered: true, provider: "resend" };
  } catch (error) {
    console.error("[mailer] falha de rede", error);
    return { ok: false, error: "Nao foi possivel enviar o e-mail." };
  }
}

/** Base publica da aplicacao, para montar links absolutos. */
export function appUrl(path = ""): string {
  const base = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
