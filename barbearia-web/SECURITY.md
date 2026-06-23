# Seguranca — notas operacionais

## Segredos e variaveis de ambiente

- Arquivos `.env` e `.env.local` **nunca** sao versionados (ver `.gitignore`). So o `.env.example` (sem segredos) vai para o Git.
- O `NEXTAUTH_SECRET` deve ser forte e unico por ambiente. Gere com:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- Em producao (Vercel), as variaveis vem do painel do projeto, **nao** dos arquivos `.env`.

## Rotacao pendente (acao manual — fora do codigo)

Os valores abaixo ja estiveram em arquivos locais em texto puro e **devem ser rotacionados**:

1. **Banco Neon** — gere nova senha/credencial em console.neon.tech e atualize a `DATABASE_URL`
   (local em `.env.local`, producao no painel da Vercel).
2. **`NEXTAUTH_SECRET`** — gere um novo segredo (comando acima) e atualize local + Vercel.
   Trocar o segredo invalida as sessoes existentes (todos precisam logar de novo).
3. **Token Vercel (`VERCEL_OIDC_TOKEN`)** — emitido pela Vercel CLI; revogue/recrie se necessario.

Depois de rotacionar, confirme que nenhum `.env*` (exceto `.env.example`) esta rastreado:

```bash
git ls-files | grep -i env   # deve retornar apenas .env.example
```
