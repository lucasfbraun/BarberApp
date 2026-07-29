/**
 * Caminho do painel do SaaS.
 *
 * Os arquivos ficam em `app/admin/*`, mas a URL publica pode ser outra,
 * definida por `ADMIN_PATH`. O middleware reescreve `/<segredo>/x` para
 * `/admin/x` e devolve 404 para quem tenta `/admin/x` direto.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ISTO NAO E SEGURANCA. E reducao de ruido.
 *
 *  Um caminho dificil de adivinhar tira o painel das listas de varredura
 *  automatica — aqueles robos que testam /admin, /wp-admin, /painel em todo
 *  dominio da internet. Quem tem credencial entra do mesmo jeito, e quem
 *  descobre o caminho continua batendo no `resolveAdmin`.
 *
 *  A protecao real e o papel SUPERADMIN validado no banco a cada requisicao.
 *  O caminho secreto e a camada de fora, nunca a unica.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `ADMIN_PATH` NAO leva o prefixo `NEXT_PUBLIC_`: assim o valor nao entra no
 * pacote JavaScript da landing, onde qualquer visitante leria.
 */

/** Onde os arquivos moram. Nunca muda. */
export const ADMIN_DIR = "/admin";

/** Caminho publico do painel — `/admin` por padrao. */
export function adminBasePath(): string {
  const bruto = process.env.ADMIN_PATH?.trim().replace(/^\/+|\/+$/g, "");
  if (!bruto) return ADMIN_DIR;

  // So o que e seguro numa URL. Um valor com barra ou espaco viraria uma rota
  // quebrada dificil de diagnosticar.
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/i.test(bruto)) {
    console.warn(
      `[admin-path] ADMIN_PATH="${bruto}" invalido (use 3-64 caracteres: letras, numeros e hifens). Usando /admin.`,
    );
    return ADMIN_DIR;
  }

  // Colisao com rota existente deixaria o app com duas donas do mesmo
  // caminho, e a que perde some sem aviso.
  const reservados = [
    "admin", "api", "agenda", "blog", "caixa", "cadastro", "cliente",
    "clientes", "comanda", "configuracoes", "estoque", "login", "permissoes",
    "profissional", "profissionais", "relatorio", "revendedor", "s",
    "servicos", "senha", "trial-expirado", "esqueci-senha", "redefinir-senha",
  ];
  if (reservados.includes(bruto.toLowerCase())) {
    console.warn(`[admin-path] ADMIN_PATH="${bruto}" colide com uma rota existente. Usando /admin.`);
    return ADMIN_DIR;
  }

  return `/${bruto}`;
}

/** `true` quando o painel foi movido para um caminho proprio. */
export function adminPathPersonalizado(): boolean {
  return adminBasePath() !== ADMIN_DIR;
}
