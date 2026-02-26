

## Plano: Status dinâmico do cliente baseado em `conversation_events`

### Viabilidade

Totalmente viavel. Os dados necessarios ja existem nas duas tabelas do banco externo:

- **`clientes_atendimento`**: tem o `telefone` do cliente
- **`conversation_events`**: tem `conversation_id`, `event_type` e `created_at`

O vinculo entre as tabelas e feito pelo `conversation_id` -- nos dados atuais, o telefone `18633314570` (Guilherme) corresponde a conversa `b7f7700a` que tem eventos `ai_started` e `ai_finished` registrados.

Porem, ha um ponto: a tabela `clientes_atendimento` nao tem o campo `conversation_id` diretamente. Olhando os dados, o `created_at` do cliente (00:24:24) e quase identico ao `conversation_started` da conversa `b7f7700a` (00:24:23). Precisamos de uma forma de vincular. As opcoes sao:

1. A tabela `clientes_atendimento` ja tem ou pode ter o campo `conversation_id`
2. Fazemos o match pelo telefone via a tabela `conversation_events` que tem campo `phone` (presente na tabela `ai_events` que tem estrutura similar)

Vou verificar se `conversation_events` tem o campo `phone`.

### Logica de status

Para cada cliente, buscar o ultimo evento da conversa associada:
- Ultimo evento = `ai_started` → **Atendimento IA** (badge azul)
- Ultimo evento = `ai_finished` → **Aguardando Humano** (badge amarelo)
- Ultimo evento = `human_started` → **Finalizado** (badge verde)
- Sem eventos → **--** (sem status)

### Implementacao

**Arquivo: `src/components/climo/ClientesView.tsx`**

1. Apos buscar os clientes da tabela `clientes_atendimento`, fazer uma segunda query na tabela `conversation_events` buscando todos os eventos ordenados por `created_at desc`
2. Para cada cliente, localizar a conversa correspondente (via `conversation_id` se disponivel no registro do cliente, ou via match de telefone/timestamp)
3. Determinar o ultimo `event_type` relevante (`ai_started`, `ai_finished`, `human_started`) dessa conversa
4. Mapear para o label e cor do badge de status
5. Substituir o campo `status` estatico pelo status calculado dinamicamente

### Ponto de atencao

Preciso confirmar como vincular `clientes_atendimento` a `conversation_events`. Se a tabela `clientes_atendimento` tiver um campo `conversation_id`, o vinculo e direto. Caso contrario, podemos usar o `phone` presente em `conversation_events` para fazer o match pelo telefone do cliente. Se nenhum dos dois existir, podemos fazer match por proximidade de timestamp (menos confiavel).

### Detalhes tecnicos

```text
Query 1: clientes_atendimento
  SELECT id, telefone, nome, status, created_at, conversation_id (se existir)

Query 2: conversation_events
  SELECT conversation_id, event_type, created_at
  WHERE event_type IN ('ai_started', 'ai_finished', 'human_started')
  ORDER BY created_at DESC

Mapeamento de status:
  ai_started     → "Atendimento IA"      (bg-blue-500/10, text-blue-500)
  ai_finished    → "Aguardando Humano"    (bg-yellow-500/10, text-yellow-600)
  human_started  → "Finalizado"           (bg-green-500/10, text-green-600)

Vinculo: por conversation_id ou phone no conversation_events
```

### Proxima etapa

Antes de implementar, preciso confirmar: a tabela `clientes_atendimento` possui o campo `conversation_id`? Ou o `conversation_events` tem o campo `phone`? Isso define a estrategia de vinculacao.

