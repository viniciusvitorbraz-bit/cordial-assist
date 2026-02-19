import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, Timer, UserCheck, CheckCircle2, Loader2, AlertTriangle, Bot } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import StatCard from './StatCard';
import ServiceMetric from './ServiceMetric';
import { createDynamicSupabaseClient } from '@/lib/supabase-config';
import { type DateRangeKey, getDateRange, fetchDashboardMetrics, type DashboardMetrics } from '@/lib/dashboard-queries';

function formatSeconds(seg: number): string {
  if (!seg) return '0m 00s';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

const DATE_OPTIONS: DateRangeKey[] = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias'];

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
    <div className="space-y-8">
      {/* Header + Date Filter */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground">Visão Geral de Performance</h2>
          <p className="text-sm text-muted-foreground">Métricas consolidadas de atendimento e operação</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted shadow-climo-sm min-w-[160px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{dateRange}</span>
            </div>
            <ChevronDown className={`w-3 h-3 transition-transform text-muted-foreground ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
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

      {/* Total Atendimentos */}
      <div className="grid grid-cols-1 gap-6">
        <StatCard
          title="Total Atendimentos"
          value={String(metrics?.totalAtendimentos ?? 0)}
          subtext="No período selecionado"
          highlight
        />
      </div>

      {/* Tempos Operacionais */}
      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <Timer className="w-4 h-4 text-chart-1" /> Tempos Operacionais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ServiceMetric
            label="Tempo Médio Conversa IA"
            value={formatSeconds(metrics?.tempoConversaIaSeg ?? 0)}
            subValue="ai_started → ai_finished"
            icon={Bot}
            colorClass="bg-chart-2/15 text-chart-2"
          />
          <ServiceMetric
            label="Tempo Espera Humano"
            value={formatSeconds(metrics?.tempoEsperaHumanoSeg ?? 0)}
            subValue="ai_finished → human_started"
            icon={UserCheck}
            colorClass="bg-chart-3/15 text-chart-3"
          />
        </div>
      </div>

      {/* Volume por Hora */}
      <div className="bg-card p-6 border border-border rounded-lg shadow-climo-sm">
        <div className="mb-6">
          <h3 className="font-bold text-card-foreground">Volume por Hora</h3>
          <p className="text-xs text-muted-foreground">Distribuição de demanda ao longo do dia ({dateRange})</p>
        </div>
        <div className="h-64">
          {metrics && metrics.volumePorHora.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.volumePorHora}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 20%, 90%)" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'hsl(220, 25%, 96%)' }}
                  contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(220, 20%, 90%)', borderRadius: '0.5rem', color: 'hsl(235, 50%, 20%)' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {metrics.volumePorHora.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total > 50 ? 'hsl(235, 70%, 25%)' : 'hsl(200, 70%, 50%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Sem dados para o período selecionado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
