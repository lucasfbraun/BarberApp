# Portal do Profissional — Sistema de Gestão para Barbearias

> **Status: MVP implementado em 27/07/2026 (sprint 25).**
>
> Este é o documento de **escopo original**, preservado como foi escrito. O que
> foi construído, o que ficou de fora e as decisões tomadas estão em
> [`portal-do-profissional.md`](./portal-do-profissional.md).
>
> Resumo do recorte entregue — o MVP definido pela própria seção 24:
>
> | Seção | Status |
> |---|---|
> | 2 Perfil de acesso · 3 Página inicial · 4 Agenda | ✅ Entregue |
> | 6 Atendimento e comanda · 7 Cliente e histórico | ✅ Entregue |
> | 9 Comissões · 12 Perfil · 18 Permissões · 20 Auditoria | ✅ Entregue |
> | 5 Disponibilidade | 🔶 Bloqueio sim; folga/férias com aprovação não |
> | 10 Indicadores | 🔶 Os do dia, na home |
> | 11 Notificações | 🔶 No sistema, por consulta periódica; sem push |
> | 15 Avaliações | 🔶 Leitura sim; responder não |
> | 8 Fila · 13 Portfólio · 14 Jornada · 16 Metas · 17 Comunicação | ❌ Fase 2 |
>
> **Restrições assumidas:** stack limitada à que o projeto já usa (Next.js,
> Prisma, NextAuth, Tailwind) — sem biblioteca nova, sem serviço externo.
> Isso definiu três recortes: notificações por consulta em vez de push,
> portfólio adiado por falta de storage de arquivos, e acesso criado pelo
> gestor em vez de convite por e-mail.

## 1. Objetivo

O Portal do Profissional é a área utilizada pelos barbeiros para acompanhar a agenda, realizar atendimentos, consultar clientes, controlar sua disponibilidade, visualizar comissões e acompanhar seu desempenho.

O portal deve ser simples, responsivo e otimizado principalmente para dispositivos móveis, permitindo que o profissional execute as tarefas do dia a dia com poucos cliques.

O sistema deve ajudar o barbeiro a responder rapidamente:

- Quem é o próximo cliente?
- Quais atendimentos estão agendados para hoje?
- Existem clientes aguardando?
- Quanto foi produzido no dia?
- Qual é a comissão acumulada?
- Há algum cancelamento, reagendamento ou alteração na agenda?

---

## 2. Perfil de acesso

Cada profissional deverá possuir um usuário individual.

O acesso deverá ser controlado por permissões, permitindo que o administrador defina quais ações cada profissional poderá executar.

### Informações básicas do usuário

- Nome completo.
- Nome profissional.
- Foto de perfil.
- E-mail.
- Telefone.
- Senha.
- Unidade ou filial.
- Especialidades.
- Serviços habilitados.
- Dias e horários de trabalho.
- Status do usuário:
  - Ativo.
  - Inativo.
  - Suspenso.
  - Em férias.

### Regras de acesso

- O profissional deverá visualizar apenas as informações necessárias para executar seus atendimentos.
- Dados financeiros gerais da barbearia não deverão ser exibidos.
- O profissional deverá visualizar apenas suas próprias comissões.
- O administrador poderá suspender o acesso sem excluir o histórico do profissional.
- Todas as ações relevantes deverão ser registradas em auditoria.

---

## 3. Página inicial

A página inicial deverá apresentar um resumo operacional do dia.

### Informações exibidas

- Data atual.
- Horário atual.
- Status do profissional.
- Próximo cliente.
- Horário do próximo atendimento.
- Serviço agendado.
- Quantidade de atendimentos do dia.
- Quantidade de atendimentos concluídos.
- Quantidade de horários livres.
- Clientes aguardando.
- Produção total do dia.
- Comissão estimada do dia.
- Notificações recentes.
- Avisos administrativos.

### Ações rápidas

- Iniciar próximo atendimento.
- Abrir agenda.
- Adicionar agendamento.
- Bloquear horário.
- Chamar próximo cliente.
- Abrir nova comanda.
- Consultar comissão.

