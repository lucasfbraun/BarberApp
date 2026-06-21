# Escopo do Software para Barbearia

## 1. Visão geral do produto

A ideia é desenvolver um software para barbearias inspirado em soluções como o AppBarber, mas com um posicionamento próprio: uma plataforma tecnológica, moderna e personalizável, onde cada barbearia possa usar o sistema com a própria identidade visual.

O produto deve funcionar como um SaaS multiempresa, no qual cada barbearia possui seu próprio ambiente, seus profissionais, clientes, agenda, serviços, regras, cores, logo e página pública de agendamento.

A aplicação deve ser pensada para rodar inicialmente na Vercel, preferencialmente com Next.js, PostgreSQL e uma arquitetura web-first. O produto pode começar como uma aplicação web responsiva ou PWA, evitando a necessidade inicial de aplicativos nativos para iOS e Android.

---

## 2. Proposta central

O produto não deve ter uma identidade visual rígida e única para todos os clientes. A proposta é que cada barbearia consiga transformar a aplicação em uma experiência própria.

### Proposta de valor

> Um sistema de agendamento e gestão para barbearias com aparência personalizada para cada negócio.

### Diferenciais principais

| Diferencial | Valor para a barbearia |
|---|---|
| Personalização visual | A barbearia sente que o sistema é dela. |
| Logo própria | Reforça a marca da barbearia. |
| Paleta de cores configurável | Cada cliente pode adaptar o visual ao seu branding. |
| Página pública de agendamento | Cliente final agenda sem precisar baixar app. |
| PWA responsiva | Funciona bem no celular, tablet e desktop. |
| WhatsApp-first | Mais alinhado ao comportamento do mercado brasileiro. |
| Agenda simples e eficiente | Resolve o principal problema operacional da barbearia. |
| Gestão de profissionais e comissões | Ajuda no controle interno. |
| Comanda e fechamento de atendimento | Liga agenda com faturamento. |
| Produto preparado para escalar | Base SaaS para vender para várias barbearias. |

---

## 3. Referência de funcionalidades inspiradas no AppBarber

A aplicação deve considerar como referência as principais funcionalidades comunicadas por sistemas como o AppBarber.

### Funcionalidades observadas como referência

- Agendamento online.
- WebAdmin para gestão.
- Aplicativo ou área para cliente.
- Aplicativo ou área para profissional.
- Cadastro de serviços.
- Cadastro de profissionais.
- Cadastro de clientes.
- Agenda por profissional.
- Lembrete de horários.
- Mensagens automáticas.
- Envio de promoções.
- Programa de fidelidade.
- Clube de clientes.
- Pacotes.
- Pagamento online.
- Gestão financeira.
- Caixa.
- Relatórios.
- Comissões.
- Vales e adiantamentos.
- Estoque.
- Produtos.
- Comandas.
- Aniversariantes.
- Lista de espera.
- Pesquisa de satisfação.
- Site do estabelecimento.
- Multiunidades.
- Configurações avançadas pelo painel administrativo.

Essas funcionalidades não precisam entrar todas no MVP, mas devem fazer parte do planejamento do produto.

---

## 4. Estratégia de desenvolvimento

A aplicação deve ser dividida em fases para evitar que o MVP fique grande demais.

### Fase 1 — MVP

O objetivo da primeira versão é validar o produto com barbearias reais.

Deve conter:

1. Multiempresa / multi-tenant.
2. Cadastro da barbearia.
3. Personalização visual.
4. Logo da barbearia.
5. Paleta de cores configurável.
6. Autenticação.
7. Usuários e permissões básicas.
8. Cadastro de profissionais.
9. Cadastro de serviços.
10. Vínculo entre profissional e serviço.
11. Jornada de trabalho dos profissionais.
12. Agenda interna.
13. Página pública de agendamento.
14. Cadastro automático ou manual de clientes.
15. Status dos agendamentos.
16. Comanda simples.
17. Fechamento de atendimento.
18. Forma de pagamento.
19. Comissão simples por profissional.
20. Relatório diário básico.

### Fase 2 — Expansão operacional

Deve conter:

1. Notificações automáticas.
2. Lembretes via WhatsApp.
3. Lista de espera.
4. Estoque.
5. Produtos.
6. Vendas de produtos.
7. Programa de fidelidade.
8. Pacotes.
9. Comissões avançadas.
10. Vales e adiantamentos.
11. Financeiro mais completo.
12. Relatórios avançados.
13. Pesquisa de satisfação.
14. Aniversariantes.
15. Promoções e cupons.
16. Página pública mais completa.
17. Domínio próprio para barbearias.

### Fase 3 — Produto avançado

Deve conter:

1. Clube de clientes.
2. Assinaturas para clientes da barbearia.
3. Pagamento online.
4. App/PWA do profissional.
5. App/PWA do cliente.
6. Multiunidades.
7. Marketplace interno de serviços.
8. Integrações contábeis.
9. Integrações fiscais, se aplicável.
10. BI avançado.
11. Automação de marketing.
12. White-label mais profundo.
13. Aplicativo nativo, se houver demanda validada.

---

# 5. Módulos obrigatórios da aplicação

## 5.1. Módulo multiempresa / multi-tenant

A aplicação deve permitir que várias barbearias usem o mesmo sistema sem misturar dados entre elas.

Cada barbearia deve ter:

- ID próprio.
- Nome.
- Slug público.
- Logo.
- Paleta de cores.
- Configurações próprias.
- Profissionais próprios.
- Serviços próprios.
- Clientes próprios.
- Agenda própria.
- Comandas próprias.
- Relatórios próprios.
- Plano de assinatura próprio.

### Exemplo de URL pública

```txt
/s/barbearia-do-joao
```

### Exemplo futuro com domínio próprio

```txt
agenda.barbeariadojoao.com.br
```

### Modelo sugerido

```txt
barbershops
- id
- name
- slug
- description
- phone
- whatsapp
- email
- address
- city
- state
- zip_code
- logo_url
- cover_image_url
- primary_color
- secondary_color
- accent_color
- background_color
- text_color
- border_radius
- font_family
- custom_domain
- timezone
- active
- created_at
- updated_at
```

---

## 5.2. Módulo de personalização visual

Este é um dos diferenciais principais do produto.

A barbearia deve conseguir configurar:

