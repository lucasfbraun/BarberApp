# Análise técnica — barbearia-web

**Data:** 27/07/2026 · **Escopo:** estrutura, arquitetura, modelo de dados e codificação
**Base analisada:** commit `b601acc` (working tree limpo) · ~12.700 linhas em `src/`

> **Atualização de 27/07 (após a sprint 25).** Vários achados deste relatório
> já foram corrigidos. O que mudou:
>
> | Achado | Situação |
> |---|---|
> | A-1 · `POST /api/comandas` com IDs de outro tenant | ✅ Corrigido |
> | A-2 · `PATCH /api/agendamentos/[id]` sem guard nem revalidação de conflito | ✅ Corrigido |
> | M-2 · `paymentMethod` sem validação | ✅ Corrigido (ao extrair `lib/close-order.ts`) |
> | M-4 · `GET /api/comandas` sem `try/catch` e com `status` cru | ✅ Corrigido |
> | `/estoque` fora do middleware | ✅ Corrigido |
> | Navegação do painel igual para todos os papéis | ✅ Corrigido |
> | M-1 · dia civil no relógio do servidor | ✅ Corrigido (API e front) |
> | M-3 · IDOR no `DELETE` de serviços do profissional | ✅ Corrigido |
> | M-5 · vínculo do revendedor fora da transação | ✅ Corrigido |
> | 22 × `prisma as any` | ✅ Corrigido — o projeto tem **zero `any`** |
> | Lacuna E1 · recuperação de senha | ✅ Entregue |
> | Lacuna E2 · convite de usuários | ✅ Entregue (como criação de acesso pelo gestor) |
> | Lacuna E3 · auditoria | ✅ Entregue (falta a tela de consulta) |
> | M-6 · `GET /api/theme` sem revalidar sessão | ⬜ Aberto |
> | Comissão sobre produto igual à de serviço | ⬜ Aberto (decisão de negócio) |
> | Imagens como data URL no Postgres | ⬜ Aberto (documentado em `UPLOADS.md`) |
> | Duplicação de tipos entre front e API | ⬜ Aberto |
> | Todas as páginas `"use client"` | ⬜ Aberto |
> | **Sem testes, sem CI** | ⬜ **Aberto — a maior fragilidade que resta** |
>
> O texto abaixo é o relatório original, preservado como foi escrito.

---

## 1. Visão geral

| Item | Situação |
|---|---|
| Stack | Next.js 16.2.9 (App Router) · React 19.2 · TypeScript 5 (`strict: true`) · Tailwind 4 · Prisma 6.16 + PostgreSQL · NextAuth 4.24 · Vercel |
| Tamanho | 40 rotas de API, 22 páginas, 5 libs, 9 migrations, 22 modelos Prisma |
| Domínio | SaaS multi-tenant para barbearias: agenda, comanda/caixa, estoque, comissão, revendedor, área do cliente final, PWA |
| Maturidade | **Produto funcional e bem documentado**, com trilha de auditoria própria (blocos Crítico/Alto/Médio fechados). Faltam testes, CI e alguns itens de segurança de nível baixo/médio ainda abertos |

**Avaliação geral: código acima da média para um projeto solo.** A camada de autorização é sólida e explicitamente pensada (revalidação no banco, guards por role, isolamento por tenant). Os problemas restantes são pontuais e concentrados em rotas mais novas ou menos revisadas.

---

## 2. Estrutura

```
barbearia/
├─ barbearia-web/          aplicação Next.js
│  ├─ prisma/              schema + 9 migrations versionadas
│  ├─ public/              PWA (sw.js, manifest, ícones, offline.html)
│  └─ src/
│     ├─ app/
│     │  ├─ (panel)/       painel da barbearia (tema escuro)
│     │  ├─ admin/         painel SUPERADMIN
│     │  ├─ cliente/       área do cliente final (tema claro)
│     │  ├─ s/[slug]/      página pública da barbearia
│     │  └─ api/           40 route handlers
│     ├─ components/       5 componentes compartilhados
│     ├─ lib/              auth, auth-guard, availability, prisma, rate-limit, ui, image-upload
│     ├─ pages/api/auth/   NextAuth (Pages Router — obrigatório no NextAuth 4)
│     └─ proxy.ts          middleware (nome novo do Next 16)
├─ pm/                     15 documentos de projeto (charter, WBS, riscos, sprint-status…)
└─ escopo / cronogramas / auditoria
```

