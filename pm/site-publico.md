# Site publico — planos editaveis, navegacao e dinheiro

Sprint 33. Cobre a landing page (`/`) e o blog: o que o visitante ve antes de
virar cliente. Tres problemas independentes, todos relatados por uso real.

---

## 1. Os planos pareciam estaticos — e na pratica eram

**Sintoma relatado:** "hoje aparece 3 planos estaticos na landing page, quero
que traga eles para eu poder editar na tela do super admin".

**Diagnostico:** os planos ja vinham do banco desde a sprint 13, e a tela
`/admin/planos` ja existia. O que faltava era `revalidate` na pagina.

Sem essa exportacao o Next trata a rota como estatica e a gera **no build**.
A pagina congela no estado do ultimo deploy: editar o preco no admin gravava
no banco corretamente, mas o site continuava mostrando o valor antigo. Do
ponto de vista de quem usa, os planos eram estaticos — o codigo dizia o
contrario, o comportamento nao.

**Correcao:** `export const revalidate = 60` em `src/app/page.tsx`. A pagina
segue vindo de cache (rapida para trafego organico) e a alteracao aparece em
ate um minuto, sem deploy.

> Licao para o resto do projeto: **toda pagina publica que le do banco precisa
> declarar `revalidate`**. O padrao do Next e estatico, e o sintoma so aparece
> em producao — em `npm run dev` tudo e renderizado a cada request e o bug
> fica invisivel.

### Selo "Mais popular"

Era calculado: o plano do **meio** da lista de ativos. Dois problemas — a
decisao nao era de quem vende, e o selo **mudava sozinho** ao criar ou
desativar um plano.

Virou o campo `Plan.highlighted`, com botao na tela do admin. E exclusivo: o
`PATCH` desmarca os demais dentro da mesma transacao, senao a landing poderia
exibir dois destaques. A migration `20260728000002_plan_highlighted` marca o
plano que a pagina ja vinha mostrando, para o selo nao sumir no deploy.

### Grade

Estava fixa em `lg:grid-cols-3`. Um quarto plano deixaria um card sozinho na
segunda linha. Passou a se adaptar a quantidade (2, 3 ou 4+ colunas).

---

## 2. O menu sumia no celular

**Sintoma relatado:** "a landing page quando abro em meu celular, nao aparece
o menu".

**Diagnostico:** os links estavam em `hidden ... sm:flex` e **nao havia botao
para abri-los**. Nao era um menu escondido — era um menu inexistente abaixo de
640px. Quem entrava pelo telefone via o logo e os dois botoes de conta, sem
nenhum caminho para precos ou funcionalidades. Numa landing, esse e o publico
majoritario.

**Correcao:** `src/components/LandingNav.tsx`, barra unica do site publico.

- Menu recolhivel abaixo de `md`, botao de 44px (alvo de toque minimo).
- Fecha ao escolher um item, no `Escape` e ao girar o aparelho — sem este
  ultimo o estado ficaria preso em aberto quando o painel some no desktop.
- Painel **no fluxo**, empurrando o conteudo, e nao sobreposto: sobreposto,
  um toque impreciso fecharia o menu em vez de acionar o link.
- `Entrar` fica oculto no cabecalho do celular por falta de espaco, entao e
  repetido dentro do painel — senao nao haveria como fazer login.
- Prop `base`: na landing as ancoras sao locais (`#planos`); no blog precisam
  voltar para a home antes (`/#planos`).

O blog tinha um cabecalho proprio com o mesmo risco e passou a usar a mesma
barra.

**Menu:** Inicio · Sobre · Funcionalidades · **Precos** · Revendedor · Blog.
"Planos" virou "Precos" — aponta para a mesma secao.

**Ancoras:** com a barra fixa no topo, clicar num item parava com o titulo
escondido atras dela. `scroll-mt-20` nas secoes ancoraveis.

---

## 3. Preco arredondado

**Sintoma relatado:** "coloquei um plano por 19,90 e na landing apareceu 20".

**Diagnostico:** a vitrine usava `toFixed(0)`. Nao e formatacao imprecisa, e
arredondamento: R$ 19,90 vira "R$ 20", R$ 99,50 vira "R$ 100". Preco anunciado
diferente do preco cobrado — o tipo de erro que gera reclamacao e, dependendo
do caso, questionamento de propaganda enganosa.

A busca pela causa revelou o mesmo defeito espalhado. `toFixed(2)` aparecia em
**16 outros pontos**, imprimindo formato americano: `R$ 19.90` com ponto e
`R$ 1234.50` sem separador de milhar. Entre eles, a **tela de fechamento de
comanda** — subtotal, desconto, total e comissao, ou seja, o valor que o
cliente paga.

**Correcao:** `src/lib/money.ts` como ponto unico.

| Funcao | Uso |
|---|---|
| `formatBRL(valor)` | Texto corrido: "R$ 1.234,50". Aceita Decimal do Prisma, string ou numero. |
| `splitBRL(valor)` | Separa reais e centavos para a vitrine, onde o centavo aparece em corpo menor. |

`splitBRL` usa `Intl.formatToParts` em vez de aritmetica. Subtrair a parte
inteira parece obvio e esta errado: `19.90 - 19` da `0.8999999999999986` em
ponto flutuante, e arredondar isso a mao e exatamente como o centavo se perde.
Delegando ao mesmo formatador que gera o texto no resto do sistema, nao ha
como as duas exibicoes divergirem.

Corrigido de passagem um `?.amount` no fechamento de comanda que, apos a
troca, exibiria "R$ NaN" quando nao existe regra de comissao aplicavel.

**Casos verificados:** 19,90 · 19,99 · 20 · 0,10 · 99,50 · 1.234,50 ·
1.234.567,89 · 0 · 0,05.

> Pendencia: as **entradas** de valor nao foram tocadas. Os formularios usam
> `<input type="number">`, que exige ponto como separador decimal — digitar
> "19,90" no padrao brasileiro nao funciona. Vale uma sprint futura de mascara
> de moeda nos campos.

---

## 4. Secao Sobre

Nova secao ancorada em `#sobre`, respondendo quatro perguntas em blocos
curtos: **o que e**, **para quem e**, **como funciona** e **quanto custa**.
Escrita em termos concretos (agenda, caixa, estoque; o cliente agenda sozinho;
o barbeiro ve so a propria agenda) em vez de adjetivos de marketing — a
promessa precisa bater com o que o trial entrega.

---

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/LandingNav.tsx` | Novo. Barra do site publico com menu de celular. |
| `src/lib/money.ts` | Novo. `formatBRL` e `splitBRL`. |
| `src/app/page.tsx` | `revalidate`, secao Sobre, grade adaptativa, selo do banco, preco sem arredondar, `scroll-mt`. |
| `src/app/blog/page.tsx` | Passou a usar a `LandingNav`. |
| `src/app/admin/planos/page.tsx` | Botao do selo "Mais popular"; erros das acoes exibidos. |
| `src/app/api/admin/planos/[id]/route.ts` | Aceita `highlighted`, exclusivo em transacao. |
| `src/app/(panel)/comanda/[id]/page.tsx` | 11 valores passaram por `formatBRL`. |
| `src/app/admin/{barbearias/[id],planos,revendedores}` | 5 valores passaram por `formatBRL`. |
| `prisma/migrations/20260728000002_plan_highlighted` | Campo `highlighted` + preservacao do destaque atual. |