- Logo.
- Imagem de capa.
- Nome público.
- Descrição curta.
- Cor primária.
- Cor secundária.
- Cor de destaque.
- Cor de fundo.
- Cor de texto.
- Raio de borda dos botões e cards.
- Fonte, se o produto permitir.
- Links de redes sociais.
- Preview antes de publicar.

### Requisitos

- O painel deve ter uma tela de personalização.
- O cliente deve conseguir visualizar como ficará a página pública.
- A aplicação deve aplicar as cores de forma dinâmica.
- O tema deve ser salvo por barbearia.
- A personalização deve impactar a página pública e, se desejado, parte do painel interno.

### Implementação visual sugerida

Usar variáveis CSS por tenant:

```css
:root {
  --color-primary: var(--tenant-primary);
  --color-secondary: var(--tenant-secondary);
  --color-accent: var(--tenant-accent);
  --color-background: var(--tenant-background);
  --color-text: var(--tenant-text);
}
```

### Campos sugeridos

```txt
theme_settings
- id
- barbershop_id
- logo_url
- cover_image_url
- primary_color
- secondary_color
- accent_color
- background_color
- text_color
- button_radius
- card_radius
- font_family
- social_instagram
- social_facebook
- social_tiktok
- social_website
- updated_at
```

---

## 5.3. Módulo de autenticação e usuários

A aplicação deve ter autenticação segura para os usuários da barbearia.

### Tipos de usuários

| Perfil | Permissões |
|---|---|
| Dono/Admin | Acessa tudo na barbearia. |
| Gerente | Gerencia agenda, profissionais, clientes e relatórios. |
| Profissional/Barbeiro | Vê sua agenda, seus atendimentos e suas comissões. |
| Recepção | Gerencia agenda, clientes e comandas. |
| Cliente final | Agenda horários e vê seus próprios agendamentos. |
| Superadmin SaaS | Gerencia todas as barbearias, planos e suporte. |

### Requisitos

- Login por e-mail e senha.
- Recuperação de senha.
- Convite de usuários.
- Controle de permissões.
- Usuário vinculado a uma ou mais barbearias.
- Sessão segura.
- Proteção de rotas.
- Auditoria básica de ações importantes.

### Modelo sugerido

```txt
users
- id
- name
- email
- phone
- password_hash
- avatar_url
- active
- created_at
- updated_at

barbershop_users
- id
- barbershop_id
- user_id
- role
- active
- created_at
```

---

## 5.4. Módulo de cadastro da barbearia

A aplicação deve permitir cadastrar e configurar os dados principais da barbearia.

### Campos

- Nome.
- Descrição.
- Telefone.
- WhatsApp.
- E-mail.
- Endereço.
- Cidade.
- Estado.
- CEP.
- Horário geral de funcionamento.
- Redes sociais.
- Política de cancelamento.
- Tempo mínimo de antecedência para agendamento.
- Tempo mínimo de antecedência para cancelamento.
- Intervalo padrão entre horários.
- Fuso horário.
- Status da barbearia.

### Configurações importantes

- Permitir agendamento online.
- Permitir escolha de profissional.
- Permitir agendamento com qualquer profissional.
- Exigir confirmação por WhatsApp.
- Permitir cancelamento pelo cliente.
- Definir prazo para cancelamento.
- Exibir ou ocultar preços.
- Exibir ou ocultar profissionais.
- Exibir ou ocultar duração dos serviços.

---

## 5.5. Módulo de profissionais

A aplicação deve permitir cadastrar todos os profissionais da barbearia.

### Campos

- Nome.
- Foto.
- Bio curta.
- Telefone.
- E-mail.
- Status ativo/inativo.
- Serviços que atende.
- Jornada de trabalho.
- Comissão padrão.
- Ordem de exibição.
- Permissão de acesso ao painel.

### Funcionalidades

- Criar profissional.
- Editar profissional.
- Desativar profissional.
- Definir quais serviços o profissional realiza.
- Definir horários de trabalho.
- Definir pausas.
- Definir folgas.
- Definir bloqueios de agenda.
- Ver agenda individual.
- Ver produção do profissional.
- Ver comissão do profissional.

### Modelo sugerido

```txt
professionals
- id
- barbershop_id
- user_id
- name
- photo_url
- bio
- phone
- email
- commission_type
- commission_value
- display_order
- active
- created_at
- updated_at
```

---

## 5.6. Módulo de serviços

A aplicação deve permitir cadastrar os serviços oferecidos pela barbearia.

### Exemplos de serviços

- Corte masculino.
- Barba.
- Corte + barba.
- Sobrancelha.
- Pigmentação.
- Luzes.
- Relaxamento.
- Acabamento.
- Hidratação.
- Plano mensal.
- Combo personalizado.

### Campos

- Nome do serviço.
- Descrição.
- Duração em minutos.
- Preço.
- Categoria.
- Imagem opcional.
- Status ativo/inativo.
- Profissionais que realizam o serviço.
- Comissão específica, futuramente.

### Modelo sugerido

```txt
services
- id
- barbershop_id
- name
- description
- category_id
- duration_minutes
- price
- image_url
- active
- created_at
- updated_at

service_categories
- id
- barbershop_id
- name
- display_order
- active

professional_services
- id
- professional_id
- service_id
- custom_price
- custom_duration_minutes
- active
```

---

## 5.7. Módulo de jornada de trabalho

Cada profissional deve poder ter sua própria jornada.

### Requisitos

- Configurar dias da semana.
- Definir hora de início.
- Definir hora de fim.
- Definir intervalo/pausa.
- Permitir múltiplos períodos no mesmo dia.
- Bloquear horários específicos.
- Registrar férias.
- Registrar folgas.
- Registrar ausência temporária.
- Configurar exceções por data.

### Modelo sugerido

```txt
working_hours
- id
- professional_id
- weekday
- start_time
- end_time
- break_start
- break_end
- active

schedule_blocks
- id
- barbershop_id
- professional_id
- starts_at
- ends_at
- reason
- type
- created_at
```

### Tipos de bloqueio

```txt
manual_block
day_off
vacation
holiday
personal
maintenance
```

---

## 5.8. Módulo de agenda

A agenda é o coração do sistema.

### Visualizações

- Agenda do dia.
- Agenda da semana.
- Agenda mensal, futuramente.
- Agenda por profissional.
- Agenda geral da barbearia.
- Lista de próximos atendimentos.
- Lista de horários cancelados.
- Lista de faltas.