**Pontos fortes da organização**

- Separação por audiência via route groups (`(panel)`, `admin`, `cliente`, `s/`) é a decisão certa — cada uma tem layout, tema e regra de acesso próprios.
- `src/lib/` concentra o que é transversal. `ui.ts` centralizando o vocabulário visual do cliente é uma boa ideia e evita divergência entre as seis telas.
- Documentação viva e específica: `AUTH.md`, `PWA.md`, `UPLOADS.md`, `SECURITY.md` + a pasta `pm/`. Raro e valioso.
- Migrations com comentário explicando o *porquê* (ex.: `20260726000005_link_professionals_to_services`).

**Fragilidades estruturais**

- **Zero testes** (nenhum `*.test.*`/`*.spec.*`) e **nenhum CI** (`.github/` inexistente). Regras de negócio de dinheiro — comissão, desconto, baixa de estoque, cálculo de slots — não têm rede de proteção.
- Ausência de `error.tsx`, `loading.tsx` e `not-found.tsx` em qualquer rota: erro de render vira tela branca.
- `package.json → build: "prisma generate && prisma migrate deploy && next build"` roda migration **durante o build**. Se o build falhar depois da migration, o banco fica adiantado em relação ao código publicado; e dois builds simultâneos podem competir pela lock. Ideal separar em passo de release.
- Nenhuma validação de schema (zod/valibot). Todo body é `as { ... }` — o `strict` do TS não protege nada em runtime.

---

## 3. Modelo de dados

O schema (22 modelos) é o ponto mais maduro do projeto: multi-tenancy consistente via `barbershopId` em toda tabela de negócio, `Decimal(10,2)` em dinheiro (não float), índices em todas as FKs e nos campos de filtro, `onDelete` pensado caso a caso (`Cascade` para dependentes, `SetNull` para histórico contábil).

Destaques:

- `StockMovement.balanceAfter` — trilha de auditoria de saldo, permite reconstruir o inventário.
- `ProfessionalService` com `customPrice`/`customDurationMinutes` — flexibilidade sem duplicar serviço.
- `Account` guardando só o `providerAccountId`, sem tokens — decisão correta e documentada no schema.

Observações:

- `Commission.commissionValue` é `Float` (em `Professional`) enquanto todo o resto é `Decimal`. Inconsistência que pode gerar centavo perdido em percentual.
- `WorkingHours.barbershopId` tem índice mas **não tem FK** para `Barbershop` — pode gerar órfão.
- Enum `OrderStatus.REFUNDED` existe mas nenhuma rota o usa: não há estorno/reabertura de comanda.
- `User.email` é único global: o mesmo e-mail não pode ser dono de barbearia e cliente final. É uma decisão de produto — vale registrar explicitamente.

---

## 4. Autenticação e autorização

Esta é a parte melhor executada. Vale registrar o que está **certo**, porque é o que sustenta o resto:

- `resolveTenant()` revalida o vínculo **no banco a cada request** (membership ativo, usuário ativo, barbearia `ACTIVE`, trial/plano) em vez de confiar no JWT de 30 dias. Desativar um usuário tem efeito imediato.
- `resolveAdmin()` reconfere `SUPERADMIN` no banco; as 6 rotas de `/api/admin/*` usam sem exceção.
- `authorize()` não tem fallback para `memberships[0]` — vínculo inativo não concede acesso.
- Login social é exclusivo do cliente final (`ContaDeBarbearia` bloqueia staff), com verificação de `email_verified` antes de vincular conta existente — evita account takeover por e-mail não confirmado.
- Transações **serializáveis** no anti-conflito de agendamento e na baixa de estoque — resolve o TOCTOU de verdade, não só com `findFirst` antes do `create`.
- Segredos: `.env`/`.env.local` fora do Git (confirmado via `git ls-files`), `NEXTAUTH_SECRET` com 32 bytes, `sslmode=require` no Postgres.

