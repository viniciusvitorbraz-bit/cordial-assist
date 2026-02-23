
## Transformar Volume por Hora em Grafico Dedicado

### O que muda

O card pequeno "Volume / Hora" na segunda fileira sera substituido por um grafico de barras dedicado, ocupando toda a largura, posicionado como uma terceira fileira no dashboard. Os 3 cards restantes (Espera Humano, Horario de Pico, Variacao Periodo) continuam na segunda fileira, agora em 3 colunas.

### Layout final

```text
+---------------------------------------------+
| Fileira 1 (existente - sem alteracao)        |
| [Grafico 7 dias (2/3)]  [Cards direita(1/3)]|
+---------------------------------------------+
| Fileira 2 (3 cards)                          |
| [Espera Humano] [Horario Pico] [Variacao %]  |
+---------------------------------------------+
| Fileira 3 (novo - largura total)             |
| [Grafico Volume por Hora - 08h ate 18h]      |
+---------------------------------------------+
```

### Detalhes tecnicos

**Arquivo: `src/lib/dashboard-queries.ts`**
- Alterar a geracao de `volumePorHora` para sempre incluir todas as horas de 8 a 18 (mesmo com valor 0), garantindo que o grafico tenha o eixo X completo e consistente.

**Arquivo: `src/components/climo/DashboardView.tsx`**
- Remover o card pequeno "Volume / Hora" da segunda fileira.
- Ajustar a segunda fileira de `lg:grid-cols-4` para `lg:grid-cols-3`.
- Adicionar uma terceira fileira com um card de largura total contendo um `BarChart` do Recharts com:
  - Eixo X mostrando as horas de 08h a 18h
  - Barras com o volume total por hora
  - Tooltip e estilo visual consistente com o grafico de 7 dias
  - Altura de aproximadamente 250px
