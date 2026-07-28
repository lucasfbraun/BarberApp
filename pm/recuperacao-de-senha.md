# Recuperação de senha (E1)

**27/07/2026 · sprint 25**

Fecha a última lacuna do cronograma de correções. Ficou mais urgente a cada entrega: primeiro os clientes ganharam conta própria, depois veio o login social (conta sem senha), e por fim o barbeiro passou a receber uma senha inicial definida pelo gestor — sem reset, trocá-la dependia de pedir a ele.

---

## Como funciona

```
/esqueci-senha  →  POST /api/senha/esqueci
                   ├─ gera token aleatório de 32 bytes
                   ├─ grava no banco apenas o SHA-256 dele
                   ├─ invalida pedidos anteriores em aberto
                   └─ envia o link por e-mail

e-mail  →  /redefinir-senha?token=...
           ├─ GET  /api/senha/redefinir  (valida ao ABRIR a página)
           └─ POST /api/senha/redefinir  (grava a senha, queima o token)
```

---

## Decisões

### O token nunca é gravado em claro

No banco fica só o SHA-256. Um vazamento não entrega tokens utilizáveis — o mesmo raciocínio do hash de senha.

SHA-256 basta aqui (não usamos bcrypt): o token já tem 256 bits de entropia aleatória, então não há o que quebrar por força bruta, e o custo do bcrypt seria desperdício num caminho que roda a cada clique no link.

### A resposta é sempre a mesma

`POST /api/senha/esqueci` devolve o mesmo texto exista ou não o e-mail. Diferenciar "enviamos" de "e-mail não cadastrado" transformaria a rota num **verificador de contas**: qualquer um descobriria quem tem cadastro.

Pelo mesmo motivo, quando o limite por conta é atingido a resposta também é de sucesso — dizer "muitas tentativas para este e-mail" já confirmaria que ele existe.

### Conta de login social não recebe link

Quem entrou por Google ou Facebook não tem senha para redefinir. A resposta continua idêntica (não podemos vazar isso), mas a tela avisa em texto genérico que contas sociais devem usar o botão social.

### O link é validado ao abrir a página

O `GET` existe só para isso. Descobrir que o link expirou **depois** de digitar a senha duas vezes é irritante e evitável.

### Trocar a senha invalida todos os links pendentes

Gravar a senha e queimar o token acontecem na mesma transação — se o update passasse e a marcação falhasse, o link continuaria valendo. E qualquer outro pedido em aberto também morre no mesmo passo.

### `usedAt` em vez de apagar a linha

Marcar o consumo permite detectar tentativa de reuso e investigar. Apagar esconderia.

### Envio de e-mail sem dependência nova

`lib/mailer.ts` fala HTTP direto com a API do provedor via `fetch`. Sem nodemailer, sem SDK — trocar de provedor mexe só nesse arquivo, não no `package.json`.

Três modos:

| Situação | Comportamento |
|---|---|
| `RESEND_API_KEY` configurado | Envia de verdade |
| Sem chave, em **desenvolvimento** | Imprime o e-mail no console do servidor — dá para testar o fluxo inteiro sem conta de provedor |
| Sem chave, em **produção** | Falha com erro explícito |

O terceiro caso é deliberado: um e-mail de redefinição que silenciosamente não sai é pior do que um erro, porque a pessoa fica esperando para sempre.

### Rotas em `/api/senha/*`, não `/api/auth/*`

O NextAuth ocupa `/api/auth/[...nextauth]` no Pages Router. Colocar rotas do App Router debaixo do mesmo prefixo cria ambiguidade entre os dois roteadores. Um prefixo próprio evita a classe inteira de problema.

---

## Configuração

```bash
RESEND_API_KEY="re_..."                        # resend.com > API Keys
MAIL_FROM="nao-responda@seudominio.com.br"     # domínio verificado no provedor
```

Sem essas variáveis o fluxo funciona em desenvolvimento (link no console) e **falha em produção**. Configure antes de publicar.

---

## Limites

- **Por IP:** 10 pedidos por hora (impede varredura de e-mails).
- **Por conta:** 3 pedidos por hora (impede encher a caixa de entrada de alguém).
- **Validação do link:** 30 consultas por hora por IP — sem isso daria para varrer tokens medindo qual responde "válido".

---

## O que ficou de fora

- **Limpeza de tokens vencidos.** As linhas ficam no banco. Há índice em `expiresAt` para uma rotina futura; hoje o volume não justifica.
- **Aviso por e-mail quando a senha muda.** Prática comum e útil contra sequestro de conta — mas é um segundo e-mail, e preferi entregar o essencial funcionando.
- **Exigir a senha atual para trocar estando logado.** Não existe tela de "alterar senha" no perfil; o caminho é sempre pelo link.