---

## 5. Achados

### 🟠 Alto

**A-1 · `POST /api/comandas` aceita IDs de outro tenant** — `src/app/api/comandas/route.ts:86-87`
`customerId`, `professionalId` e `items[].serviceId` vão direto para o `create` sem verificar se pertencem a `tenant.barbershopId` (o `appointmentId`, esse sim, é validado na linha 60). Consequências: a comanda passa a exibir nome de profissional/cliente de outra barbearia (vazamento de dado entre tenants) e, ao fechar, é criada uma `Commission` com `barbershopId` de A e `professionalId` de B — corrompendo o relatório de comissão dos dois. É o mesmo padrão do A1 já corrigido no `PATCH`; ficou faltando no `POST`.
→ Validar cada ID com `findFirst({ where: { id, barbershopId } })` antes do `create`.

**A-2 · `PATCH /api/agendamentos/[id]` sem guard de role nem revalidação de conflito** — `src/app/api/agendamentos/[id]/route.ts:39-95`
Qualquer role do tenant (inclusive `PROFESSIONAL` e `RECEPTION`) pode alterar status, remarcar ou cancelar **qualquer** agendamento da barbearia — enquanto o `GET` da lista restringe o profissional à própria agenda. Além disso, ao mover `startsAt`/`endsAt` não há checagem de `endsAt > startsAt` nem de sobreposição, então o `PATCH` contorna toda a proteção serializável do `POST` e permite double-booking.
→ Aplicar `guardRole` + `resolveOwnProfessionalId` e repetir a verificação de conflito dentro de `$transaction({ isolationLevel: "Serializable" })`. (É o item **B6** do cronograma, ainda aberto.)

### 🟡 Médio

**M-1 · Dia civil calculado no relógio do servidor** — `agendamentos/route.ts:33-34`, `relatorio/diario/route.ts:18-20`, `comandas/route.ts:23-25`
`new Date("YYYY-MM-DDT00:00:00")` e `setHours()` usam o fuso do processo. Na Vercel o Node roda em **UTC**, então a "janela do dia" na verdade vai das 21:00 do dia anterior às 20:59 do dia (horário de Brasília). Agendamentos e comandas noturnos caem no dia errado e o faturamento diário fecha torto. O `lib/availability.ts` já resolveu isso corretamente com `dayRangeInTimeZone()` — falta aplicar nas outras três rotas (item **B4**, parcial).
Complemento no front: `new Date().toISOString().slice(0,10)` (`agenda/page.tsx:63`, `relatorio/page.tsx:6`) devolve a data **UTC do navegador** — depois das 21h no Brasil o painel abre no dia seguinte.
→ Usar `dayRangeInTimeZone(dateStr, barbershop.timezone)` na API e `toLocaleDateString("sv-SE")` (ou `Intl` com `timeZone`) no front.

**M-2 · `paymentMethod` não validado contra o enum** — `comandas/[id]/route.ts:150,241`
Só há checagem de presença; o valor entra como `body.paymentMethod as never`. Um método inválido só falha lá dentro do `$transaction`, e o `catch` genérico devolve `503 "Erro ao fechar a comanda"` — mensagem enganosa para um erro de entrada, e a stack real se perde (não há `console.error`). (Item **B5**.)
→ `if (!Object.values(PaymentMethod).includes(body.paymentMethod)) return 400`.