### Funcionalidades

- Criar agendamento manual.
- Criar agendamento público pelo cliente.
- Editar agendamento.
- Reagendar.
- Cancelar.
- Confirmar.
- Marcar como atendido.
- Marcar como falta.
- Adicionar observações.
- Adicionar serviço extra.
- Vincular cliente.
- Vincular profissional.
- Bloquear horários.
- Evitar conflito de horários.
- Calcular disponibilidade automaticamente.
- Respeitar duração do serviço.
- Respeitar jornada do profissional.
- Respeitar pausas e bloqueios.

### Status dos agendamentos

```txt
scheduled
confirmed
in_progress
completed
cancelled
no_show
rescheduled
```

### Modelo sugerido

```txt
appointments
- id
- barbershop_id
- professional_id
- customer_id
- service_id
- starts_at
- ends_at
- status
- source
- notes
- cancellation_reason
- cancelled_at
- confirmed_at
- completed_at
- created_at
- updated_at
```

### Fontes de agendamento

```txt
admin_panel
public_page
whatsapp
professional_panel
imported
```

---

## 5.9. Módulo de página pública de agendamento

Cada barbearia deve ter uma página pública personalizada.

### URL sugerida

```txt
/s/[slug]
```

### Fluxo do cliente

1. Acessa a página pública.
2. Visualiza logo, nome, descrição e cores da barbearia.
3. Escolhe um serviço.
4. Escolhe um profissional ou seleciona qualquer profissional disponível.
5. Escolhe data.
6. Escolhe horário disponível.
7. Informa nome, telefone/WhatsApp e e-mail opcional.
8. Confirma o agendamento.
9. Recebe uma confirmação.
10. Pode cancelar ou reagendar, se a barbearia permitir.

### Requisitos

- Deve ser responsiva.
- Deve ser rápida.
- Deve refletir a identidade visual configurada pela barbearia.
- Deve funcionar bem no celular.
- Deve evitar etapas desnecessárias.
- Deve exibir apenas serviços ativos.
- Deve exibir apenas profissionais ativos.
- Deve respeitar disponibilidade real.
- Deve permitir confirmação visual do agendamento.

### Páginas públicas sugeridas

```txt
/s/[slug]
/s/[slug]/agendar
/s/[slug]/agendar/servico
/s/[slug]/agendar/profissional
/s/[slug]/agendar/horario
/s/[slug]/confirmacao
/s/[slug]/cancelar/[token]
```

---

## 5.10. Módulo de clientes

O sistema deve manter uma base de clientes da barbearia.

### Campos

- Nome.
- Telefone/WhatsApp.
- E-mail.
- Data de nascimento.
- Observações.
- Tags.
- Data do primeiro atendimento.
- Data do último atendimento.
- Quantidade de atendimentos.
- Total gasto.
- Status ativo/inativo.

### Funcionalidades

- Criar cliente manualmente.
- Criar cliente automaticamente via agendamento.
- Editar dados.
- Ver histórico de agendamentos.
- Ver histórico de comandas.
- Ver faltas.
- Ver aniversariantes.
- Adicionar observações internas.
- Criar tags.
- Identificar clientes recorrentes.
- Identificar clientes inativos.

### Modelo sugerido

```txt
customers
- id
- barbershop_id
- name
- phone
- email
- birthdate
- notes
- tags
- first_visit_at
- last_visit_at
- total_visits
- total_spent
- active
- created_at
- updated_at
```

---

## 5.11. Módulo de comanda simples

A comanda conecta o atendimento com o faturamento.

### Funcionalidades MVP

- Abrir comanda a partir de um agendamento.
- Criar comanda avulsa.
- Adicionar serviço.
- Adicionar produto, futuramente.
- Aplicar desconto.
- Informar forma de pagamento.
- Fechar comanda.
- Marcar agendamento como concluído.
- Gerar comissão do profissional.
- Registrar valor total.

### Formas de pagamento

- Dinheiro.
- Pix.
- Cartão de crédito.
- Cartão de débito.
- Voucher.
- Cortesia.
- Múltiplas formas, futuramente.

### Modelo sugerido

```txt
orders
- id
- barbershop_id
- appointment_id
- customer_id
- professional_id
- status
- subtotal
- discount_type
- discount_value
- total
- payment_status
- closed_at
- created_at
- updated_at

order_items
- id
- order_id
- type
- service_id
- product_id
- name
- quantity
- unit_price
- total
```

### Status de comanda

```txt
open
closed
cancelled
refunded
```

---

## 5.12. Módulo de pagamentos da comanda

No MVP, o pagamento pode ser apenas informativo. Depois, pode evoluir para pagamento online.

### MVP

- Registrar forma de pagamento.
- Registrar valor recebido.
- Registrar troco, se necessário.
- Fechar comanda.
- Exibir total do dia por forma de pagamento.

### Fase futura

- Integração com Mercado Pago.
- Integração com Asaas.
- Integração com Pagar.me.
- Integração com Stripe, se fizer sentido.
- Link de pagamento.
- Pagamento antecipado.
- Sinal para reserva de horário.
- Pagamento de pacotes.
- Pagamento de assinatura do cliente final.
- Conciliação de pagamentos.

### Modelo sugerido

```txt
payments
- id
- barbershop_id
- order_id
- amount
- method
- provider
- provider_transaction_id
- status
- paid_at
- created_at
```

---

## 5.13. Módulo de comissão

A aplicação deve permitir calcular comissões de profissionais.

### MVP

- Comissão percentual padrão por profissional.
- Comissão calculada ao fechar comanda.
- Relatório por período.
- Valor bruto produzido.
- Valor de comissão.
- Status simples.

### Fase futura

- Comissão por serviço.
- Comissão por produto.
- Comissão diferente por categoria.
- Comissão fixa por serviço.
- Comissão por faixa de faturamento.
- Vales e adiantamentos.
- Descontos de comissão.
- Marcar comissão como paga.
- Histórico de pagamentos ao profissional.

### Modelo sugerido

```txt
commissions
- id
- barbershop_id
- professional_id
- order_id
- order_item_id
- gross_amount
- commission_type
- commission_rate
- commission_amount
- status
- paid_at
- created_at
```

### Status de comissão

```txt
pending
available
paid
cancelled
```

---

