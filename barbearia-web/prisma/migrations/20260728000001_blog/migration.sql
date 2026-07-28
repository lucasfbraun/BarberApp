-- Blog da landing (sprint 30).
--
-- Posts no banco, e nao em markdown no repositorio, porque a automacao do n8n
-- precisa publicar por HTTP sem exigir commit e deploy a cada texto.

CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED');

CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "authorName" TEXT NOT NULL DEFAULT 'Equipe BarvioApp',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
-- A listagem publica filtra por status e ordena por data: e este o indice.
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- ---------------------------------------------------------------------------
-- Dois posts iniciais.
--
-- Usa dollar-quoting ($post$) em vez de aspas simples: o texto tem apostrofos
-- e markdown, e escapar tudo a mao seria pedir para errar.
--
-- `ON CONFLICT DO NOTHING` no slug torna a migration segura de reexecutar e
-- nao sobrescreve edicao feita depois pelo painel.
-- ---------------------------------------------------------------------------

INSERT INTO "Post" ("id", "slug", "title", "excerpt", "content", "tags", "status", "publishedAt", "createdAt", "updatedAt", "seoTitle", "seoDescription")
VALUES (
  'post_gestao_barbearia_001',
  'vantagens-de-usar-um-sistema-de-gestao-na-barbearia',
  'As vantagens de usar um sistema de gestão na barbearia',
  'Caderno e WhatsApp funcionam — até a barbearia crescer. Veja o que muda quando a agenda, o caixa e o cadastro de clientes passam a conversar entre si.',
  $post$Toda barbearia começa do mesmo jeito: um caderno na bancada, o WhatsApp no bolso e a memória do dono. Funciona. Funciona até o dia em que o telefone toca durante um corte, dois clientes aparecem no mesmo horário e ninguém lembra quanto o barbeiro fez no mês.

Um sistema de gestão não existe para deixar a barbearia "moderna". Existe para tirar da sua cabeça o que não deveria estar lá.

## O que muda na prática

**A agenda para de ter buraco e para de ter choque.** Quando o cliente agenda sozinho pela página da barbearia, ele vê apenas os horários que estão realmente livres — considerando a jornada do barbeiro, o intervalo do almoço e a duração do serviço. Ninguém precisa conferir nada.

**O caixa fecha sozinho.** Cada atendimento vira uma comanda com serviços e produtos. No fim do dia, o faturamento está somado, a comissão de cada barbeiro está calculada e a forma de pagamento está registrada. O que antes era meia hora de calculadora vira uma tela.

**O cliente vira histórico, não lembrança.** O sistema sabe quando ele veio pela última vez, o que costuma pedir e quanto já gastou. Na próxima visita, o barbeiro abre a ficha e já sabe a máquina que ele usa.

**O estoque para de sumir.** Pomada vendida na comanda dá baixa automática. Quando o saldo chega no mínimo, o alerta aparece antes de faltar na frente do cliente.

## O que costuma travar a decisão

**"É caro."** Compare com o custo de um horário vago que ninguém preencheu, ou com o cliente que não voltou porque foi esquecido. Costuma sair mais barato do que parece.

**"Minha equipe não vai usar."** Esse é o ponto legítimo. Sistema que exige treinamento longo morre na primeira semana cheia. O que funciona é o barbeiro abrir o celular e ver a agenda do dia — sem manual.

**"Não tenho tempo de cadastrar tudo."** Não precisa. Cadastre os serviços e a equipe. Os clientes entram sozinhos conforme agendam.

## Por onde começar

Não tente resolver tudo de uma vez. A ordem que costuma dar certo:

1. Cadastre serviços, preços e a jornada de cada barbeiro
2. Deixe o agendamento online no ar e divulgue o link
3. Comece a fechar as comandas pelo sistema
4. Só depois olhe estoque, comissão e relatórios

Em duas semanas você já tem número suficiente para parar de decidir no achismo.

## O sinal de que está na hora

Se você já perdeu um cliente por causa de horário trocado, se não sabe de cabeça quanto faturou semana passada, ou se depende de você estar presente para a barbearia funcionar — o caderno já cumpriu o papel dele.$post$,
  ARRAY['gestão', 'agenda', 'produtividade'],
  'PUBLISHED',
  NOW(),
  NOW(),
  NOW(),
  'Vantagens de usar um sistema de gestão na barbearia',
  'Agenda sem conflito, caixa fechado sozinho e histórico do cliente. O que muda quando a barbearia troca o caderno por um sistema.'
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Post" ("id", "slug", "title", "excerpt", "content", "tags", "status", "publishedAt", "createdAt", "updatedAt", "seoTitle", "seoDescription")
VALUES (
  'post_tendencias_barbearias_001',
  'tendencias-das-barbearias-o-que-esta-mudando',
  'Tendências das barbearias: o que está mudando',
  'A barbearia deixou de vender corte e passou a vender experiência. Cinco movimentos que já aparecem no dia a dia de quem está crescendo.',
  $post$A barbearia mudou mais nos últimos dez anos do que nos cinquenta anteriores. Deixou de ser lugar de passagem e virou destino — com marca, ambiente e cliente fiel. Alguns movimentos aparecem com clareza em quem está crescendo.

## 1. O cliente quer resolver sozinho

Ligar para marcar horário está virando exceção. O cliente prefere abrir o celular às onze da noite, ver o que está livre e agendar sem falar com ninguém. Barbearia que só atende por telefone perde exatamente o cliente mais organizado — aquele que planeja e não falta.

## 2. Especialização em vez de "fazemos de tudo"

Barbearias que se firmam escolhem uma identidade: navalha e barba tradicional, degradê e cortes urbanos, público infantil, atendimento executivo rápido. A escolha afasta uma parte das pessoas e atrai com muito mais força a outra — e é isso que constrói reputação.

## 3. Produto como segunda fonte de receita

Pomada, óleo de barba, shampoo específico. O cliente já confia no barbeiro para cuidar do cabelo; comprar o produto ali é o passo natural. Para a barbearia, é margem sem consumir cadeira — desde que o estoque esteja controlado e o produto não falte justo quando alguém pede.

## 4. Assinatura e recorrência

Planos mensais com número definido de cortes vêm ganhando espaço. Para o cliente, sai mais barato e cria hábito. Para a barbearia, transforma faturamento imprevisível em receita que dá para planejar — e é isso que permite contratar mais um barbeiro com alguma segurança.

## 5. A experiência importa tanto quanto o corte

Bebida, playlist, atendimento pelo nome, um espaço onde o cliente quer ficar. Não é frescura: é o que faz alguém pagar mais e voltar sempre no mesmo lugar, em vez de procurar o mais barato do bairro.

## O que sustenta tudo isso

Nenhuma dessas tendências funciona no improviso.

Agendamento online exige uma agenda confiável. Venda de produto exige estoque em dia. Assinatura exige saber quem pagou e quantos cortes restam. Atendimento personalizado exige histórico do cliente na mão do barbeiro.

É por isso que a organização interna virou pré-requisito. Não porque tecnologia seja moderna, mas porque sem ela essas coisas não param de pé.

## Por onde começar

Escolha um movimento — o que mais combina com a sua barbearia hoje — e faça bem feito antes de partir para o próximo. Tentar os cinco de uma vez costuma terminar com nenhum funcionando.$post$,
  ARRAY['tendências', 'mercado', 'experiência'],
  'PUBLISHED',
  NOW(),
  NOW(),
  NOW(),
  'Tendências das barbearias: o que está mudando',
  'Agendamento online, especialização, venda de produto, assinatura e experiência. Cinco movimentos no mercado de barbearias e o que sustenta cada um.'
)
ON CONFLICT ("slug") DO NOTHING;
