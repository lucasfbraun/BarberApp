# Acesso ao painel do SaaS (SUPERADMIN)

**28/07/2026**

---

## O problema que isto resolve

O painel `/admin` — barbearias, planos, revendedores, blog — existe desde a sprint 12. Mas **não havia como entrar nele.**

O papel `SUPERADMIN` está no enum, o `resolveAdmin` protege as rotas e o middleware redireciona por papel. Só que `BarbershopUser` só era criado em dois lugares, nenhum deles com esse papel:

| Onde | Papel criado |
|---|---|
| `api/onboarding` | `OWNER` |
| `api/profissionais/[id]/acesso` | `PROFESSIONAL` |

Nenhuma migration semeia usuário. Resultado: código pronto, porta trancada — exatamente o que acontecia com o portal do barbeiro antes da sprint 25.

---

## Como criar

```powershell
cd barbearia-web
node scripts/criar-superadmin.mjs seu@email.com "sua-senha-forte" "Seu Nome"
```

Rode **uma vez**. Depois entre em `/login` normalmente: o sistema identifica o papel e leva para `/admin`.

Rodar de novo com senha diferente **redefine a senha** — é o caminho de recuperação se você perder o acesso ao painel do SaaS.

---

## Por que um script, e não uma tela

Uma tela pública de "criar primeiro admin" é uma porta que fica aberta para sempre — basta alguém chegar antes de você. Uma tela protegida exigiria um admin que ainda não existe.

O caminho seguro é o acesso ao banco, que só quem opera a infraestrutura tem. É a mesma razão pela qual sistemas sérios criam o primeiro superusuário por linha de comando.

---

## O detalhe do modelo que complica

**O papel mora em `BarbershopUser`, não em `User`.** Isso significa que o `SUPERADMIN` precisa estar preso a *alguma* barbearia — mesmo não sendo dono de nenhuma.

O script cria uma barbearia interna (`barvioapp-interno`) para isso, em vez de pendurar o admin na barbearia de um cliente. Dois motivos:

1. Ele apareceria na equipe de alguém.
2. Desativar aquela barbearia derrubaria o acesso ao painel do SaaS inteiro.

Ela nasce `ACTIVE` e `billingExempt`. O `ACTIVE` não é decorativo: o `authorize` do NextAuth só coloca o papel no token se a barbearia do vínculo estiver ativa.

### O e-mail reaproveitado — corrigido em 28/07

O `authorize()` escolhia **um vínculo ativo qualquer**:

```ts
const membership = user.memberships.find(
  (item) => item.active && item.barbershop.status === "ACTIVE",
);
```

Se o mesmo e-mail já fosse dono de uma barbearia, o vínculo escolhido podia ser o de `OWNER` — e o `/admin` não abria, **sem erro nenhum que explicasse o porquê**. Depender da ordem em que o banco devolve as linhas é o tipo de bug que só aparece em produção.

Passou a escolher por **precedência de papel**:

```ts
const PRIORIDADE_DE_PAPEL = {
  SUPERADMIN: 0,  // o painel do SaaS não pode depender de sorte
  OWNER: 1,
  MANAGER: 2,
  RECEPTION: 3,
  PROFESSIONAL: 4,
};
```

**Isso foi superado no mesmo dia.** A precedência resolvia o acesso ao `/admin`, mas criava outro problema: quem fosse SUPERADMIN deixava de conseguir abrir o painel da própria barbearia.

A solução final foi o **login separado** — a porta de entrada decide o papel, não a precedência. Ver [`rota-do-admin.md`](./rota-do-admin.md). Com ele, o mesmo e-mail serve aos dois papéis:

| Entrada | Papel |
|---|---|
| `/login` | O de maior precedência, **ignorando** SUPERADMIN |
| `<admin>/login` | Apenas SUPERADMIN |

A precedência continua no código, mas agora só desempata entre os papéis da barbearia.

