

# Melhorar o fluxo de eventos e métricas do Dashboard

## Situação atual

O dashboard consulta a tabela `conversation_events` no Supabase externo (`kolfmrmwekxtibwhlbaz`). Os event types usados são: `conversation_started`, `ai_finished`, `human_started`. O código **não usa `ai_started`** — ele calcula o tempo da IA como `ai_finished - conversation_started`.

O problema principal: muitas conversas não seguem o fluxo completo, resultando em métricas nulas ou distorcidas.

## Fluxo ideal proposto

```text
conversation_started → ai_started → ai_finished → human_started
       │                    │             │              │
       │                    │             │              └─ Agente humano assume
       │                    │             └─ IA terminou de responder
       │                    └─ IA começou a processar
       └─ Cliente iniciou conversa
```

## O que precisa mudar

### 1. No n8n: adicionar o evento `ai_started`

Você precisa criar um node no n8n que dispare um INSERT na `conversation_events` com `event_type = 'ai_started'` no momento em que a IA começa a processar a mensagem. Isso permite calcular:

- **Tempo de resposta da IA** = `ai_finished - ai_started` (tempo real de processamento)
- **Tempo até a IA começar** = `ai_started - conversation_started` (latência inicial)

### 2. No código: usar `ai_started` nas métricas

**Arquivo: `src/lib/dashboard-queries.ts`**

- Incluir `ai_started` na lista de event types das queries (linhas 84 e 102)
- Calcular `temposIA` como `ai_finished - ai_started` em vez de `ai_finished - conversation_started`
- Manter o fallback: se não existir `ai_started`, usar `conversation_started` como baseline (compatibilidade com dados antigos)

### 3. Adicionar validação de sequência

Para evitar dados inconsistentes (ex: `human_started` antes de `conversation_started`), adicionar checagem de que os timestamps seguem a ordem esperada. Se um evento estiver fora de ordem, ignorar esse par no cálculo.

### 4. Filtro de ruído de webhook

Adicionar threshold mínimo de 5 segundos para a métrica "Tempo até Atendimento Humano". Diffs menores que isso são artefatos de webhook (disparo simultâneo) e não representam espera real.

## Resumo das alterações no código

**`src/lib/dashboard-queries.ts`:**
- Adicionar `ai_started` às queries de eventos
- Mudar cálculo de tempo da IA: `ai_finished - ai_started` (com fallback para `conversation_started`)
- Adicionar filtro mínimo de 5s para `temposEspera`
- Retornar `NaN` quando não há dados (em vez de 0)

**`src/components/climo/DashboardView.tsx`:**
- Tratar `NaN` mostrando "Sem dados" no card

## O que você precisa fazer no n8n

1. Adicionar um node que insere `ai_started` na `conversation_events` quando a IA começa a processar
2. Garantir que a ordem de disparo dos nodes seja: `conversation_started` → `ai_started` → `ai_finished` → `human_started`
3. O `human_started` só deve ser disparado quando um agente humano de fato assume a conversa (não quando o webhook do Chatwoot simplesmente cria a conversa)

