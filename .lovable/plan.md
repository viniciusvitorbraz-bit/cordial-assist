

## Plano: Tela "Clientes"

### Dados disponíveis

A tabela `clientes_atendimento` no banco externo já contém:
- **telefone** (text) — número do contato
- **nome** (text) — nome do cliente
- **status** (text) — status do cliente (pode ser NULL)
- **created_at** (timestamptz) — data/hora do registro

Esses campos cobrem todos os requisitos: nome, telefone e dia do contato.

### Arquivos a criar/editar

1. **`src/components/climo/ClientesView.tsx`** (novo)
   - Componente que busca dados da tabela `clientes_atendimento` usando o client dinâmico externo (`createDynamicSupabaseClient`)
   - Tabela com colunas: Nome, Telefone, Status, Data do Contato
   - Campo de busca para filtrar por nome ou telefone
   - Ordenação por data (mais recente primeiro)
   - Formatação do telefone e data em horário de Brasília

2. **`src/components/climo/ClimoSidebar.tsx`** (editar)
   - Adicionar item "Clientes" com ícone `Users` no menu lateral

3. **`src/pages/Index.tsx`** (editar)
   - Adicionar case `'clientes'` para renderizar `<ClientesView />`

### Detalhes técnicos

```text
Query:
  SELECT id, telefone, nome, status, created_at
  FROM clientes_atendimento
  ORDER BY created_at DESC

Componente ClientesView:
  - Usa createDynamicSupabaseClient() (mesmo padrão do Dashboard)
  - Input de busca filtra client-side por nome/telefone
  - Exibe data formatada em pt-BR
  - Estado de loading e erro consistente com DashboardView
```