**M-3 · IDOR leve no `DELETE /api/profissionais/[id]/servicos`** — linha 129
O `POST` verifica que o profissional pertence ao tenant; o `DELETE` faz `updateMany({ where: { professionalId: id, serviceId } })` sem essa checagem. Um `MANAGER` da barbearia A consegue desativar o vínculo profissional↔serviço da barbearia B, se descobrir o ID. (Item **B1**.)
→ Repetir o `findFirst` de tenant, como no `POST`.

**M-4 · `GET /api/comandas` sem `try/catch` e com `status` cru** — `comandas/route.ts:19,29`
`where.status = status` recebe qualquer string; um valor fora do enum faz o Prisma lançar e, sem `try/catch`, o handler devolve 500 com stack do framework. Mesmo problema no `POST` da mesma rota. Todas as outras rotas do projeto tratam isso — estas duas ficaram de fora.

**M-5 · Vínculo do revendedor fora da transação de onboarding** — `onboarding/route.ts:96-110`
O `upsert` de `BarbershopReseller` roda depois do `$transaction`, com `.catch(() => null)`. Se falhar, a barbearia nasce sem cupom vinculado e ninguém fica sabendo — comissão perdida silenciosamente. (Item **B3**.)

**M-6 · `GET /api/theme` não revalida a sessão** — `theme/route.ts:59-72`
Usa `getToken()` direto e busca a barbearia pelo `activeBarbershopId` do JWT, sem passar por `resolveTenant`. Um usuário cujo vínculo foi revogado continua lendo o registro completo do tenant até o JWT expirar (30 dias). O `POST` da mesma rota faz certo.

### 🟢 Baixo / dívida técnica

- **`const db = prisma as any` em 22 arquivos** (item **B2**). O Prisma Client já está regenerado — os casts viraram dívida pura e apagam a checagem de tipos justamente nos módulos mais novos (estoque, área do cliente, admin). É a maior fonte de risco silencioso do código hoje.
- **`/estoque` não está protegido pelo middleware** — `proxy.ts:5-13` e o `matcher` listam agenda, clientes, profissionais, serviços, configurações, relatório e comanda, mas não estoque. As APIs estão guardadas, então não há vazamento; o efeito é UX: visitante não logado vê a página quebrar em vez de ser mandado ao login, e barbearia com trial vencido não é redirecionada.
- **Rate limit em memória** (`lib/rate-limit.ts`) — por instância serverless, portanto contornável. Já documentado no próprio arquivo; migrar para Upstash quando priorizado.
- **`/api/disponibilidade` sem rate limit** e chamando `resolveTenant()` (1 query + `getToken`) em todo tráfego público antes do fallback.
- **Imagens como data URL em coluna do Postgres** (até 200 KB por logo/capa). Decisão consciente e documentada em `UPLOADS.md`, mas `/api/public/barbershop/[slug]` devolve as duas em toda visita à página pública, sem cache — custo de banda e de banco que cresce com o tráfego.
- **Sem `console.error` na maioria dos `catch`** — só 4 no projeto inteiro. Erros de produção viram 503 mudo, sem nada no log da Vercel para investigar.
- `Order` sem estorno/reabertura; `REFUNDED` órfão.
- Comissão calculada sobre o **total da comanda**, incluindo produtos, com taxa única por profissional — vale confirmar se é a regra de negócio desejada (normalmente produto tem comissão menor ou nenhuma).

### 🔵 Lacunas de escopo (já mapeadas no cronograma)

- **E1 — recuperação de senha**: ainda não existe. Ficou mais urgente com a área do cliente aberta e com contas de login social (sem senha) convivendo com contas de senha.
- **E2 — convite de usuários**: não há como o dono adicionar recepcionista/barbeiro; hoje só o `OWNER` criado no onboarding tem acesso.
- **E3 — log de auditoria**: nenhum registro de quem fez o quê (relevante para caixa e estoque).
- Pagamento recorrente/online (Stripe) segue apenas especificado.

---

## 6. Qualidade da codificação