---

## 4. Agenda do profissional

A agenda será uma das principais funcionalidades do portal.

### Formas de visualização

- Agenda diária.
- Agenda semanal.
- Agenda mensal.
- Lista de próximos atendimentos.

### Informações do agendamento

- Nome do cliente.
- Foto do cliente, quando disponível.
- Telefone.
- Data.
- Horário inicial.
- Horário final.
- Duração prevista.
- Serviço ou serviços agendados.
- Valor previsto.
- Observações.
- Status do agendamento.
- Origem do agendamento:
  - Portal do cliente.
  - Aplicativo.
  - Recepção.
  - Profissional.
  - WhatsApp.
  - Integração externa.

### Ações disponíveis

- Criar agendamento.
- Confirmar agendamento.
- Reagendar.
- Cancelar.
- Informar motivo do cancelamento.
- Marcar cliente como presente.
- Marcar cliente como ausente.
- Iniciar atendimento.
- Finalizar atendimento.
- Consultar histórico do cliente.
- Enviar mensagem ao cliente.
- Criar encaixe.
- Transferir para outro profissional, quando permitido.

### Status recomendados

```text
Agendado
Confirmado
Cliente chegou
Em atendimento
Finalizado
Cancelado
Não compareceu
Reagendado
```

### Fluxo principal

```text
Agendado
   ↓
Confirmado
   ↓
Cliente chegou
   ↓
Em atendimento
   ↓
Finalizado
```

### Fluxos alternativos

```text
Agendado → Cancelado
Agendado → Reagendado
Agendado → Não compareceu
Confirmado → Cancelado
Confirmado → Não compareceu
```

### Regras de negócio da agenda

1. Um profissional não poderá possuir dois atendimentos simultâneos, salvo quando a barbearia permitir atendimentos paralelos.
2. O sistema deverá validar a duração total dos serviços.
3. Horários bloqueados não poderão receber agendamentos.
4. O sistema deverá considerar intervalos, folgas, férias e jornada de trabalho.
5. Reagendamentos deverão manter o histórico do horário anterior.
6. Cancelamentos deverão registrar data, horário, usuário e motivo.
7. Alterações realizadas pelo profissional deverão respeitar suas permissões.
8. Um atendimento finalizado não poderá ser alterado livremente.
9. Conflitos de agenda deverão ser informados antes da confirmação.
10. O profissional deverá receber uma notificação sempre que um agendamento for criado, alterado ou cancelado.

---

## 5. Disponibilidade e bloqueio de horários

O profissional deverá conseguir controlar sua disponibilidade conforme as permissões definidas pelo administrador.

### Funções

- Informar horário semanal de trabalho.
- Definir horários diferentes por dia da semana.
- Cadastrar intervalo de almoço.
- Bloquear horário específico.
- Bloquear período completo.
- Informar compromisso pessoal.
- Solicitar folga.
- Solicitar férias.
- Informar indisponibilidade temporária.
- Consultar solicitações pendentes.
- Consultar solicitações aprovadas ou recusadas.

### Exemplo de jornada

```text
Segunda-feira: 09:00 às 19:00
Terça-feira: folga
Quarta-feira: 10:00 às 20:00
Quinta-feira: 09:00 às 19:00
Sexta-feira: 09:00 às 20:00
Sábado: 08:00 às 18:00
Intervalo: 12:00 às 13:00
```

### Tipos de bloqueio

- Almoço.
- Compromisso pessoal.
- Reunião.
- Treinamento.
- Manutenção.
- Folga.
- Férias.
- Afastamento.
- Outro.

### Regras

- O administrador poderá definir se um bloqueio será aprovado automaticamente.
- Férias e folgas poderão depender de aprovação.
- O bloqueio deverá impedir novos agendamentos no período.
- Agendamentos existentes deverão ser tratados antes da aprovação de um bloqueio.
- Toda alteração deverá ser registrada.

---

## 6. Atendimento e comanda

O profissional deverá iniciar o atendimento diretamente pelo agendamento ou por uma nova comanda.

