import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, Timer, Loader2, AlertTriangle, Target, ArrowUpRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { createDynamicSupabaseClient } from '@/lib/supabase-config';
import { type DateRangeKey, getDateRange, fetchDashboardMetrics, type DashboardMetrics } from '@/lib/dashboard-queries';

function formatSeconds(seg: number): string {
  if (!seg) return '0m 00s';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

const DATE_OPTIONS: DateRangeKey[] = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias'];

const weeklyData = [
  { day: '13 de fev.', resolvidoIA: 20, transbordo: 8, trend: 10 },
  { day: '14 de fev.', resolvidoIA: 25, transbordo: 10, trend: 15 },
  { day: '15 de fev.', resolvidoIA: 45, transbordo: 10, trend: 22 },
  { day: '16 de fev.', resolvidoIA: 35, transbordo: 13, trend: 18 },
  { day: '17 de fev.', resolvidoIA: 35, transbordo: 10, trend: 17 },
  { day: '18 de fev.', resolvidoIA: 10, transbordo: 5, trend: 12 },
  { day: '19 de fev.', resolvidoIA: 25, transbordo: 7, trend: 14 },
];

export default function DashboardView() {
  const [dateRange, setDateRange] = useState<DateRangeKey>('Hoje');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = createDynamicSupabaseClient();
      if (!db) {
        setLoading(false);
        return;
      }

      const range = getDateRange(dateRange);
      const result = await fetchDashboardMetrics(db, range);
      setMetrics(result);
    } catch (e: any) {
      console.error('Erro ao carregar dados do dashboard:', e);
      setError(e.message || 'Erro de conexão. Verifique a URL e Anon Key nas Configurações.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hasConfig = !!createDynamicSupabaseClient();

  if (!hasConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Calendar className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Configuração necessária</p>
        <p className="text-xs opacity-70 mt-1">Acesse <strong>Configurações</strong> e insira a URL e Anon Key do banco de dados.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground max-w-lg mx-auto text-center">
        <AlertTriangle className="w-12 h-12 mb-3 text-destructive opacity-70" />
        <p className="text-sm font-medium text-destructive">Erro ao carregar dados</p>
        <p className="text-xs opacity-80 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título e Filtro */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Visão Geral</h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o volume e a velocidade de atendimento.</p>
        </div>
        <div className="flex gap-2 relative">
          <button
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{dateRange}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
          </button>
          {isDateDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-climo-md z-50 overflow-hidden">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => { setDateRange(option); setIsDateDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                    dateRange === option ? 'text-primary font-medium bg-primary/5' : 'text-foreground'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* O NOVO LAYOUT DE 3 PAINÉIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[420px]">

        {/* PAINEL ESQUERDO: Gráfico de Barras Empilhadas */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-climo-sm flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-semibold text-foreground">Atendimentos Últimos 7 dias</h3>
            <div className="bg-emerald-500/10 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +15.2%
            </div>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))', fontWeight: 500 }} />
                <Bar dataKey="resolvidoIA" stackId="a" fill="hsl(var(--chart-1))" name="Resolvido IA" maxBarSize={50} />
                <Bar dataKey="transbordo" stackId="a" fill="hsl(var(--chart-2))" name="Transbordo" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PAINEL DIREITO: 2 Cards Empilhados */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full">

          {/* Card 1: Total de Atendimentos */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-climo-sm flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total de Atendimentos</h3>
              <Target className="w-5 h-5 text-chart-1" />
            </div>
            <div className="flex items-baseline gap-3 my-4">
              <span className="text-6xl font-bold text-foreground tracking-tight">{metrics?.totalAtendimentos ?? 0}</span>
              <span className="text-sm font-semibold text-emerald-500">no período</span>
            </div>
          </div>

          {/* Card 2: Tempo Médio Conversa IA */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-climo-sm flex-1 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tempo Médio Conversa IA</h3>
              <Timer className="w-5 h-5 text-chart-1" />
            </div>
            <div className="my-4 relative z-10">
              <span className="text-5xl font-bold text-foreground tracking-tight">{formatSeconds(metrics?.tempoConversaIaSeg ?? 0)}</span>
              <p className="text-[11px] text-muted-foreground font-mono mt-1">Início ao fim do atendimento</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-20 opacity-50 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <Line type="monotone" dataKey="trend" stroke="hsl(var(--chart-2))" strokeWidth={4} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
