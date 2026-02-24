import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, Timer, Loader2, AlertTriangle, Target, Clock, Zap, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { type DateRangeKey } from '@/lib/dashboard-queries';
import { getApiUrl } from '@/lib/supabase-config';
import { fetchExternalDashboard, type ExternalDashboardMetrics } from '@/lib/dashboard-api';

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
  const [metrics, setMetrics] = useState<ExternalDashboardMetrics | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchExternalDashboard(dateRange);
      setMetrics(result);
    } catch (e: any) {
      console.error('Erro ao carregar dados do dashboard:', e);
      setError(e.message || 'Erro de conexão com a API externa.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hasConfig = !!getApiUrl();

  if (!hasConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Calendar className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Configuração necessária</p>
        <p className="text-xs opacity-70 mt-1">Acesse <strong>Configurações</strong> e insira a URL da API de métricas.</p>
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

  // Map external format to chart-compatible data
  const volumePorHora = (metrics?.volume_por_hora ?? []).map(v => ({
    hora: `${v.hora}h`,
    total: v.quantidade,
  }));

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

      {/* LAYOUT: 2 cards lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[420px]">

        {/* PAINEL ESQUERDO: Volume por hora */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-climo-sm flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-semibold text-foreground">Volume por Hora do Dia</h3>
            <BarChart3 className="w-5 h-5 text-chart-3" />
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumePorHora} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))', fontWeight: 500 }} />
                <Bar dataKey="total" fill="hsl(var(--chart-3))" name="Atendimentos" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PAINEL DIREITO: 2 Cards Empilhados */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full">
          <div className="bg-card border border-border rounded-lg p-6 shadow-climo-sm flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total de Atendimentos</h3>
              <Target className="w-5 h-5 text-chart-1" />
            </div>
            <div className="flex items-baseline gap-3 my-4">
              <span className="text-6xl font-bold text-foreground tracking-tight">{metrics?.total_atendimentos ?? 0}</span>
              <span className="text-sm font-semibold text-emerald-500">no período</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 shadow-climo-sm flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tempo Médio Conversa IA</h3>
              <Timer className="w-5 h-5 text-chart-1" />
            </div>
            <div className="my-4">
              <span className="text-5xl font-bold text-foreground tracking-tight">{formatSeconds(metrics?.tempo_medio_ia ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEGUNDA FILEIRA: 2 Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 shadow-climo-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Espera Humano</h3>
            <Clock className="w-4 h-4 text-chart-2" />
          </div>
          <span className="text-3xl font-bold text-foreground tracking-tight">
            {formatSeconds(metrics?.tempo_medio_espera_humano ?? 0)}
          </span>
          <p className="text-xs text-muted-foreground mt-2">Tempo médio até atendente</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-climo-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tempo Médio Resolução</h3>
            <Zap className="w-4 h-4 text-chart-4" />
          </div>
          <span className="text-3xl font-bold text-foreground tracking-tight">
            {formatSeconds(metrics?.tempo_medio_resolucao ?? 0)}
          </span>
          <p className="text-xs text-muted-foreground mt-2">Tempo total médio de resolução</p>
        </div>
      </div>
    </div>
  );
}