### Informações da comanda

- Cliente.
- Profissional responsável.
- Data e horário de abertura.
- Serviços adicionados.
- Produtos adicionados.
- Descontos.
- Acréscimos.
- Gorjeta.
- Observações.
- Valor total.
- Status do atendimento.
- Status do pagamento.

### Ações do profissional

- Iniciar atendimento.
- Pausar atendimento, quando aplicável.
- Adicionar serviço.
- Remover serviço, quando permitido.
- Adicionar produto.
- Alterar quantidade.
- Adicionar observações.
- Registrar preferências do cliente.
- Aplicar desconto dentro do limite permitido.
- Registrar gorjeta.
- Finalizar o serviço.
- Enviar comanda para o caixa.
- Registrar pagamento, quando autorizado.
- Agendar o próximo atendimento.
- Solicitar reabertura de comanda.

### Exemplo de comanda

```text
Corte masculino             R$ 50,00
Barba                       R$ 35,00
Pomada modeladora           R$ 40,00
Desconto autorizado         R$  5,00
Total                       R$ 120,00
```

### Status da comanda

```text
Aberta
Em atendimento
Aguardando pagamento
Paga
Cancelada
Estornada
```

### Separação entre atendimento e pagamento

O sistema deverá tratar separadamente:

- **Finalização do serviço:** o profissional concluiu o atendimento.
- **Finalização do pagamento:** o valor da comanda foi recebido.

Um atendimento concluído não deverá ser considerado automaticamente como pago.

### Regras de negócio

1. A comissão deverá ser calculada sobre serviços e produtos efetivamente pagos.
2. Descontos deverão respeitar o limite configurado para o profissional.
3. Alterações após o pagamento deverão depender de autorização.
4. Cancelamentos e estornos deverão recalcular a comissão.
5. A reabertura da comanda deverá ser registrada em auditoria.
6. O profissional não poderá alterar diretamente o percentual de comissão.
7. Produtos vendidos deverão movimentar o estoque.
8. Serviços adicionados deverão respeitar os serviços habilitados para o profissional.
9. A transferência de um serviço para outro profissional deverá recalcular a comissão.
10. O sistema deverá registrar o horário de início e de término do atendimento.

---

## 7. Cadastro e histórico do cliente

O barbeiro deverá visualizar as informações necessárias para prestar um atendimento personalizado.

### Informações do cliente

- Nome.
- Telefone.
- E-mail.
- Data de nascimento.
- Foto.
- Data do último atendimento.
- Próximo agendamento.
- Frequência média.
- Serviços mais realizados.
- Produtos comprados.
- Profissional de preferência.
- Observações.
- Alergias ou sensibilidades informadas.
- Histórico de cancelamentos.
- Histórico de ausências.
- Saldo de fidelidade, quando aplicável.
- Assinatura ou plano ativo.
- Autorizações de uso de imagem.

### Histórico de atendimentos

Cada atendimento deverá apresentar:

- Data.
- Profissional.
- Serviços realizados.
- Produtos vendidos.
- Valor pago.
- Desconto.
- Forma de pagamento, quando permitido.
- Observações.
- Fotos.
- Avaliação do cliente.

### Preferências do cliente

O profissional poderá registrar:

- Tipo de corte.
- Número da máquina.
- Altura do degradê.
- Preferência de acabamento.
- Modelo de barba.
- Produtos utilizados.
- Sensibilidade de pele.
- Restrições.
- Observações específicas.

### Exemplo de observação

```text
Corte degradê baixo, máquina 0,5 nas laterais, manter volume na
parte superior e não utilizar navalha no pescoço.
```

### Fotos de referência

O sistema poderá permitir:

- Foto antes do atendimento.
- Foto depois do atendimento.
- Foto de referência.
- Foto para portfólio.
- Marcação de autorização de uso.

### Regras de privacidade

- Fotos deverão ser armazenadas apenas com autorização.
- O profissional deverá visualizar somente os dados necessários.
- Dados pessoais não deverão ser exportados sem permissão.
- O sistema deverá registrar quem acessou ou alterou informações sensíveis.
- O uso de imagens para divulgação deverá possuir consentimento específico.