## 5.14. Módulo de relatório diário

O MVP deve ter relatórios simples e úteis.

### Relatórios iniciais

- Agendamentos do dia.
- Atendimentos concluídos.
- Atendimentos cancelados.
- Faltas.
- Faturamento do dia.
- Faturamento por forma de pagamento.
- Produção por profissional.
- Comissão por profissional.
- Serviços mais vendidos.
- Clientes atendidos.

### Fase futura

- Comparativo por período.
- Ticket médio.
- Retenção de clientes.
- Recorrência.
- Taxa de faltas.
- Taxa de cancelamentos.
- Horários mais buscados.
- Profissionais com maior faturamento.
- Serviços mais lucrativos.
- Relatórios exportáveis em CSV/PDF.
- Dashboard de BI.

---

# 6. Módulos para a fase 2

## 6.1. Notificações e lembretes

A aplicação deve permitir comunicação automática com clientes.

### Canais

- WhatsApp.
- E-mail.
- SMS, opcional.
- Push notification, se houver PWA/app.

### Tipos de mensagens

- Confirmação de agendamento.
- Lembrete de horário.
- Cancelamento.
- Reagendamento.
- Pós-atendimento.
- Pedido de avaliação.
- Aniversário.
- Promoções.
- Cliente inativo.
- Campanhas.

### Modelo sugerido

```txt
notification_templates
- id
- barbershop_id
- type
- channel
- subject
- body
- active
- created_at

notification_logs
- id
- barbershop_id
- customer_id
- appointment_id
- channel
- type
- status
- sent_at
- error_message
```

---

## 6.2. Lista de espera

A lista de espera ajuda a ocupar horários cancelados.

### Funcionalidades

- Cliente entra em lista de espera para um dia ou profissional.
- Cliente escolhe serviço desejado.
- Sistema identifica quando surge horário.
- Sistema notifica clientes da lista.
- Admin pode converter lista de espera em agendamento.
- Cliente pode sair da lista.

### Modelo sugerido

```txt
waiting_list
- id
- barbershop_id
- customer_id
- service_id
- professional_id
- desired_date
- desired_start_time
- desired_end_time
- status
- notes
- created_at
```

### Status

```txt
waiting
notified
scheduled
cancelled
expired
```

---

## 6.3. Estoque

O módulo de estoque deve controlar produtos usados ou vendidos pela barbearia.

### Funcionalidades

- Cadastrar produtos.
- Controlar quantidade em estoque.
- Definir estoque mínimo.
- Registrar entrada.
- Registrar saída.
- Vender produto na comanda.
- Baixar produto usado em atendimento, futuramente.
- Alertar estoque baixo.
- Relatório de movimentação.

### Modelo sugerido

```txt
products
- id
- barbershop_id
- name
- description
- sku
- barcode
- cost_price
- sale_price
- stock_quantity
- min_stock_quantity
- active
- created_at
- updated_at

stock_movements
- id
- barbershop_id
- product_id
- type
- quantity
- reason
- order_id
- created_at
```

### Tipos de movimentação

```txt
purchase
sale
manual_adjustment
loss
internal_use
return
```

---

## 6.4. Produtos e vendas

Além de serviços, a barbearia pode vender produtos.

### Exemplos

- Pomada modeladora.
- Shampoo.
- Óleo para barba.
- Balm.
- Navalha.
- Pente.
- Boné.
- Kit presente.

### Funcionalidades

- Cadastrar produtos.
- Adicionar produto à comanda.
- Calcular comissão por produto.
- Controlar estoque.
- Relatório de produtos vendidos.
- Margem de lucro.

---

## 6.5. Programa de fidelidade

O sistema deve permitir criar regras de fidelidade para aumentar a recorrência.

### Modelos possíveis

- A cada X cortes, ganha 1 corte.
- A cada R$ X gastos, ganha benefício.
- Acúmulo de pontos.
- Cashback interno.
- Benefício por indicação.
- Cupom de retorno.

### Funcionalidades

- Configurar regra.
- Acumular pontos automaticamente.
- Consultar saldo do cliente.
- Resgatar benefício.
- Histórico de pontos.
- Expiração de pontos.

### Modelo sugerido

```txt
loyalty_programs
- id
- barbershop_id
- name
- type
- rule_config
- active
- created_at

loyalty_transactions
- id
- barbershop_id
- customer_id
- points
- type
- source_order_id
- expires_at
- created_at
```

---

## 6.6. Pacotes

Pacotes permitem vender vários serviços antecipadamente.

### Exemplos

- 4 cortes por mês.
- 2 cortes + 2 barbas.
- Pacote de noivo.
- Pacote de hidratação.
- Pacote mensal de manutenção.

### Funcionalidades

- Criar pacote.
- Definir quantidade de serviços.
- Definir validade.
- Vender pacote.
- Consumir créditos do pacote.
- Ver saldo do cliente.
- Alertar vencimento.
- Relatório de pacotes vendidos.

### Modelo sugerido

```txt
packages
- id
- barbershop_id
- name
- description
- price
- validity_days
- active
- created_at

package_items
- id
- package_id
- service_id
- quantity

customer_packages
- id
- barbershop_id
- customer_id
- package_id
- purchased_at
- expires_at
- status

customer_package_usages
- id
- customer_package_id
- appointment_id
- service_id
- used_at
```

---

## 6.7. Financeiro completo

O financeiro completo deve ir além da comanda.

### Funcionalidades

- Caixa diário.
- Abertura e fechamento de caixa.
- Contas a pagar.
- Contas a receber.
- Categorias financeiras.
- Despesas fixas.
- Despesas variáveis.
- Receitas avulsas.
- Taxas de cartão.
- Conciliação.
- Fluxo de caixa.
- DRE simples.
- Exportação de relatórios.

### Modelo sugerido

```txt
cash_registers
- id
- barbershop_id
- opened_by_user_id
- closed_by_user_id
- opening_amount
- closing_amount
- opened_at
- closed_at
- status

financial_transactions
- id
- barbershop_id
- type
- category
- description
- amount
- due_date
- paid_at
- status
- payment_method
- created_at
```

---

## 6.8. Promoções e cupons

A aplicação deve permitir que barbearias criem campanhas comerciais.

### Funcionalidades

