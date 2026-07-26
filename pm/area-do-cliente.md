# Área do Cliente Final — Documentação

Data: 2026-07-26 · Páginas: `/cliente`, `/cliente/login`, `/cliente/cadastro`, `/cliente/agendamentos`, `/s/[slug]` · APIs: `/api/cliente/*`, `/api/public/barbearias`, `/api/public/barbershop/[slug]`

> Documentos complementares desta jornada: [`pm/pwa.md`](./pwa.md) (app instalável), [`pm/login-social.md`](./login-social.md) (Google/Facebook) e [`pm/agendamento-e-fuso.md`](./agendamento-e-fuso.md) (fluxo de agendar reescrito).

## Conceito

O cliente final tem **conta própria**, com **login separado do painel** em `/cliente/login`, na identidade visual da área do cliente. A navegação é **totalmente livre**: qualquer pessoa vê o diretório, pesquisa barbearias e explora a página de cada uma sem login. O login só é exigido **no momento de agendar** — o fluxo anônimo antigo (só nome/telefone) foi desativado.

Além de e-mail e senha, a tela aceita **Google e Facebook** (código pronto, provedores ainda não ativados — ver `pm/login-social.md`).

## Página pública da barbearia (`/s/[slug]`) — abas

| Aba | Conteúdo | Status |
|---|---|---|
| Serviços | Catálogo ativo com categoria, duração, preço e atalho "Agendar este serviço" | ✅ |
| Detalhes | Descrição, endereço, telefone, WhatsApp (link direto) e e-mail | ✅ |
| Profissionais | **Somente barbeiros ativos** da barbearia, com foto, bio e atalho de agendamento | ✅ |
| Produtos | Vitrine dos produtos à venda do estoque (`active` + `sellable`), com preço e disponibilidade | ✅ |
| Fidelidade | Placeholder "em breve" — funcionalidade da Fase 2 do escopo | 🔜 |
| Pacotes | Placeholder "em breve" — Fase 2 | 🔜 |
| Assinaturas | Placeholder "em breve" — Fase 3 | 🔜 |
| Avaliações | Notas e comentários (model Review) com média em estrelas; hero mostra a média | ✅ |

O hero exibe capa, logo, cidade, média de avaliações e os botões "Agendar agora" e "Outras barbearias". Barbearias INACTIVE não são exibidas (404).

## Carrinho (reservas sem pagamento)

A página da barbearia tem um **carrinho** (botão flutuante 🛒 com contador). Conceito: **carrinho = reserva, sem cobrança online** — o cliente paga na barbearia.

- **Serviço no carrinho** = agendamento real: reserva a agenda do profissional escolhido no horário escolhido (fluxo de agendar). Remover do carrinho cancela o agendamento e libera o horário.
- **Produto no carrinho** = item numa comanda aberta (encomenda) da barbearia, vinculada ao cliente. A barbearia vê a encomenda no painel de comandas e a fecha quando o cliente pagar (momento da baixa de estoque). Remover do carrinho tira o item; carrinho vazio remove a encomenda do painel.
- Adicionar produto valida saldo em estoque na hora; mesmo produto duas vezes soma quantidade.
- O drawer mostra serviços reservados (com data/hora), produtos, total estimado e o aviso "nada é cobrado agora".
- Adicionar ao carrinho sem login redireciona para o login com retorno à página.

APIs: `GET /api/cliente/carrinho?slug=`, `POST/DELETE /api/cliente/carrinho/produtos`. Serviços reutilizam `POST /api/public/agendamentos` (criar) e `PATCH /api/cliente/agendamentos/[id]` (remover).

Limitação atual: vários serviços = várias reservas feitas em sequência pelo cliente (um horário por vez no fluxo). Encadeamento automático de horários consecutivos fica como melhoria futura.

## Visual e responsividade

Toda a jornada do cliente (`/cliente`, login, cadastro, meus agendamentos, `/s/[slug]` e fluxo de agendar) usa **tema claro** — mais amigável ao consumidor final — enquanto o painel da barbearia e o admin seguem no tema escuro. O layout é mobile-first: grids que empilham em telas pequenas, abas com rolagem horizontal, botões de ação em largura total no celular e formulário de agendamento em coluna única.

