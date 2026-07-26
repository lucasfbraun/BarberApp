# Autenticacao

O app tem **dois publicos** com regras diferentes, atendidos pela mesma
instancia do NextAuth (`src/lib/auth.ts`, sessao em JWT):

| Publico | Onde entra | Metodos |
|---|---|---|
| Cliente final | `/cliente/login`, `/cliente/cadastro` | e-mail + senha, **Google**, **Facebook** |
| Barbearia (staff) e superadmin | `/login` | **somente** e-mail + senha |

## Por que o painel nao tem login social

Quem entra no painel enxerga dados de clientes, faturamento e comandas. Com
login social, quem tomasse a caixa de e-mail do dono entraria no painel sem
nunca saber a senha. Por isso o callback `signIn` **recusa** login social de
qualquer conta com vinculo ativo de barbearia (`BarbershopUser.active`),
devolvendo o erro `ContaDeBarbearia`.

Consequencia conhecida: um dono de barbearia que tambem seja cliente de outra
barbearia nao consegue usar o social — precisa entrar com senha.

## Regras de vinculacao de conta

Implementadas em `src/lib/social-login.ts`, nesta ordem:

1. **Provedor ja vinculado** (`Account.provider` + `providerAccountId`) →
   entra na conta vinculada.
2. **E-mail ja cadastrado** → **vincula** o provedor aquela conta. Evita que a
   mesma pessoa vire dois cadastros e perca o historico de agendamentos.
   So acontece se o provedor confirmar o e-mail:
   - Google envia `email_verified` no perfil — exigimos `true`.
   - Facebook so devolve e-mail ja confirmado pela Meta.
3. **E-mail novo** → cria o usuario com `passwordHash = null` e vincula.

Contas inativas (`User.active = false`) sao recusadas em qualquer caso.

### Efeitos no banco

- `User.passwordHash` agora e **nullable** (migration
  `20260726000004_add_social_login`). O provider de credenciais recusa login
  quando o hash e nulo — conta so-social nao entra por senha.
- Tabela **`Account`**: `provider`, `providerAccountId`, `userId`. Guardamos
  apenas o identificador — **nenhum access token e persistido**, porque o app
  nao consome APIs do Google/Meta em nome do usuario.

> Nao usamos o `PrismaAdapter` do NextAuth: ele nao convive bem com o
> `CredentialsProvider` na v4. A criacao e o vinculo sao feitos a mao no
> callback `signIn`, o que tambem mantem o fluxo de senha intacto.

## Status: codigo pronto, provedores nao ativados

> **Pendente (26/07/2026).** O codigo do login social esta completo e
> mergeado, mas **os apps de OAuth ainda nao foram criados** no Google Cloud
> nem no Facebook Developers. Como nao existem `GOOGLE_CLIENT_*` /
> `FACEBOOK_CLIENT_*` no ambiente, `/api/auth/providers` devolve apenas
> `credentials` e **os botoes nao aparecem** em `/cliente/login` — isso e
> esperado, nao e bug.
>
> Para ligar, basta criar os apps (passo a passo abaixo), preencher as
> variaveis e reiniciar o servidor. Nenhuma alteracao de codigo e necessaria.
>
> Ordem sugerida: **Google primeiro** (aceita `localhost`, escopos sem
> revisao), Facebook depois (exige HTTPS e app em modo Live).

## Ativando os provedores

Os provedores sociais so entram na lista **se as variaveis de ambiente
existirem**. Sem elas o app sobe normalmente e os botoes nem aparecem — o
componente `SocialLoginButtons` consulta `/api/auth/providers` e renderiza
apenas o que o servidor confirmou.

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""
```

Em producao, as variaveis vao no painel da Vercel — nunca em arquivo `.env`
versionado (ver `SECURITY.md`).

### Google

1. [Google Cloud Console](https://console.cloud.google.com) → crie um projeto.
2. **APIs e servicos → Tela de permissao OAuth**: tipo **Externo**, preencha
   nome do app, e-mail de suporte e logo.
   Os escopos usados (`email`, `profile`, `openid`) sao **nao sensiveis** —
   nao exigem revisao do Google. Enquanto o app estiver em "Teste", so os
   e-mails cadastrados como testadores conseguem entrar; publique para liberar
   a todos.
3. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
4. Em **URIs de redirecionamento autorizados**, adicione:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://SEU-DOMINIO/api/auth/callback/google`
5. Copie o **Client ID** e o **Client Secret** para as variaveis.

