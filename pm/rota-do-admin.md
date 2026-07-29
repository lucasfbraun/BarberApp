# Rota própria do painel do SaaS

**28/07/2026** · complementa [`acesso-admin-master.md`](./acesso-admin-master.md)

Duas mudanças que resolvem problemas diferentes.

---

## 1. Login separado — o mesmo e-mail nos dois papéis

**O problema.** O papel vinha de um único vínculo escolhido no login. Quem administra o SaaS e também tem uma barbearia ficava preso a um dos dois: com precedência por papel, sempre no `/admin`; sem ela, sempre na barbearia. Nunca nos dois.

**A solução: a porta decide o papel.**

| Entrada | Vínculo escolhido | Destino |
|---|---|---|
| `/login` | O de maior precedência, **ignorando** `SUPERADMIN` | Painel da barbearia |
| `<caminho-do-admin>/login` | Apenas `SUPERADMIN`; sem ele, o login falha | Painel do SaaS |

Tecnicamente, o formulário do admin envia `scope: "admin"` junto das credenciais, e o `authorize()` filtra por isso.

Há uma exceção deliberada: quem tem **só** o vínculo de admin também entra pelo `/login` — seria absurdo trancar essa pessoa para fora da própria aplicação. O middleware a redireciona para o painel do SaaS.

### A mensagem de erro é única

"Credenciais inválidas ou sem permissão para este painel" cobre os dois casos. Separar em "senha errada" e "você não é admin" contaria a quem está testando credenciais que aquele e-mail existe e que a senha estava certa.

---

## 2. Caminho configurável

`ADMIN_PATH="xk7m-painel"` faz o painel responder em `/xk7m-painel`, e **`/admin` passa a devolver 404**.

### Isto não é segurança

Um caminho difícil de adivinhar tira o painel das listas de varredura automática — os robôs que testam `/admin`, `/wp-admin`, `/painel` em todo domínio da internet. Quem tem credencial entra do mesmo jeito, e quem descobrir o caminho continua esbarrando no `resolveAdmin`, que valida o papel no banco a cada requisição.

**É a camada de fora, nunca a única.** Tratar como proteção real seria o erro.

### 404, e não redirecionamento

Acessar `/admin` com o caminho movido devolve **404**, não um redirecionamento para o login. Um redirecionamento confirmaria que existe um painel ali — exatamente o que se queria esconder.

### Como funciona

Os arquivos continuam em `app/admin/*`. O middleware reescreve `/<segredo>/x` para `/admin/x`; a URL na barra continua sendo a secreta.

Duas armadilhas que isso cria, e como foram tratadas:

**Os links internos.** Um `<Link href="/admin/barbearias">` fixo levaria a um 404, porque o usuário está navegando em `/<segredo>/...`. O layout (server component) lê a variável e distribui o caminho por contexto; os componentes de cliente usam `<AdminLink to="/barbearias">`.

**O matcher do middleware é estático** — não aceita variável de ambiente. Por isso ele passou a ver todas as requisições de página, excluindo estáticos e `/api` (que já se protegem sozinhos com `resolveTenant` / `resolveAdmin`).

### `ADMIN_PATH` não leva `NEXT_PUBLIC_`

De propósito. Com o prefixo, o valor entraria no pacote JavaScript da landing e qualquer visitante o leria — o que anularia a obscuridade inteira.

### Validação do valor

- 3 a 64 caracteres, letras, números e hifens
- Não pode colidir com rota existente (`blog`, `login`, `cliente`, `s`, …)

Valor inválido cai para `/admin` com aviso no log, em vez de gerar uma rota quebrada difícil de diagnosticar.

---

## Configuração

```bash
# Gere algo não adivinhável:
node -e "console.log('painel-' + require('crypto').randomBytes(6).toString('hex'))"
```

Coloque em `ADMIN_PATH` na Vercel e faça redeploy. **Anote o caminho** — sem ele você não acha o próprio painel, e recuperá-lo exige olhar a variável de ambiente.

Vazio ou ausente = painel em `/admin`, como antes.

---

## Fluxo final

```
/login                      → dono, gerente, recepção, barbeiro
<admin>/login               → SUPERADMIN
/admin                      → 404 (quando ADMIN_PATH está definido)
<admin>                     → painel do SaaS
<admin>/barbearias · /planos · /revendedores · /blog
```