### Ver o que existe

```powershell
node scripts/listar-barbearias.mjs
```

Rode este primeiro. Os outros scripts pedem o **slug**, que não é o que aparece nas telas — é fácil confundir com o nome e procurar uma barbearia que "não existe".

> Os scripts de excluir e transferir aceitam **slug ou nome**, justamente para não depender disso.

### Excluir uma barbearia

```powershell
node scripts/excluir-barbearia.mjs <slug-ou-nome>
```

Mostra a contagem de tudo que será apagado e exige que você **digite o slug** para confirmar. É irreversível: não há lixeira.

As **contas de usuário permanecem** — são independentes da barbearia.

Dois cuidados embutidos no script:

**`ServiceCategory` é apagada explicitamente.** Ela tem `barbershopId` mas **nenhuma chave estrangeira** para `Barbershop` — conferido no schema. Sem esse passo, as categorias ficariam órfãs no banco para sempre, invisíveis e sem dono. As outras 15 relações declaram `onDelete: Cascade` e caem sozinhas. (`WorkingHours` também não tem FK para a barbearia, mas cascateia por `Professional`.)

**A barbearia interna é bloqueada.** É ela que sustenta o papel `SUPERADMIN`; apagá-la tiraria o painel do SaaS do ar.

> **Dívida:** a falta de FK em `ServiceCategory.barbershopId` é um defeito do schema, não só uma peculiaridade. Qualquer outro código que apague barbearia vai repetir o mesmo esquecimento. Vale corrigir com uma migration que adicione a chave estrangeira.

### Transferir a propriedade de uma barbearia

Operação de suporte — dono vendeu o negócio, saiu da sociedade, ou o cadastro foi feito com o e-mail errado:

```powershell
node scripts/transferir-barbearia.mjs <slug> <novo-email> ["Nome"] ["senha"]
```

O dono anterior é **rebaixado a MANAGER**, não removido: apagar o vínculo perderia o histórico de quem fez o quê, e transferência costuma ter período de convivência. As duas operações acontecem na mesma transação — se só uma passasse, a barbearia ficaria sem dono nenhum e ninguém mais entraria no painel dela.

---

---

## Invariante: e-mail de superadmin não abre barbearia

Decisão de 28/07. A regra é aplicada nos **dois sentidos**:

| Caminho | O que acontece |
|---|---|
| `POST /api/onboarding` | Recusa se o e-mail tiver vínculo `SUPERADMIN` ativo |
| `scripts/transferir-barbearia.mjs` | Recusa transferir para um e-mail de superadmin |
| `api/profissionais/[id]/acesso` | Já barrado: o superadmin tem vínculo com a barbearia interna, e a rota recusa e-mail ligado a outra barbearia |

### Por que a verificação é explícita no onboarding

O onboarding já recusa **qualquer** e-mail existente — então, hoje, a proteção do admin viria de graça.

O problema é que essa é uma regra de outro assunto. No dia em que existir "usuário existente cria uma segunda barbearia" — evolução natural para quem tem rede —, a proteção do admin sumiria junto, sem ninguém perceber. Por isso a checagem é própria e vem **antes**: é uma invariante do sistema, não efeito colateral de outra regra.

### A mensagem não entrega o motivo

O erro diz *"Este e-mail não pode ser usado para criar uma barbearia"*, e não *"este e-mail é de um administrador"*. A segunda versão confirmaria a quem está sondando que aquele endereço tem poder no sistema.

---

## Dívida registrada

A precedência resolve o caso do admin, mas o modelo continua permitindo **um contexto por sessão**. Quando existir usuário legitimamente ligado a mais de uma barbearia — rede com múltiplas unidades, previsto na fase 3 — vai ser preciso um seletor de contexto: escolher a unidade no login, ou trocar sem deslogar.

Hoje o efeito é contornável com e-mails separados. Com multiunidades, deixa de ser.