---

## 8. Fila de espera

A fila de espera será utilizada por barbearias que trabalham com atendimento por ordem de chegada ou encaixes.

### Funções

- Visualizar clientes aguardando.
- Adicionar cliente à fila.
- Informar horário de entrada.
- Informar preferência de profissional.
- Exibir tempo estimado de espera.
- Chamar próximo cliente.
- Pular temporariamente um cliente.
- Transferir para outro profissional.
- Informar desistência.
- Converter fila em atendimento.
- Consultar posição na fila.
- Notificar cliente quando estiver próximo.

### Exemplo

| Posição | Cliente | Preferência | Tempo de espera |
|---:|---|---|---:|
| 1 | Carlos | Lucas | 10 min |
| 2 | João | Qualquer profissional | 25 min |
| 3 | Marcos | Rafael | 40 min |

### Status da fila

```text
Aguardando
Chamado
Em atendimento
Desistiu
Ausente
Transferido
Finalizado
```

### Regras de negócio

1. O tempo estimado deverá considerar os atendimentos em andamento.
2. O sistema deverá respeitar a preferência do cliente.
3. O administrador poderá permitir ou não que o profissional altere a ordem da fila.
4. Todas as mudanças de posição deverão ser registradas.
5. Um cliente chamado e ausente poderá voltar para a fila conforme configuração.
6. A fila poderá ser desativada para barbearias que trabalham somente com horário marcado.

---

## 9. Comissões e ganhos

O profissional deverá acompanhar seus próprios ganhos com transparência.

### Informações exibidas

- Produção bruta.
- Comissão por serviço.
- Comissão por produto.
- Gorjetas.
- Bônus.
- Premiações.
- Adiantamentos.
- Descontos.
- Estornos.
- Valor pendente.
- Valor aprovado.
- Valor pago.
- Data prevista de pagamento.
- Período de apuração.

### Detalhamento

| Atendimento | Tipo | Base de cálculo | Percentual | Comissão |
|---|---|---:|---:|---:|
| Corte — Carlos | Serviço | R$ 50,00 | 40% | R$ 20,00 |
| Barba — Carlos | Serviço | R$ 35,00 | 40% | R$ 14,00 |
| Pomada | Produto | R$ 40,00 | 10% | R$ 4,00 |

### Filtros

- Hoje.
- Esta semana.
- Este mês.
- Mês anterior.
- Período personalizado.
- Pendente.
- Pago.
- Serviços.
- Produtos.
- Gorjetas.
- Ajustes.

### Status do fechamento

```text
Em apuração
Aguardando aprovação
Aprovado
Pago
Cancelado
Reaberto
```

### Regras de negócio

1. O profissional não poderá alterar percentuais de comissão.
2. A comissão deverá considerar apenas valores pagos.
3. Estornos deverão gerar ajuste negativo.
4. Descontos poderão reduzir a base de comissão conforme a regra da barbearia.
5. A comissão de produto poderá ser diferente da comissão de serviço.
6. Cada ajuste deverá apresentar motivo e responsável.
7. Fechamentos pagos não poderão ser alterados sem reabertura autorizada.
8. O histórico financeiro do profissional não deverá ser apagado.
9. O profissional não deverá visualizar comissões de outros profissionais.
10. O sistema deverá permitir exportar um demonstrativo individual, quando autorizado.

---

## 10. Indicadores de desempenho

O profissional deverá acompanhar indicadores relacionados ao próprio desempenho.

### Indicadores essenciais

- Atendimentos realizados.
- Atendimentos cancelados.
- Clientes que não compareceram.
- Produção total.
- Comissão acumulada.
- Ticket médio.
- Taxa de ocupação da agenda.
- Horários disponíveis.
- Clientes novos.
- Clientes recorrentes.
- Taxa de retorno.
- Taxa de reagendamento.
- Produtos vendidos.
- Serviços mais realizados.
- Avaliação média.
- Tempo médio de atendimento.
- Meta mensal.
- Progresso da meta.