**O que está bom**

- Comentários explicam **decisão**, não mecânica ("por que serializável", "por que sem fallback de membership", "por que SVG fica de fora"). É o tipo de comentário que sobrevive à refatoração.
- Padrão de handler consistente: `resolveTenant` → `guardRole` → validar → agir → `try/catch` com status semântico (400/403/404/409/503). Quem abre um arquivo novo já sabe o formato.
- Mensagens de erro em português, voltadas ao usuário final, sem vazar detalhe interno.
- `lib/availability.ts` é o melhor arquivo do projeto: usa `Intl` para offset (respeita horário de verão sem dependência), documenta a armadilha do UTC e é uma função pura — testável, se houvesse testes.
- PWA implementado com critério: `id` fixo no manifest, ícone maskable, estratégias de cache diferenciadas por tipo de recurso, `viewportFit: cover` para o safe-area do iPhone.

**O que incomoda**

- Os 22 `as any` (acima).
- Duplicação de tipos entre front e API: cada página redeclara `type Product = {...}`, `type Appointment = {...}` à mão. Uma divergência silenciosa é questão de tempo — extrair para `src/types/` ou derivar do Prisma.
- Todas as 22 páginas são `"use client"` com `useEffect` + `fetch`. Funciona, mas joga fora Server Components: mais JS no bundle, waterfalls e nenhum cache. `page.tsx` do painel poderia buscar no servidor.
- Inconsistência na forma da resposta: umas rotas devolvem `{ services: [...] }`, outras o array cru (`/api/comandas`, `/api/admin/planos`). Cada consumidor precisa lembrar qual é qual.
- `Decimal` do Prisma vira **string** no JSON, e o front às vezes tipa como `string` (`agenda/page.tsx`), às vezes como `number`. Funciona por coincidência do `Number()`.

---

## 7. Recomendações priorizadas

| # | Ação | Esforço | Por quê |
|---|---|---|---|
| 1 | Validar IDs de tenant no `POST /api/comandas` (A-1) | 1h | Vazamento entre tenants + corrupção de comissão |
| 2 | Guard de role + revalidação de conflito no `PATCH /api/agendamentos/[id]` (A-2) | 3h | Contorna toda a proteção de double-booking |
| 3 | Aplicar `dayRangeInTimeZone` em agendamentos/relatório/comandas e corrigir a data no front (M-1) | 4h | Agenda e faturamento do dia errados em produção |
| 4 | Adotar zod nos bodies das rotas de escrita | 1 dia | Resolve M-2, M-4 e a classe inteira de erros de entrada |
| 5 | Remover os 22 `as any` (B2) | 4h | Devolve a checagem de tipos aos módulos novos |
| 6 | Fechar B1, B3, B6 e incluir `/estoque` no middleware | 3h | Itens pequenos já mapeados |
| 7 | Testes das funções puras (`availability`, cálculo de comissão/desconto) + CI com `lint` e `tsc` | 1,5 dia | Única forma de mexer em dinheiro com segurança |
| 8 | `console.error` em todos os `catch` | 1h | Hoje produção é uma caixa preta |
| 9 | Recuperação de senha (E1) | 1,5 dia | Cliente final sem saída ao esquecer a senha |
| 10 | Confirmar a rotação pendente de credenciais Neon/Vercel/`NEXTAUTH_SECRET` | — | Pendência manual de `SECURITY.md`, em aberto desde 23/06 |

---

## 8. Nota metodológica

Não foi possível rodar `tsc --noEmit`, `eslint` nem `next build` neste ambiente: o `node_modules` foi instalado no Windows (binários `.cmd`) e o sandbox Linux não consegue executá-lo em tempo hábil. Os achados vêm de leitura integral do código-fonte, do schema, das migrations e do histórico do Git. **Recomendo rodar `npm run lint && npx tsc --noEmit` localmente** para complementar — em especial depois de remover os `as any`, que hoje escondem erros de tipo reais.