A home segue **layout de aplicativo**: saudação com a data, busca, próximo agendamento em destaque, banners, últimos acessos e barra de navegação inferior fixa (Início / Buscar / Agendamentos / Menu). A jornada é **instalável como app** — ver `pm/pwa.md`.

## Regras principais

1. **Login obrigatório para agendar** — a página `/s/[slug]/agendar` redireciona para `/cliente/login` (com retorno automático) se não houver sessão; nome e telefone são pré-preenchidos da conta.
2. **Última barbearia em destaque** — a cada agendamento, o sistema grava `User.lastBarbershopId`. No próximo acesso a `/cliente`, essa barbearia aparece no topo com botão "Agendar horário".
3. **Descoberta livre** — mesmo com uma barbearia fixa, o cliente pode pesquisar todas as barbearias ativas (nome, cidade ou slug) no diretório.
4. **Um cadastro, várias barbearias** — o registro `Customer` de cada barbearia é vinculado à conta (`Customer.userId`); o histórico une tudo em "Meus agendamentos".
5. **Cancelamento pelo cliente** — permitido para agendamentos futuros com status Agendado/Confirmado; o horário volta a ficar disponível. Horário já iniciado/passado: só a barbearia resolve.
6. **Logins separados** — o cliente entra por `/cliente/login`; `/login` é a porta do painel da barbearia e do admin. A autenticação por baixo é a mesma (NextAuth), mas as telas e os métodos diferem: só o cliente tem login social.

## Modelo de dados

- `User.lastBarbershopId` — última barbearia em que o cliente agendou.
- `Customer.userId` — liga o cadastro de cliente da barbearia à conta global (índice próprio).
- Migration: `20260726000003_add_customer_area`.

## APIs

- `GET /api/public/barbearias?q=&city=` — diretório público de barbearias ativas (rate-limited, máx. 60 resultados).
- `POST /api/cliente/registro` — cria conta de cliente (nome, e-mail, telefone, senha ≥ 8; rate limit 5/h por IP).
- `GET /api/cliente/me` — perfil + última barbearia (só retorna se ainda ativa).
- `GET /api/cliente/agendamentos` — próximos e histórico, em todas as barbearias.
- `PATCH /api/cliente/agendamentos/[id]` `{ action: "cancel" }` — cancela o próprio agendamento futuro.
- `POST /api/public/agendamentos` — **agora exige sessão**; vincula/cria o `Customer` com `userId`, atualiza `lastBarbershopId`.

Guard novo: `resolveCustomer` em `src/lib/auth-guard.ts` (sessão válida + usuário ativo; não exige vínculo com barbearia).

## Fluxo do cliente

1. Acessa `/cliente` → vê diretório (e a última barbearia, se já agendou antes).
2. Sem conta → `/cliente/cadastro` (login automático após criar).
3. Escolhe barbearia → `/s/[slug]` → "Agendar" → fluxo de **3 etapas** (serviço → profissional e agenda na mesma tela → resumo), com dados pré-preenchidos. Detalhe em `pm/agendamento-e-fuso.md`.
4. Confirmação grava a barbearia como "última"; o próximo acesso já abre com ela em destaque.
5. `/cliente/agendamentos` → acompanhar, reagendar ("Agendar de novo") ou cancelar.

## Impacto no painel da barbearia

Nenhuma mudança de fluxo: os agendamentos chegam igual, com o cliente identificado (Customer agora ligado a uma conta). Clientes cancelados pelo próprio cliente aparecem com status Cancelado na agenda.

## Pendências / próximos passos sugeridos

- Recuperação de senha (item E1 do cronograma) — importante agora que clientes têm conta.
- Notificação à barbearia quando o cliente cancela.
- Favoritos / múltiplas barbearias fixadas.
- Avaliações (model Review já existe no schema, sem fluxo).