- Criar cupom de desconto.
- Definir validade.
- Definir limite de uso.
- Definir serviços elegíveis.
- Definir clientes elegíveis.
- Aplicar cupom no agendamento ou comanda.
- Medir resultado da campanha.

### Modelo sugerido

```txt
coupons
- id
- barbershop_id
- code
- description
- discount_type
- discount_value
- starts_at
- ends_at
- max_uses
- used_count
- active
```

---

## 6.9. Pesquisa de satisfação

Após o atendimento, o cliente pode avaliar a experiência.

### Funcionalidades

- Enviar pesquisa automaticamente.
- Nota de 1 a 5.
- Comentário opcional.
- Avaliação por profissional.
- Avaliação por serviço.
- NPS, futuramente.
- Relatório de satisfação.

### Modelo sugerido

```txt
reviews
- id
- barbershop_id
- appointment_id
- customer_id
- professional_id
- rating
- comment
- source
- created_at
```

---

## 6.10. Aniversariantes

O sistema deve ajudar a barbearia a se relacionar com clientes.

### Funcionalidades

- Cadastro de data de nascimento.
- Lista de aniversariantes do dia.
- Lista de aniversariantes do mês.
- Mensagem automática de aniversário.
- Cupom de aniversário.
- Relatório de campanhas de aniversário.

---

## 6.11. Site do estabelecimento

Além da página de agendamento, a barbearia pode ter uma página pública mais completa.

### Seções possíveis

- Capa.
- Sobre a barbearia.
- Serviços.
- Profissionais.
- Galeria de fotos.
- Avaliações.
- Endereço.
- Mapa.
- Horário de funcionamento.
- Redes sociais.
- Botão de agendamento.
- Botão de WhatsApp.

### Objetivo

Ajudar a barbearia a ter presença digital sem precisar contratar um site separado.

---

## 6.12. Domínio próprio

Na fase futura, cada barbearia poderá usar seu próprio domínio ou subdomínio.

### Exemplos

```txt
agenda.barbeariadojoao.com.br
www.barbeariadojoao.com.br
```

### Requisitos

- Cadastro de domínio no painel.
- Validação DNS.
- Certificado SSL.
- Roteamento por domínio.
- Tratamento de fallback.
- Instruções para o cliente configurar DNS.

---

# 7. Módulos para a fase 3

## 7.1. Clube de clientes

O clube de clientes permite receita recorrente para a barbearia.

### Exemplos

- Plano mensal de corte.
- Plano corte + barba.
- Clube VIP.
- Clube família.
- Assinatura com benefícios exclusivos.

### Funcionalidades

- Criar plano.
- Definir preço mensal.
- Definir benefícios.
- Cobrança recorrente.
- Controle de inadimplência.
- Uso de serviços incluídos.
- Área do cliente para ver assinatura.
- Cancelamento de assinatura.

---

## 7.2. Pagamento online

A aplicação pode permitir que o cliente pague antes ou depois do atendimento.

### Casos de uso

- Sinal para reservar horário.
- Pagamento total antecipado.
- Compra de pacote.
- Compra de assinatura.
- Pagamento de comanda por link.
- Pagamento de multa por não comparecimento, se previsto.

### Integrações possíveis

- Mercado Pago.
- Asaas.
- Pagar.me.
- Stripe.
- Pix via PSP.
- Cartão de crédito.
- Boleto, se fizer sentido.

---

## 7.3. App ou PWA do profissional

O profissional deve ter uma experiência própria.

### Funcionalidades

- Ver agenda do dia.
- Ver próximos clientes.
- Confirmar atendimento.
- Marcar cliente como atendido.
- Marcar falta.
- Ver histórico do cliente.
- Ver produção do dia.
- Ver comissão.
- Solicitar bloqueio de horário.
- Receber notificações.

---

## 7.4. App ou PWA do cliente

O cliente final pode ter uma área própria.

### Funcionalidades

- Ver agendamentos futuros.
- Ver histórico.
- Reagendar.
- Cancelar.
- Comprar pacote.
- Ver pontos de fidelidade.
- Ver assinatura.
- Receber promoções.
- Favoritar profissional.
- Atualizar dados.

---

## 7.5. Multiunidades

A aplicação deve permitir que uma marca tenha várias unidades.

### Exemplo

Uma rede de barbearias com unidades em bairros diferentes.

### Funcionalidades

- Empresa principal.
- Unidades vinculadas.
- Profissionais por unidade.
- Serviços por unidade.
- Agenda por unidade.
- Relatórios por unidade.
- Relatório consolidado.
- Cliente atendido em múltiplas unidades.
- Permissões por unidade.

### Modelo sugerido

```txt
organizations
- id
- name
- owner_user_id
- created_at

barbershops
- id
- organization_id
- name
- slug
- address
- active
```

---

## 7.6. Automação de marketing

A aplicação pode ter automações para aumentar retorno de clientes.

### Exemplos

- Cliente sem visitar há 30 dias.
- Cliente que fez corte, mas nunca fez barba.
- Cliente que faltou.
- Cliente com aniversário próximo.
- Cliente VIP.
- Cliente com pacote vencendo.
- Cliente com pontos próximos do resgate.

### Funcionalidades

- Criar segmentações.
- Criar campanhas.
- Enviar WhatsApp/e-mail.
- Medir abertura/clique, quando possível.
- Medir retorno em agendamentos.
- Relatório de conversão.

---

## 7.7. BI avançado

Dashboards avançados podem ajudar o dono da barbearia a tomar decisões.

### Indicadores

- Faturamento mensal.
- Crescimento.
- Ticket médio.
- Clientes novos.
- Clientes recorrentes.
- Churn de clientes.
- Taxa de ocupação.
- Horários ociosos.
- Serviços mais vendidos.
- Profissionais mais produtivos.
- Comissão total.
- Estoque parado.
- Margem por produto.
- Resultado por unidade.

---

# 8. Administração do SaaS

Além do painel da barbearia, o produto precisa de um painel interno para o dono da plataforma.

## 8.1. Superadmin

### Funcionalidades

- Ver todas as barbearias.
- Criar barbearia manualmente.
- Desativar barbearia.
- Ver plano contratado.
- Ver status de pagamento.
- Acessar informações de suporte.
- Gerenciar usuários.
- Consultar logs.
- Consultar uso da plataforma.
- Gerenciar limites por plano.
- Ver métricas do SaaS.

## 8.2. Planos e cobrança do SaaS

