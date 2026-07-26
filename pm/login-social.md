# Login Social do Cliente (Google e Facebook) — Documentação

Data: 2026-07-26 · Arquivos: `src/lib/auth.ts`, `src/lib/social-login.ts`, `src/components/SocialLoginButtons.tsx` · Migration: `20260726000004_add_social_login` · Detalhe técnico e passo a passo dos apps: [`barbearia-web/AUTH.md`](../barbearia-web/AUTH.md)

> ⚠️ **Status: código pronto, provedores NÃO ativados.** Os apps de OAuth ainda não foram criados no Google Cloud nem no Facebook Developers. Sem as variáveis de ambiente, os botões simplesmente não aparecem — isso é esperado, não é bug. Ligar não exige mudança de código.

## Conceito

O cliente final pode entrar com **Google** ou **Facebook**, além de e-mail e senha. O painel da barbearia e o admin continuam **somente com senha**.

| Público | Onde entra | Métodos |
|---|---|---|
| Cliente final | `/cliente/login`, `/cliente/cadastro` | senha, Google, Facebook |
| Barbearia (staff) e superadmin | `/login` | **somente** senha |

## Por que o painel não tem login social

Quem entra no painel enxerga dados de clientes, faturamento e comandas. Com login social, quem tomasse a caixa de e-mail do dono entraria no painel sem nunca saber a senha. O callback `signIn` **recusa** login social de qualquer conta com vínculo ativo de barbearia, devolvendo o erro `ContaDeBarbearia`.

Consequência conhecida: dono de barbearia que também seja cliente de outra barbearia precisa entrar com senha.

## Regras de vinculação

Na ordem, em `src/lib/social-login.ts`:

1. **Provedor já vinculado** (`Account.provider` + `providerAccountId`) → entra na conta vinculada.
2. **E-mail já cadastrado** → **vincula** o provedor àquela conta, evitando que a mesma pessoa vire dois cadastros e perca o histórico. Só acontece se o provedor confirmar o e-mail: o Google envia `email_verified`, e o Facebook só devolve e-mail já confirmado pela Meta.
3. **E-mail novo** → cria o usuário sem senha e vincula.

Conta inativa (`User.active = false`) é recusada em qualquer caso. Conta criada só por social **não entra por senha** — o provider de credenciais recusa quando o hash é nulo.

## Modelo de dados

- `User.passwordHash` passou a ser **nullable** — conta social não tem senha.
- Nova tabela **`Account`**: `provider`, `providerAccountId`, `userId`, com unique em (`provider`, `providerAccountId`). Guardamos apenas o identificador — **nenhum access token é persistido**, porque o app não consome APIs do Google/Meta em nome do usuário.
- Migration: `20260726000004_add_social_login`.

Não usamos o `PrismaAdapter` do NextAuth: ele não convive bem com o `CredentialsProvider` na v4. A criação e o vínculo são feitos no callback `signIn`, o que mantém o fluxo de senha intacto.

## Ativação

Os provedores só entram na lista **se as variáveis existirem** no ambiente:

```env
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET
```

O front consulta `/api/auth/providers` e renderiza apenas o que o servidor confirmou. Em produção as variáveis vão no painel da Vercel, nunca em arquivo versionado (ver `SECURITY.md`).

Pontos de atenção: o **Google** aceita `localhost` no redirect e usa escopos não sensíveis (sem revisão); enquanto o app estiver em "Teste", só e-mails cadastrados como testadores entram. O **Facebook não aceita `http://localhost`** — exige app de desenvolvimento separado ou túnel HTTPS — e, apesar de `email`/`public_profile` serem concedidos automaticamente, o app precisa estar em modo Live para atender quem não é administrador.

## Pendências / próximos passos sugeridos

- [ ] **Criar o app OAuth do Google** e preencher as variáveis (local + Vercel).
- [ ] **Criar o app do Facebook**, com redirect HTTPS e modo Live.
- [ ] Adicionar os redirects de **produção** nos dois painéis quando o domínio final estiver definido.
- [ ] **Recuperação de senha** (item E1 do cronograma de correções) — ainda não existe para nenhum dos dois públicos.
- [ ] Tela para o cliente **desvincular** um provedor ou definir senha depois de criar a conta pelo social.