### Exemplo

```text
Atendimentos no mês:       87
Produção total:       R$ 6.850,00
Comissão estimada:    R$ 2.740,00
Ticket médio:         R$ 78,74
Ocupação da agenda:        82%
Taxa de retorno:           68%
```

### Períodos de consulta

- Dia.
- Semana.
- Mês.
- Trimestre.
- Ano.
- Período personalizado.

### Regras

- O profissional deverá visualizar apenas seus próprios indicadores.
- Comparações com outros profissionais deverão ser configuráveis.
- Metas poderão ser individuais ou coletivas.
- Indicadores financeiros deverão respeitar as permissões.
- O painel deverá informar quando os dados ainda não estiverem fechados.

---

## 11. Notificações

O sistema deverá notificar o profissional sobre eventos importantes.

### Tipos de notificação

- Novo agendamento.
- Agendamento confirmado.
- Reagendamento.
- Cancelamento.
- Cliente presente.
- Próximo atendimento.
- Cliente adicionado à fila.
- Cliente chamado.
- Solicitação de folga aprovada.
- Solicitação de folga recusada.
- Alteração de jornada.
- Nova avaliação.
- Comissão fechada.
- Comissão paga.
- Meta atingida.
- Aviso administrativo.
- Alteração em serviço ou preço.
- Mudança de unidade.

### Canais

- Notificação dentro do sistema.
- Notificação web.
- Aplicativo.
- E-mail.
- WhatsApp, quando houver integração.

### Preferências

O profissional poderá escolher quais notificações deseja receber, desde que o administrador não tenha definido o aviso como obrigatório.

---

## 12. Perfil profissional

Cada barbeiro deverá possuir um perfil profissional.

### Informações do perfil

- Foto.
- Nome profissional.
- Biografia.
- Especialidades.
- Tempo de experiência.
- Serviços realizados.
- Avaliação média.
- Redes sociais.
- Unidade de atendimento.
- Dias disponíveis.
- Horários disponíveis.
- Idiomas.
- Certificações.
- Galeria de trabalhos.

### Permissões de edição

O profissional poderá editar:

- Foto.
- Nome profissional.
- Biografia.
- Especialidades, quando permitido.
- Redes sociais.
- Portfólio.

O administrador deverá controlar:

- Serviços habilitados.
- Preços.
- Percentuais de comissão.
- Unidades.
- Horários oficiais.
- Status do profissional.
- Exibição pública do perfil.

---

## 13. Portfólio

O profissional poderá manter uma galeria de trabalhos.

### Funções

- Adicionar foto.
- Adicionar descrição.
- Informar tipo de serviço.
- Marcar cliente relacionado.
- Definir imagem como destaque.
- Solicitar aprovação para publicação.
- Remover publicação.
- Compartilhar trabalho.
- Definir visibilidade.

### Visibilidade

```text
Privado
Visível para a equipe
Visível no portal do cliente
Visível nas redes sociais
```

### Regras

- Toda imagem de cliente deverá possuir autorização.
- O administrador poderá exigir aprovação antes da publicação.
- A remoção da autorização do cliente deverá ocultar a imagem.
- O sistema deverá manter registro da autorização.

---

## 14. Controle de jornada

O controle de jornada poderá ser habilitado conforme o tipo de vínculo do profissional.

### Funções

- Registrar entrada.
- Registrar saída.
- Iniciar intervalo.
- Finalizar intervalo.
- Consultar horas trabalhadas.
- Consultar atrasos.
- Consultar faltas.
- Visualizar banco de horas.
- Solicitar ajuste.
- Informar justificativa.
- Consultar espelho de ponto.

### Tipos de vínculo

- Funcionário contratado.
- Profissional autônomo.
- Comissionado.
- Aluguel de cadeira.
- Sócio.
- Prestador de serviço.

### Regras

- O controle de ponto poderá ser obrigatório apenas para determinados vínculos.
- Ajustes deverão depender de aprovação.
- O profissional não poderá alterar registros aprovados.
- Cada registro deverá armazenar data, horário, usuário e dispositivo.
- O administrador poderá habilitar geolocalização conforme necessidade e legislação aplicável.