O sistema deve ter estrutura para vender planos às barbearias.

### Exemplos de planos

| Plano | Ideal para |
|---|---|
| Básico | Barbearia pequena com poucos profissionais. |
| Profissional | Barbearia com equipe e comissões. |
| Premium | Barbearia com financeiro, estoque e automações. |
| Rede | Barbearias com multiunidades. |

### Limites possíveis por plano

- Número de profissionais.
- Número de agendamentos por mês.
- Número de unidades.
- Quantidade de mensagens automáticas.
- Uso de domínio próprio.
- Uso de relatórios avançados.
- Uso de estoque.
- Uso de financeiro.
- Uso de automações.

### Modelo sugerido

```txt
plans
- id
- name
- description
- price
- billing_cycle
- limits_config
- features_config
- active

subscriptions
- id
- barbershop_id
- plan_id
- status
- current_period_start
- current_period_end
- trial_ends_at
- cancelled_at
- created_at
```

---

# 9. Requisitos não funcionais

## 9.1. Segurança

A aplicação deve ter:

- Autenticação segura.
- Criptografia de senha.
- HTTPS.
- Controle de permissões.
- Separação de dados por barbearia.
- Proteção contra acesso cruzado entre tenants.
- Validação de entrada.
- Proteção contra SQL Injection.
- Proteção contra XSS.
- Proteção contra CSRF quando aplicável.
- Rate limit em endpoints sensíveis.
- Logs de auditoria.
- Backups regulares.
- Gestão segura de variáveis de ambiente.

## 9.2. LGPD

A aplicação deve considerar boas práticas de privacidade.

### Requisitos

- Informar finalidade do uso dos dados.
- Permitir exclusão ou anonimização de cliente, quando aplicável.
- Controlar acesso aos dados.
- Não expor dados de clientes publicamente.
- Registrar consentimento para comunicações promocionais.
- Permitir opt-out de campanhas.
- Ter política de privacidade.
- Ter termos de uso.

## 9.3. Performance

A aplicação deve ser rápida no celular.

### Requisitos

- Carregamento rápido da página pública.
- Imagens otimizadas.
- Cache quando possível.
- Queries eficientes.
- Paginação em listas grandes.
- Índices no banco.
- Evitar renderizações pesadas.
- Usar Server Components quando fizer sentido.
- Usar CDN para assets.

## 9.4. Disponibilidade

A aplicação deve ser estável para uso diário.

### Requisitos

- Monitoramento de erros.
- Logs de aplicação.
- Alertas.
- Backup do banco.
- Estratégia de rollback.
- Ambientes separados: desenvolvimento, homologação e produção.
- Preview deployments.

## 9.5. Acessibilidade

A interface deve seguir boas práticas básicas:

- Contraste adequado.
- Labels em campos.
- Navegação por teclado.
- Textos claros.
- Botões grandes o suficiente no celular.
- Feedback visual de ações.
- Mensagens de erro compreensíveis.

---

# 10. Arquitetura recomendada para Vercel

## 10.1. Stack sugerida

```txt
Frontend + Backend
- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui ou componentes próprios
- Server Actions
- Route Handlers

Banco de dados
- PostgreSQL
- Neon, Supabase, Railway, Render ou outro Postgres compatível

ORM
- Prisma ou Drizzle

Autenticação
- Auth.js
- Clerk
- Supabase Auth
- Outra solução compatível

Armazenamento de arquivos
- Vercel Blob
- S3
- Cloudflare R2
- Supabase Storage

Jobs e automações
- Inngest
- Trigger.dev
- Upstash QStash
- Cron Jobs da Vercel, quando suficiente

Pagamentos
- Mercado Pago
- Asaas
- Pagar.me
- Stripe

Mensageria
- API oficial do WhatsApp Business
- Z-API, Evolution API ou outro provedor, avaliando riscos e conformidade
- E-mail transacional via Resend, SendGrid, Postmark ou similar

Monitoramento
- Sentry
- Logtail
- Axiom
- Vercel Analytics
```

## 10.2. Estrutura de aplicação

```txt
/app
  /(marketing)
    page.tsx
  /(auth)
    login
    register
    forgot-password
  /(dashboard)
    app
      page.tsx
      agenda
      clientes
      profissionais
      servicos
      comandas
      financeiro
      relatorios
      personalizacao
      configuracoes
  /s
    [slug]
      page.tsx
      agendar
      confirmacao
/api
  webhooks
  auth
  public
  internal
```

## 10.3. Rotas principais

```txt
/                         Landing page do SaaS
/precos                   Planos
/login                    Login
/cadastro                 Cadastro
/app                      Dashboard interno
/app/agenda               Agenda
/app/clientes             Clientes
/app/profissionais        Profissionais
/app/servicos             Serviços
/app/comandas             Comandas
/app/financeiro           Financeiro
/app/relatorios           Relatórios
/app/personalizacao       Cores, logo e identidade
/app/configuracoes        Configurações
/app/assinatura           Plano da barbearia
/admin                    Superadmin SaaS

/s/[slug]                 Página pública da barbearia
/s/[slug]/agendar         Fluxo de agendamento
/s/[slug]/confirmacao     Confirmação do agendamento
/s/[slug]/cancelar        Cancelamento pelo cliente
```

---

# 11. Banco de dados — visão consolidada

Abaixo está uma visão ampla das principais tabelas que a aplicação pode ter ao longo das fases.

```txt
users
barbershop_users
organizations
barbershops
theme_settings
professionals
services
service_categories
professional_services
working_hours
schedule_blocks
customers
appointments
orders
order_items
payments
commissions
products
stock_movements
cash_registers
financial_transactions
notification_templates
notification_logs
waiting_list
loyalty_programs
loyalty_transactions
packages
package_items
customer_packages
customer_package_usages
coupons
reviews
plans
subscriptions
audit_logs
```

## 11.1. Logs de auditoria

```txt
audit_logs
- id
- barbershop_id
- user_id
- action
- entity_type
- entity_id
- metadata
- ip_address
- user_agent
- created_at
```

---

# 12. Regras de negócio importantes

## 12.1. Disponibilidade de agenda

O sistema deve calcular horários disponíveis considerando:

