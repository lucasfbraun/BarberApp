# Type check antes do deploy

**28/07/2026**

O `next build` roda o TypeScript e **para no primeiro erro**. Cada deploy quebrado revela um erro só — e cada ciclo custa um push, um build e a espera. Rodar o check antes economiza essas voltas.

---

## No seu Windows (o jeito normal)

```powershell
cd barbearia-web
npx tsc --noEmit
```

Se acusar erro de módulo não encontrado, falta gerar o client:

```powershell
npx prisma generate
```

---

## Erros já encontrados por este check

Quatro erros que teriam quebrado o build um a um, em quatro deploys separados:

| Arquivo | Erro |
|---|---|
| `components/ProBottomNav.tsx` | `usePathname()` pode devolver `null` no Next 16 |
| `api/estoque/movimentacoes/route.ts` (×3) | `type` como `string` onde o Prisma espera o enum `StockMovementType` |

Os três do estoque são consequência direta de remover os `any` do B2: o compilador voltou a enxergar o que o cast escondia. Eram erros reais que estavam lá o tempo todo.

---

## Por que isso ainda não é automático

**Não há CI.** Um workflow do GitHub Actions rodando `tsc --noEmit` e `next lint` a cada push pegaria isso antes de chegar na Vercel — e é a maior lacuna do projeto hoje, junto com a ausência de testes.

Esqueleto do que resolveria:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint
```

`npm ci` já dispara o `postinstall`, que roda o `prisma generate` — a linha explícita é redundância barata para o caso de o postinstall mudar.

---

## Limite conhecido

O `tsc --noEmit` **não** valida as assinaturas de página e rota que o Next gera em `.next/types/`. Coisas como um `params` com formato errado numa página só aparecem no `next build`. Para cobrir isso localmente:

```powershell
npm run build
```

Mais lento, mas é exatamente o que a Vercel faz.
