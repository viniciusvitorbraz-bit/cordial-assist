
# Plano: Nova Logica de Dados do Dashboard

## Situacao Atual

O dashboard atual tenta buscar dados de 4 views no Supabase externo:
- `v_total_atendimentos` 
- `v_tempos_operacionais`
- `v_volume_por_hora`
- `v_atendimentos_semana`

O problema principal e que o sistema pre-preenche com as credenciais do Lovable Cloud (onde nao existem essas views). Quando o usuario configura manualmente as credenciais do Supabase externo, os dados carregam corretamente (confirmado pelos requests com status 200 para `kolfmrmwekxtibwhlbaz.supabase.co`).

## Analise do Workflow n8n "Climo - Sara"

O workflow do n8n e bastante completo e faz o seguinte:

1. **Recebe mensagens via Webhook** (WhatsApp via UazAPI)
2. **Processa diferentes tipos**: texto, audio (transcreve via OpenAI), imagem (analisa via GPT-4o-mini), mensagens efemeras
3. **Gerencia clientes**: busca/cria na tabela `clientes_atendimento`
4. **IA Recepcionista**: AI Agent com OpenAI + Redis Chat Memory + tools (Climo FAQ, Admissional, Periodico, RM, Demissional)
5. **Registra metricas**:
   - **NODE 1 -- INSERT Inicio**: insere registro de inicio de atendimento no Supabase
   - **NODE 3 -- UPDATE human_joined_at**: atualiza quando um humano entra na conversa
   - **Create a row2**: grava dados adicionais (provavelmente classificacao/resumo)

O workflow parece funcional -- os nodes de Supabase estao conectados e o workflow esta ativo.

## O Que Precisa Ser Feito

### 1. Corrigir o pre-preenchimento das credenciais
Atualmente o `SettingsView` preenche com valores do Lovable Cloud. Deve-se inverter a logica: se o usuario ja salvou credenciais do Supabase externo, usar essas. Caso contrario, **nao pre-preencher** com Lovable Cloud (pois confunde o usuario).

### 2. Refatorar o DashboardView para ser mais robusto
- Tratar o caso onde `maybeSingle()` retorna `null` mas nao erro
- Melhorar tratamento dos dados retornados pelas views (arrays vs objetos)
- Garantir que `v_total_atendimentos` retorna um unico objeto e `v_volume_por_hora` / `v_atendimentos_semana` retornam arrays

### 3. Melhorar feedback de estado
- Se nenhuma credencial esta configurada, mostrar instrucoes claras pedindo URL e Anon Key do Supabase externo
- Remover referencia a "Lovable Cloud" no pre-preenchimento

## Detalhes Tecnicos

### Arquivo: `src/components/climo/SettingsView.tsx`
- Remover o pre-preenchimento automatico com `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- Manter os campos vazios se nao houver config salva, para o usuario preencher com as credenciais do Supabase externo
- Adicionar um texto explicativo: "Insira a URL e Anon Key do seu projeto Supabase onde as metricas estao armazenadas"

### Arquivo: `src/components/climo/DashboardView.tsx`
- Corrigir o `fetchData` para tratar corretamente os tipos de retorno:
  - `v_total_atendimentos` e `v_tempos_operacionais`: `.maybeSingle()` retorna um objeto ou null
  - `v_volume_por_hora` e `v_atendimentos_semana`: `.select('*')` retorna array
- Adicionar fallback para valores null nos tempos operacionais (como ja ocorre com dados reais: `tempo_conversa_ia_seg: null`)
- Manter o auto-refresh de 60 segundos

### Arquivo: `src/lib/supabase-config.ts`
- Sem alteracoes necessarias -- a logica de cache do client ja esta correta

## Sobre os Workflows n8n

O workflow "Climo - Sara" esta **ativo e funcional**. Ele:
- Recebe webhooks do WhatsApp
- Processa mensagens com IA
- Grava dados nas tabelas do Supabase externo (clientes_atendimento + tabela de atendimentos)
- As views que o dashboard consulta sao construidas em cima dessas tabelas

O workflow "Dashboard - Climo" e apenas o toggle de IA (parar/retomar) via Chatwoot, nao esta relacionado ao carregamento de dados.

**Nao e necessario alterar nada nos workflows do n8n** -- o pipeline de dados esta funcionando (confirmado pelos dados retornados nas requests 200).

## Resumo das Alteracoes

1. Remover pre-preenchimento com credenciais do Lovable Cloud no `SettingsView`
2. Melhorar texto de orientacao nos campos de configuracao
3. Ajustar tratamento de dados nulos no `DashboardView`
4. Testar o fluxo completo: configurar credenciais externas e verificar dashboard