- Jornada do profissional.
- Pausas.
- Bloqueios.
- Férias.
- Folgas.
- Agendamentos existentes.
- Duração do serviço.
- Intervalo mínimo entre atendimentos.
- Antecedência mínima para agendar.
- Antecedência mínima para cancelar.
- Fuso horário da barbearia.

## 12.2. Conflito de agenda

O sistema não deve permitir dois agendamentos no mesmo horário para o mesmo profissional, exceto se futuramente houver regra específica de encaixe.

## 12.3. Cancelamento

A barbearia deve poder definir:

- Se cliente pode cancelar.
- Prazo mínimo para cancelamento.
- Mensagem exibida ao cliente.
- Se cancelamento exige motivo.
- Se cancelamento gera notificação.

## 12.4. Reagendamento

A barbearia deve poder definir:

- Se cliente pode reagendar.
- Prazo mínimo para reagendamento.
- Quantidade máxima de reagendamentos, futuramente.

## 12.5. Comissão

No MVP:

- Comissão é calculada ao fechar a comanda.
- Comissão pode ser percentual.
- Comissão fica pendente até ser paga ou conferida.

Futuramente:

- Comissão pode variar por serviço.
- Comissão pode variar por produto.
- Comissão pode sofrer descontos.
- Comissão pode ser marcada como paga.

---

# 13. Telas principais do MVP

## 13.1. Painel inicial

Deve mostrar:

- Agendamentos de hoje.
- Próximos horários.
- Faturamento do dia.
- Atendimentos concluídos.
- Cancelamentos.
- Faltas.
- Produção por profissional.

## 13.2. Agenda

Deve mostrar:

- Calendário.
- Filtro por profissional.
- Status dos horários.
- Botão de novo agendamento.
- Ação de confirmar.
- Ação de cancelar.
- Ação de reagendar.
- Ação de concluir.
- Ação de abrir comanda.

## 13.3. Serviços

Deve permitir:

- Criar serviço.
- Editar serviço.
- Desativar serviço.
- Definir duração.
- Definir preço.
- Vincular profissionais.

## 13.4. Profissionais

Deve permitir:

- Criar profissional.
- Editar profissional.
- Desativar profissional.
- Configurar jornada.
- Configurar comissão.
- Vincular serviços.

## 13.5. Clientes

Deve permitir:

- Buscar cliente.
- Criar cliente.
- Editar cliente.
- Ver histórico.
- Ver observações.
- Ver total gasto.

## 13.6. Comandas

Deve permitir:

- Abrir comanda.
- Adicionar itens.
- Aplicar desconto.
- Selecionar pagamento.
- Fechar comanda.
- Gerar comissão.

## 13.7. Personalização

Deve permitir:

- Upload de logo.
- Upload de imagem de capa.
- Escolha de cores.
- Preview.
- Salvar tema.
- Restaurar padrão.
- Ver página pública.

## 13.8. Configurações

Deve permitir:

- Editar dados da barbearia.
- Configurar regras de agendamento.
- Configurar cancelamento.
- Configurar fuso horário.
- Configurar exibição pública.
- Gerenciar usuários.

---

# 14. Fluxos principais

## 14.1. Fluxo de agendamento público

```txt
Cliente acessa página pública
→ Escolhe serviço
→ Escolhe profissional ou qualquer profissional
→ Escolhe data
→ Escolhe horário
→ Informa nome e WhatsApp
→ Confirma
→ Sistema cria cliente, se não existir
→ Sistema cria agendamento
→ Sistema exibe confirmação
→ Sistema envia notificação, se configurado
```

## 14.2. Fluxo de atendimento

```txt
Profissional ou recepção visualiza agenda
→ Cliente chega
→ Atendimento é iniciado
→ Sistema abre ou vincula comanda
→ Serviço é realizado
→ Comanda é fechada
→ Pagamento é registrado
→ Agendamento vira concluído
→ Comissão é calculada
→ Relatório do dia é atualizado
```

## 14.3. Fluxo de cancelamento

```txt
Cliente ou admin solicita cancelamento
→ Sistema verifica regra de cancelamento
→ Sistema registra motivo
→ Agendamento muda para cancelado
→ Horário volta a ficar disponível
→ Lista de espera pode ser acionada futuramente
→ Notificação pode ser enviada
```

## 14.4. Fluxo de personalização visual

```txt
Admin acessa personalização
→ Envia logo
→ Escolhe paleta de cores
→ Visualiza preview
→ Salva alterações
→ Sistema atualiza tema da barbearia
→ Página pública passa a usar nova identidade
```

---

# 15. Roadmap sugerido por sprints

## Sprint 1 — Base SaaS

- Configurar projeto Next.js.
- Configurar banco PostgreSQL.
- Configurar ORM.
- Criar autenticação.
- Criar cadastro de barbearia.
- Criar estrutura multi-tenant.
- Criar slug público.
- Criar painel base.
- Criar tela de personalização.
- Permitir upload de logo.
- Permitir configuração de cores.

## Sprint 2 — Serviços e profissionais

- CRUD de serviços.
- CRUD de categorias de serviço.
- CRUD de profissionais.
- Vínculo profissional x serviço.
- Jornada de trabalho.
- Pausas.
- Bloqueios simples.

## Sprint 3 — Agenda

- Criar agenda interna.
- Criar cálculo de disponibilidade.
- Criar agendamento manual.
- Criar status de agendamento.
- Criar reagendamento.
- Criar cancelamento.
- Criar visualização por profissional.

## Sprint 4 — Página pública

- Criar rota pública por slug.
- Aplicar tema da barbearia.
- Criar fluxo de agendamento.
- Criar cadastro automático de cliente.
- Criar confirmação.
- Criar página de cancelamento por token.

## Sprint 5 — Comanda e atendimento

- Criar comanda.
- Abrir comanda a partir de agendamento.
- Adicionar serviço.
- Aplicar desconto.
- Registrar forma de pagamento.
- Fechar comanda.
- Marcar atendimento como concluído.

## Sprint 6 — Comissão e relatórios

- Criar regra de comissão.
- Calcular comissão ao fechar comanda.
- Criar relatório por profissional.
- Criar relatório diário.
- Criar dashboard inicial.

## Sprint 7 — Notificações básicas

- Criar templates.
- Enviar confirmação.
- Enviar lembrete.
- Registrar logs.
- Preparar integração com WhatsApp/e-mail.

## Sprint 8 — Módulos comerciais futuros

