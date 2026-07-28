/**
 * Teste do renderizador de markdown — o primeiro teste automatizado do projeto.
 *
 * Existe porque `lib/markdown.ts` transforma texto que pode vir de FORA (a
 * automacao do n8n publica por API) em HTML que vai para a landing. Um erro
 * aqui e XSS no site inteiro.
 *
 * A checagem que importa: toda tag na saida tem que ser uma das que o
 * renderizador emite. Conteudo escapado nao produz `<`, entao qualquer tag
 * inesperada significa injecao.
 *
 * Como rodar:
 *   npx tsc --target es2020 --module esnext --moduleResolution bundler \
 *           --outDir .tmp-md src/lib/markdown.ts
 *   mv .tmp-md/markdown.js .tmp-md/markdown.mjs
 *   node scripts/test-markdown.mjs
 */

const { markdownToHtml, markdownToPlainText, slugify } =
  await import("../.tmp-md/markdown.mjs");

const PERMITIDAS = ["p","h2","h3","h4","ul","ol","li","blockquote","hr","strong","em","code","pre","a"];

const tagsCruas = (html) =>
  [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g)]
    .map((m) => m[1].toLowerCase())
    .filter((t) => !PERMITIDAS.includes(t));

const atributosDeEvento = (html) =>
  [...html.matchAll(/<[^>]*?\son\w+\s*=[^>]*>/gi)].map((m) => m[0]);

const hrefsRuins = (html) =>
  [...html.matchAll(/href="([^"]*)"/g)]
    .map((m) => m[1])
    .filter((h) => !/^(https?:\/\/|\/|#|mailto:)/i.test(h));

const ATAQUES = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg onload=alert(1)>",
  '<iframe src="evil"></iframe>',
  '<a href="javascript:alert(1)">x</a>',
  "[c](javascript:alert(1))",
  "[c](JaVaScRiPt:alert(1))",
  '[c](https://a.com" onmouseover="alert(1))',
  "[c](data:text/html;base64,PHNjcmlwdD4=)",
  "[c](vbscript:msgbox(1))",
  "**a** <b>b</b> `<i>c</i>`",
  "> <script>x</script>",
  "# <script>t</script>",
  "- <img onerror=x>",
  "```\n<script>a</script>\n```",
];

const ESTRUTURA = [
  ["<h2", "# Titulo"],
  ["<h3", "### Sub"],
  ["<p", "paragrafo"],
  ["<ul", "- item"],
  ["<ol", "1. item"],
  ["<blockquote", "> citacao"],
  ["<hr", "---"],
  ["<strong", "**negrito**"],
  ["<em", "*italico*"],
  ["<code", "`codigo`"],
  ["<a href", "[link](https://x.com)"],
];

let falhas = 0;

console.log("XSS");
for (const entrada of ATAQUES) {
  const out = markdownToHtml(entrada);
  const problemas = [
    ...tagsCruas(out).map((t) => `tag <${t}>`),
    ...atributosDeEvento(out).map(() => "atributo de evento"),
    ...hrefsRuins(out).map((h) => `href ${h}`),
  ];
  if (problemas.length) {
    falhas++;
    console.log(`  FALHOU  ${JSON.stringify(entrada)}\n          ${problemas.join(", ")}`);
  } else {
    console.log(`  ok      ${JSON.stringify(entrada).slice(0, 56)}`);
  }
}

console.log("\nEstrutura");
for (const [tag, entrada] of ESTRUTURA) {
  const ok = markdownToHtml(entrada).includes(tag);
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok    " : "FALHOU"}  ${tag.padEnd(12)} <- ${entrada}`);
}

console.log("\nAuxiliares");
const casos = [
  [slugify("Tendências das Barbearias: o que está mudando"),
   "tendencias-das-barbearias-o-que-esta-mudando"],
  [markdownToPlainText("# T\n\nUm **texto** com `codigo`.", 100),
   "T Um texto com codigo."],
];
for (const [obtido, esperado] of casos) {
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok    " : "FALHOU"}  ${obtido}`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