---

## 15. Avaliações dos clientes

O profissional poderá visualizar as avaliações recebidas.

### Informações

- Nota.
- Comentário.
- Data.
- Atendimento relacionado.
- Serviço realizado.
- Resposta do profissional.
- Status da avaliação.

### Funções

- Visualizar avaliação.
- Responder avaliação.
- Denunciar conteúdo inadequado.
- Consultar média.
- Consultar evolução da média.

### Regras

- O profissional não poderá apagar avaliações.
- O administrador poderá moderar conteúdos ofensivos.
- A avaliação deverá estar vinculada a um atendimento real.
- O cliente poderá avaliar somente atendimentos finalizados.

---

## 16. Metas e incentivos

O sistema poderá permitir metas individuais.

### Tipos de meta

- Quantidade de atendimentos.
- Produção financeira.
- Venda de produtos.
- Taxa de retorno.
- Reagendamentos.
- Avaliação média.
- Ocupação da agenda.
- Venda de determinado serviço.

### Informações exibidas

- Meta.
- Resultado atual.
- Percentual atingido.
- Prazo.
- Recompensa.
- Histórico.

### Exemplo

```text
Meta de produção: R$ 8.000,00
Produção atual:   R$ 6.850,00
Progresso:        85,63%
Prazo:            31/07/2026
```

---

## 17. Comunicação interna

O portal poderá possuir uma área de comunicação entre profissionais e gestores.

### Funções

- Avisos administrativos.
- Comunicados.
- Confirmação de leitura.
- Mensagens individuais.
- Mensagens para equipe.
- Envio de arquivos.
- Publicação de treinamentos.
- Informações sobre campanhas.

### Regras

- Avisos obrigatórios deverão solicitar confirmação de leitura.
- O administrador poderá definir data de expiração.
- Mensagens deverão respeitar as permissões do usuário.
- Arquivos deverão possuir controle de acesso.

---

## 18. Permissões recomendadas

| Permissão | Configuração recomendada |
|---|---|
| Visualizar a própria agenda | Sempre permitido |
| Visualizar agenda de outros profissionais | Configurável |
| Criar agendamento | Configurável |
| Reagendar atendimento | Configurável |
| Cancelar atendimento | Configurável |
| Criar encaixe | Configurável |
| Bloquear horário | Configurável |
| Solicitar folga | Permitido |
| Aprovar folga | Não permitido |
| Visualizar telefone do cliente | Configurável |
| Editar cadastro do cliente | Limitado |
| Consultar histórico do cliente | Permitido |
| Adicionar serviço à comanda | Permitido |
| Adicionar produto à comanda | Permitido |
| Aplicar desconto | Limitado |
| Alterar preço | Não permitido |
| Receber pagamento | Configurável |
| Reabrir comanda | Somente gestor |
| Cancelar comanda paga | Somente gestor |
| Visualizar comissão própria | Sempre permitido |
| Visualizar comissão de colegas | Não permitido |
| Alterar comissão | Não permitido |
| Consultar caixa geral | Não permitido |
| Ajustar estoque | Não permitido |
| Editar perfil profissional | Permitido |
| Publicar portfólio | Configurável |
| Visualizar indicadores próprios | Permitido |
| Visualizar ranking da equipe | Configurável |

---

## 19. Regras de negócio gerais

