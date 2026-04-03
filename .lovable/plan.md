

## Problema diagnosticado

A metrica "Tempo ate Intervencao Humana" retorna nulo porque a logica atual exige que exista um `ai_finished` **na mesma conversa** antes do `human_started`. Analisando os screenshots:

- A grande maioria dos `human_started` pertence a conversa `bfd0f107...` que **nunca** teve `ai_finished` nem `conversation_started` — e uma conversa puramente humana
- As conversas com `ai_finished` (ex: `7d9aadd8...`) sao conversas diferentes que nao tem `human_started`
- Resultado: zero pares validos `ai_finished → human_started` na mesma conversa = metrica nula

## Solucao proposta

Mudar a logica de fallback: quando nao existe `ai_finished` antes do `human_started` na mesma conversa, usar `conversation_started` como ponto de referencia. Se tambem nao existir `conversation_started`, ignorar.

Isso mede "tempo desde o inicio da conversa ate a intervencao humana" — que e uma metrica util mesmo quando a IA nao participa.

Alem disso, renomear o card para refletir melhor o significado: **"Tempo ate Atendimento Humano"** (em vez de "Intervencao Humana"), ja que inclui casos onde o humano atende diretamente.

## Alteracoes

**Arquivo: `src/lib/dashboard-queries.ts`** (linhas 185-201)

Na secao que calcula `temposEspera`, adicionar fallback:

```text
Para cada conversa com human_started no periodo:
  1. Buscar ai_finished anterior → calcular diff (como ja faz)
  2. Se nao encontrar ai_finished, buscar conversation_started anterior → calcular diff
  3. Se nenhum dos dois existir, pular
```

**Arquivo: `src/components/climo/DashboardView.tsx`**

Renomear o label do card de "Tempo até Intervenção Humana" para "Tempo até Atendimento Humano" e a descricao para "Do início da conversa até atendimento humano".

## Detalhes tecnicos

```text
// dashboard-queries.ts, dentro do loop por conversa (~linha 185)

if (firstHumanStartedInRange) {
  const humanTime = new Date(firstHumanStartedInRange.created_at).getTime();

  // Tenta ai_finished primeiro
  const lastAiFinish = findLatestBefore(sorted, 'ai_finished', humanTime);
  
  if (lastAiFinish) {
    const diff = (humanTime - new Date(lastAiFinish.created_at).getTime()) / 1000;
    if (diff > 0) temposEspera.push(diff);
  } else {
    // Fallback: usa conversation_started
    const lastStart = findLatestBefore(sorted, 'conversation_started', humanTime);
    if (lastStart) {
      const diff = (humanTime - new Date(lastStart.created_at).getTime()) / 1000;
      if (diff > 0) temposEspera.push(diff);
    }
  }
  
  // temposTotal continua igual
}
```

Tambem precisa garantir que o backfill historico (linha 102) inclua `human_started` conversations que so tem `conversation_started` fora do range — ja esta coberto pois o backfill busca `conversation_started` para todas as conversations com eventos no periodo.