- Lista de espera.
- Fidelidade.
- Pacotes.
- Promoções.
- Aniversariantes.
- Pesquisa de satisfação.

---

# 16. Critérios de aceite do MVP

O MVP pode ser considerado funcional quando:

- Uma barbearia consegue se cadastrar.
- A barbearia consegue configurar logo e cores.
- A barbearia possui uma URL pública própria.
- A barbearia consegue cadastrar profissionais.
- A barbearia consegue cadastrar serviços.
- A barbearia consegue definir horários dos profissionais.
- Um cliente consegue agendar pela página pública.
- O sistema impede conflitos de agenda.
- O painel mostra os agendamentos.
- A barbearia consegue alterar status do agendamento.
- A barbearia consegue abrir e fechar uma comanda.
- A barbearia consegue registrar forma de pagamento.
- O sistema calcula comissão simples.
- O painel mostra relatório básico do dia.

---

# 17. O que não deve entrar no MVP

Para evitar escopo excessivo, os seguintes itens devem ser planejados, mas não implementados na primeira versão:

- App nativo iOS.
- App nativo Android.
- Multiunidades.
- Estoque completo.
- Financeiro completo.
- Pagamento online.
- Clube de assinatura.
- Programa de fidelidade avançado.
- BI avançado.
- Automação de marketing complexa.
- Integrações fiscais.
- Domínio próprio.
- Marketplace.
- Permissões muito granulares.
- Comissões muito complexas.
- Integração com vários gateways ao mesmo tempo.

---

# 18. Priorização final

## Essencial para lançar

```txt
1. Multi-tenant
2. Personalização visual
3. Autenticação
4. Cadastro da barbearia
5. Serviços
6. Profissionais
7. Jornada de trabalho
8. Agenda
9. Página pública de agendamento
10. Clientes
11. Comanda simples
12. Comissão simples
13. Relatório diário
```

## Importante logo depois

```txt
1. WhatsApp automático
2. Lista de espera
3. Estoque
4. Produtos
5. Fidelidade
6. Pacotes
7. Financeiro completo
8. Pesquisa de satisfação
9. Aniversariantes
10. Promoções
```

## Avançado

```txt
1. Clube de clientes
2. Pagamento online
3. App/PWA do profissional
4. App/PWA do cliente
5. Multiunidades
6. Domínio próprio
7. BI avançado
8. Automação de marketing
9. White-label completo
```

---

# 19. Observações técnicas importantes para Vercel

## 19.1. Cuidados

- Evitar lógica longa em Serverless Functions.
- Usar jobs externos para mensagens e tarefas agendadas.
- Não armazenar arquivos diretamente no filesystem da Vercel.
- Usar storage externo para logos e imagens.
- Usar banco PostgreSQL externo.
- Configurar variáveis de ambiente por ambiente.
- Usar preview deployments para validação.
- Monitorar performance das rotas públicas.
- Usar cache com cuidado para não vazar dados entre tenants.

## 19.2. Pontos de atenção no multi-tenant

Toda query sensível deve filtrar por `barbershop_id`.

Exemplo conceitual:

```txt
Buscar agendamentos:
WHERE barbershop_id = tenantAtual
```

Nunca confiar apenas no ID enviado pelo frontend.

## 19.3. Imagens e logo

- Armazenar em Vercel Blob, S3, Cloudflare R2 ou Supabase Storage.
- Validar tipo de arquivo.
- Limitar tamanho.
- Gerar versões otimizadas.
- Usar fallback quando não houver logo.

---

# 20. Resumo executivo

A aplicação deve começar como um SaaS para barbearias com foco em agenda, personalização visual e gestão básica.

O primeiro grande diferencial deve ser permitir que cada barbearia tenha uma experiência com a própria marca: logo, cores, página pública e identidade configurável.

A primeira versão deve resolver muito bem o essencial:

- Agendar.
- Gerenciar profissionais.
- Gerenciar serviços.
- Atender clientes.
- Fechar comandas.
- Calcular comissões.
- Mostrar relatórios simples.

Depois da validação, o produto deve evoluir para recursos mais completos, como notificações automáticas, fidelidade, pacotes, estoque, financeiro, pagamentos online, clube de clientes, apps/PWAs e multiunidades.

A arquitetura recomendada é Next.js na Vercel, PostgreSQL, storage externo para arquivos, autenticação segura e jobs externos para notificações e automações.

---

# 21. Checklist geral da aplicação

## MVP

- [ ] SaaS multiempresa.
- [ ] Cadastro da barbearia.
- [ ] Slug público.
- [ ] Logo.
- [ ] Paleta de cores.
- [ ] Preview de tema.
- [ ] Login.
- [ ] Usuários e perfis básicos.
- [ ] Cadastro de profissionais.
- [ ] Cadastro de serviços.
- [ ] Jornada de trabalho.
- [ ] Bloqueios de agenda.
- [ ] Página pública.
- [ ] Agendamento público.
- [ ] Agenda interna.
- [ ] Clientes.
- [ ] Status de agendamento.
- [ ] Comanda simples.
- [ ] Registro de pagamento.
- [ ] Comissão simples.
- [ ] Relatório diário.

## Fase 2

- [ ] WhatsApp automático.
- [ ] E-mail transacional.
- [ ] Lembretes.
- [ ] Lista de espera.
- [ ] Estoque.
- [ ] Produtos.
- [ ] Programa de fidelidade.
- [ ] Pacotes.
- [ ] Financeiro completo.
- [ ] Caixa.
- [ ] Vales e adiantamentos.
- [ ] Promoções.
- [ ] Cupons.
- [ ] Aniversariantes.
- [ ] Pesquisa de satisfação.
- [ ] Relatórios avançados.
- [ ] Domínio próprio.

## Fase 3

- [ ] Clube de clientes.
- [ ] Assinaturas.
- [ ] Pagamento online.
- [ ] PWA do profissional.
- [ ] PWA do cliente.
- [ ] Multiunidades.
- [ ] BI avançado.
- [ ] Automação de marketing.
- [ ] White-label completo.
- [ ] App nativo, se validado.

---

# 22. Referências usadas como inspiração

- AppBarber — página institucional e funcionalidades.
- Central de ajuda AppBarber/AppBeleza.
- Arquitetura moderna com Next.js, Vercel, PostgreSQL e serviços externos para storage, jobs, autenticação, pagamentos e mensageria.