### Facebook

1. [Facebook for Developers](https://developers.facebook.com) → **Meus apps →
   Criar app** → tipo **Consumidor**.
2. Adicione o produto **Login do Facebook** → plataforma **Web**.
3. Em **Login do Facebook → Configuracoes**, em *URIs de redirecionamento do
   OAuth validos*, adicione:
   - `https://SEU-DOMINIO/api/auth/callback/facebook`
4. **Configuracoes → Basico**: copie **ID do app** e **Chave secreta**.
5. Coloque o app em modo **Ativo** (Live) para atender quem nao e
   administrador ou testador do app.

Pontos de atencao do Facebook:

- **`email` e `public_profile` sao concedidos automaticamente**, sem App
  Review. Mas a Meta exige **verificacao de negocio** para acessos avancados,
  e apps em producao passam por revisao continua — reserve tempo para isso.
- O Facebook **nao aceita `http://localhost`** como redirect. Para testar
  local, crie um app separado de desenvolvimento ou exponha o app por HTTPS
  (tunel). O Google aceita localhost normalmente.
- Existem contas do Facebook **sem e-mail** (cadastro por telefone). Nesse
  caso o login e recusado com `SemEmail` e a pessoa e orientada a usar
  e-mail e senha.

## Erros mostrados ao usuario

Os codigos chegam em `/cliente/login?error=...` e sao traduzidos na propria
tela (`SOCIAL_ERRORS`):

| Codigo | Significado |
|---|---|
| `SemEmail` | O provedor nao entregou e-mail. |
| `EmailNaoVerificado` | E-mail existe no banco mas o provedor nao confirmou. |
| `ContaInativa` | `User.active = false`. |
| `ContaDeBarbearia` | Conta com vinculo de barbearia tentou entrar por social. |
| `ErroInterno` | Falha inesperada (ja logada no servidor). |
| `AccessDenied` | A pessoa cancelou a autorizacao no provedor. |

`pages.error` aponta para `/cliente/login` porque o login por senha nunca
redireciona (usa `redirect: false`) — entao todo erro que cai ali e social.

## Checklist de teste

```bash
npm run build && npm start
```

1. `/cliente/login` sem as variaveis → nenhum botao social aparece.
2. Com as variaveis → botao do provedor aparece; `/api/auth/providers`
   lista `google` e/ou `facebook`.
3. Primeiro login social → cria `User` (sem senha) + `Account`.
4. Logout, login de novo pelo mesmo provedor → **mesmo** `User.id`.
5. Conta criada antes com senha, entrando com o mesmo e-mail no Google →
   vincula, sem duplicar usuario.
6. Conta so-social tentando entrar com senha → recusado.
7. Conta de dono de barbearia no Google → erro `ContaDeBarbearia`.

## Pendencias

- [ ] **Criar o app OAuth do Google** e preencher `GOOGLE_CLIENT_ID` /
      `GOOGLE_CLIENT_SECRET` (local em `.env.local`, producao no painel da
      Vercel). Enquanto isso, o botao do Google nao aparece.
- [ ] **Criar o app do Facebook** e preencher `FACEBOOK_CLIENT_ID` /
      `FACEBOOK_CLIENT_SECRET`. Lembrar do redirect HTTPS e do modo Live.
- [ ] Adicionar os redirects de **producao** nos dois paineis quando o
      dominio final estiver definido.
- [ ] **Recuperacao de senha** — nao existe para nenhum dos dois publicos.
- [ ] Tela para o cliente **desvincular** um provedor ou definir senha depois
      de ter criado a conta pelo social.