1. Cada profissional deverá possuir acesso individual.
2. As permissões deverão ser configuradas por função ou usuário.
3. Um profissional não poderá acessar dados financeiros gerais da empresa.
4. Um profissional não poderá visualizar a comissão de outro profissional.
5. Horários bloqueados não poderão receber agendamentos.
6. Um profissional não poderá possuir agendamentos conflitantes.
7. O sistema deverá validar a duração dos serviços.
8. Atendimentos finalizados não poderão ser alterados livremente.
9. Comandas pagas somente poderão ser reabertas por usuários autorizados.
10. A comissão deverá ser calculada automaticamente.
11. Cancelamentos e estornos deverão recalcular as comissões.
12. Descontos deverão respeitar limites.
13. Alterações financeiras deverão ser auditadas.
14. Fotos deverão possuir autorização de uso.
15. O profissional deverá visualizar apenas os dados necessários dos clientes.
16. Mudanças na agenda deverão ser atualizadas em tempo real.
17. A exclusão de um profissional não deverá apagar seu histórico.
18. Um profissional inativo não deverá receber novos agendamentos.
19. A troca do profissional responsável deverá atualizar a agenda e a comissão.
20. O sistema deverá considerar o fuso horário da unidade.
21. Todas as datas e horários deverão ser armazenados de maneira consistente.
22. O histórico de alterações não deverá ser editável.
23. As informações deverão respeitar a Lei Geral de Proteção de Dados.
24. O sistema deverá funcionar adequadamente em celular, tablet e computador.
25. Ações críticas deverão solicitar confirmação.

---

## 20. Auditoria

O sistema deverá registrar ações importantes.

### Informações da auditoria

- Usuário.
- Data.
- Horário.
- Ação executada.
- Registro afetado.
- Valor anterior.
- Valor posterior.
- Dispositivo.
- Endereço IP, quando aplicável.
- Motivo da alteração.

### Ações auditadas

- Criação de agendamento.
- Reagendamento.
- Cancelamento.
- Alteração de horário.
- Bloqueio de agenda.
- Abertura de comanda.
- Inclusão ou remoção de itens.
- Aplicação de desconto.
- Finalização.
- Estorno.
- Reabertura.
- Ajuste de comissão.
- Alteração de perfil.
- Alteração de permissões.
- Consulta ou exportação de dados sensíveis.

---

## 21. Fluxo ideal de atendimento

```text
Cliente realiza o agendamento
        ↓
Profissional recebe a notificação
        ↓
Cliente chega à barbearia
        ↓
Profissional marca “Cliente chegou”
        ↓
Profissional inicia o atendimento
        ↓
Serviços e produtos são adicionados
        ↓
Profissional finaliza o serviço
        ↓
Comanda é enviada para o caixa
        ↓
Pagamento é confirmado
        ↓
Comissão é calculada
        ↓
Cliente recebe solicitação de avaliação
        ↓
Cliente recebe convite para novo agendamento
```

---

## 22. Menu recomendado

### Navegação principal no celular

```text
Início | Agenda | Fila | Clientes | Mais
```

### Menu “Mais”

- Comissões.
- Desempenho.
- Portfólio.
- Avaliações.
- Metas.
- Jornada.
- Notificações.
- Comunicados.
- Perfil.
- Configurações.
- Ajuda.
- Sair.

### Botões contextuais

Durante o atendimento, o sistema poderá exibir um botão fixo:

```text
Iniciar atendimento
```

Depois de iniciado:

```text
Finalizar atendimento
```

---

## 23. Funcionalidades que não devem aparecer para o barbeiro

A menos que o usuário também possua perfil de gerente ou administrador, não deverão ser exibidos:

- Fluxo de caixa geral.
- Contas a pagar.
- Contas a receber.
- Resultado financeiro da empresa.
- Comissão de outros profissionais.
- Cadastro de fornecedores.
- Compras.
- Ajustes manuais de estoque.
- Configuração de preços.
- Configuração de comissões.
- Cadastro de usuários.
- Configuração da barbearia.
- Assinatura do sistema.
- Plano contratado.
- Relatórios financeiros completos.
- Configuração de integrações.
- Dados bancários da empresa.
- Campanhas gerais de marketing.
- Informações confidenciais de outros profissionais.

---

## 24. Escopo recomendado para o MVP

A primeira versão do Portal do Profissional deverá priorizar:

