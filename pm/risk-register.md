# Risk Register

| ID | Risco | Probabilidade | Impacto | Resposta | Status |
|---|---|---:|---:|---|---|
| R1 | Escopo crescer acima do MVP | Alta | Alta | Congelar escopo do MVP e criar fases | Aberto |
| R2 | Regra de agenda ficar inconsistente | Media | Alta | Definir motor unico de disponibilidade | Aberto |
| R3 | Vazamento de dados entre barbearias | Baixa | Alta | Filtrar barbershop_id em toda query | Aberto |
| R4 | Integracoes externas atrasarem | Media | Media | Tirar integracoes do caminho critico | Aberto |
| R5 | Interface ficar generica demais | Media | Media | Aplicar personalizacao visual desde cedo | Aberto |
| R6 | Dependencias de mensageria aumentarem custo | Media | Media | Postergar WhatsApp automatizado para fase 2 | Aberto |
| R7 | Barbeiro sem como trocar a senha inicial definida pelo gestor | Alta | Media | Priorizar o E1 (recuperacao de senha); ate la, orientar o gestor a trocar a senha quando pedido | Aberto (sprint 25) |
| R8 | Comanda enviada ao caixa e esquecida sem receber, inflando a producao aparente do barbeiro | Media | Media | Tela /caixa destaca AWAITING_PAYMENT; a tela de comissoes separa o que ainda nao foi pago | Mitigado (sprint 25) |
| R9 | Gestor configurar permissoes amplas demais e expor dado que a secao 23 proibe | Baixa | Alta | So os itens "Configuravel" viraram tabela; o restante e regra fixa de codigo e aparece como "nao configuravel" na tela | Mitigado (sprint 25) |
| R10 | Regras novas sem teste (maquina de estados, teto de desconto, geracao de comissao) | Alta | Alta | Priorizar testes das funcoes puras e um CI com lint + tsc | Aberto (sprint 25) |

## Mitigacoes principais
- Controlar escopo com WBS e backlog priorizado.
- Registrar toda decisao de mudança.
- Entregar sempre um incremento funcional por sprint.
- Validar cada modulo com criterio de aceite objetivo.
