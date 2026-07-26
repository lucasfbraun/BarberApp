# Área do Cliente Final — Documentação

Data: 2026-07-26 · Páginas: `/cliente`, `/cliente/cadastro`, `/cliente/agendamentos`, `/s/[slug]` · APIs: `/api/cliente/*`, `/api/public/barbearias`, `/api/public/barbershop/[slug]`

## Conceito

O cliente final tem **conta própria** (e-mail + senha, mesma autenticação do sistema). A navegação é **totalmente livre**: qualquer pessoa vê o diretório, pesquisa barbearias e explora a página de cada uma sem login. O login só é exigido **no momento de agendar** — o fluxo anônimo antigo (só nome/telefone) foi desativado.

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

## Regras principais

1. **Login obrigatório para agendar** — a página `/s/[slug]/agendar` redireciona para `/login` (com retorno automático) se não houver sessão; nome e telefone são pré-preenchidos da conta.
2. **Última barbearia em destaque** — a cada agendamento, o sistema grava `User.lastBarbershopId`. No próximo acesso a `/cliente`, essa barbearia aparece no topo com botão "Agendar horário".
3. **Descoberta livre** — mesmo com uma barbearia fixa, o cliente pode pesquisar todas as barbearias ativas (nome, cidade ou slug) no diretório.
4. **Um cadastro, várias barbearias** — o registro `Customer` de cada barbearia é vinculado à conta (`Customer.userId`); o histórico une tudo em "Meus agendamentos".
5. **Cancelamento pelo cliente** — permitido para agendamentos futuros com status Agendado/Confirmado; o horário volta a ficar disponível. Horário já iniciado/passado: só a barbearia resolve.
6. **Login unificado** — a página `/login` serve funcionário e cliente: com vínculo de barbearia vai para `/agenda`; sem vínculo vai para `/cliente`.

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
3. Escolhe barbearia → `/s/[slug]` → "Agendar" → fluxo de 4 etapas com dados pré-preenchidos.
4. Confirmação grava a barbearia como "última"; o próximo acesso já abre com ela em destaque.
5. `/cliente/agendamentos` → acompanhar, reagendar ("Agendar de novo") ou cancelar.

## Impacto no painel da barbearia

Nenhuma mudança de fluxo: os agendamentos chegam igual, com o cliente identificado (Customer agora ligado a uma conta). Clientes cancelados pelo próprio cliente aparecem com status Cancelado na agenda.

## Pendências / próximos passos sugeridos

- Recuperação de senha (item E1 do cronograma) — importante agora que clientes têm conta.
- Notificação à barbearia quando o cliente cancela.
- Favoritos / múltiplas barbearias fixadas.
- Avaliações (model Review já existe no schema, sem fluxo).