1. Login individual.
2. Controle de permissões.
3. Página inicial com resumo do dia.
4. Agenda diária e semanal.
5. Consulta de agendamentos.
6. Confirmação de agendamento.
7. Reagendamento.
8. Cancelamento.
9. Marcação de chegada.
10. Início e finalização de atendimento.
11. Bloqueio de horários.
12. Visualização do cliente.
13. Histórico básico do cliente.
14. Comanda com serviços.
15. Inclusão de produtos.
16. Envio da comanda para o caixa.
17. Visualização de comissão própria.
18. Notificações de agendamento.
19. Perfil básico do profissional.
20. Auditoria de ações críticas.

### MVP opcional conforme o modelo da barbearia

- Fila de espera.
- Registro de pagamento.
- Controle de jornada.
- Portfólio.
- Avaliações.

---

## 25. Funcionalidades para uma segunda fase

- Metas avançadas.
- Gamificação.
- Ranking da equipe.
- Chat interno.
- Portfólio público.
- Integração com WhatsApp.
- Ponto eletrônico.
- Assinatura eletrônica.
- Relatórios avançados.
- Recomendação automática de horários.
- Sugestão de reagendamento.
- Previsão de ausência do cliente.
- Campanhas individuais.
- Integração com redes sociais.
- Venda de produtos pelo perfil do profissional.
- Controle de aluguel de cadeira.
- Controle de repasses.
- Integração com calendário externo.
- Aplicativo móvel nativo.
- Modo offline.
- Biometria.
- Geolocalização.
- Inteligência artificial para sugestões de atendimento.

---

## 26. Critérios de aceite do MVP

### Login e segurança

- O profissional deverá conseguir entrar com seu usuário e senha.
- O sistema deverá impedir acesso a telas não autorizadas.
- O acesso deverá ser encerrado após período de inatividade configurável.

### Agenda

- O profissional deverá visualizar seus horários do dia.
- O sistema deverá impedir conflito de horário.
- O profissional deverá conseguir confirmar, reagendar e cancelar conforme permissão.
- Mudanças deverão aparecer imediatamente na agenda.

### Atendimento

- O profissional deverá iniciar um atendimento.
- O profissional deverá adicionar serviços e produtos.
- O profissional deverá finalizar o serviço.
- O sistema deverá registrar horários de início e fim.

### Cliente

- O profissional deverá visualizar informações básicas.
- O profissional deverá consultar o histórico.
- O profissional deverá registrar observações.

### Comissão

- O profissional deverá visualizar sua comissão.
- A comissão deverá ser recalculada em caso de estorno.
- O profissional não deverá conseguir alterar percentuais.

### Auditoria

- Cancelamentos, descontos, estornos e reaberturas deverão ser registrados.
- O registro deverá informar usuário, data, horário e alteração.

### Responsividade

- Todas as funções essenciais deverão funcionar em celular.
- Os botões principais deverão ser acessíveis com poucos toques.
- O layout deverá funcionar em diferentes tamanhos de tela.

---

## 27. Diretriz de experiência do usuário

O Portal do Profissional deverá ser projetado com foco em velocidade e simplicidade.

### Princípios

- Poucos cliques para iniciar um atendimento.
- Informações principais visíveis na tela inicial.
- Botões grandes para uso em celular.
- Textos objetivos.
- Confirmação para ações críticas.
- Atualização em tempo real.
- Funcionamento com conexão móvel.
- Navegação consistente.
- Avisos claros de erro.
- Destaque para o próximo atendimento.

### Prioridade de informação

1. Próximo cliente.
2. Agenda do dia.
3. Cliente aguardando.
4. Atendimento em andamento.
5. Horários disponíveis.
6. Produção e comissão.
7. Notificações.

---

## 28. Resumo da proposta

O Portal do Profissional deverá oferecer autonomia para o barbeiro organizar e executar seus atendimentos, sem fornecer acesso indevido às informações administrativas da empresa.

Os pilares do portal são:

- **Agenda organizada.**
- **Atendimento rápido.**
- **Histórico do cliente.**
- **Controle de disponibilidade.**
- **Transparência de comissões.**
- **Indicadores de desempenho.**
- **Segurança e permissões.**
- **Boa experiência no celular.**

A solução deverá manter o equilíbrio entre autonomia operacional, privacidade dos dados, controle administrativo e simplicidade de uso.
