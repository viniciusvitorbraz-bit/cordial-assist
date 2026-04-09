import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, Timer, Loader2, AlertTriangle, Target, Clock, Zap, BarChart3, FileText, Database } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { createDynamicSupabaseClient } from '@/lib/supabase-config';
import { type DateRangeKey, getDateRange, fetchDashboardMetrics, type DashboardMetrics } from '@/lib/dashboard-queries';

function formatSeconds(seg: number): string {
  if (!Number.isFinite(seg)) return 'Sem dados';
  if (seg < 1) return `${seg.toFixed(1)}s`;
  if (seg < 60) return `${seg < 10 ? seg.toFixed(1) : Math.round(seg)}s`;
  const totalSeconds = Math.round(seg);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
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
      if (!db) { setLoading(false); return; }
      const range = getDateRange(dateRange);
      const result = await fetchDashboardMetrics(db, range);
      setMetrics(result);
    } catch (e: any) {
      console.error('Erro ao carregar dados do dashboard:', e);
      setError(e.message || 'Erro de conexão.');
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
        <p className="text-sm font-light">Configuração necessária</p>
        <p className="text-xs opacity-70 mt-1">Acesse <strong>Configurações</strong> e insira a URL e Anon Key.</p>
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
        <p className="text-sm font-light text-destructive">Erro ao carregar dados</p>
        <p className="text-xs opacity-80 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-light text-foreground tracking-tight">Visão Geral</h2>
          <p className="text-sm text-muted-foreground font-light mt-1">Acompanhe o volume e a velocidade de atendimento. <span className="opacity-60">(Horário de Brasília)</span></p>
        </div>
        <div className="flex gap-2 relative">
          <button
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-light text-foreground hover:bg-secondary transition-colors"
          >
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{dateRange}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
          </button>
          {isDateDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-2xl z-50 overflow-hidden">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => { setDateRange(option); setIsDateDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-light hover:bg-secondary transition-colors ${
                    dateRange === option ? 'text-primary bg-primary/5' : 'text-foreground'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[420px]">
        {/* Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Atendimentos Últimos 7 dias</h3>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.weeklyData ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 300, fontFamily: 'Outfit' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 300, fontFamily: 'Outfit' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#121824', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff', fontWeight: 300, fontFamily: 'Outfit' }} content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const total = payload.reduce((sum: number, p: any) => sum + (p.value ?? 0), 0);
                  return (
                    <div style={{ backgroundColor: '#121824', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontWeight: 300, fontFamily: 'Outfit', fontSize: '13px' }}>
                      <p style={{ opacity: 0.5 }}>{label}</p>
                      <p>Atendimentos: <strong>{total}</strong></p>
                    </div>
                  );
                }} />
                <Bar dataKey="resolvidoIA" stackId="a" fill="hsl(217, 91%, 60%)" maxBarSize={50} />
                <Bar dataKey="transbordo" stackId="a" fill="hsl(217, 91%, 60%)" radius={[8, 8, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Cards */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full">
          <div className="bg-card border border-border rounded-2xl p-6 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Total de Atendimentos</h3>
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-baseline gap-3 my-4">
              <span className="text-6xl font-light text-foreground tracking-tight">{metrics?.totalAtendimentos ?? 0}</span>
              <span className="text-xs font-medium text-climo-success">no período</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Horário de Pico</h3>
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="my-4">
              <span className="text-5xl font-light text-foreground tracking-tight">{metrics?.horarioPico ?? '—'}</span>
              <p className="text-xs text-muted-foreground font-light mt-2">Maior volume (Brasília)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tempo Médio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Tempo Médio Conversa IA</h3>
            <Timer className="w-5 h-5 text-primary/60" />
          </div>
          <div className="my-4">
            <span className="text-4xl font-light text-foreground tracking-tight">
              {metrics ? formatSeconds(metrics.tempoConversaIaSeg) : '—'}
            </span>
            <p className="text-xs text-muted-foreground font-light mt-2">Tempo médio de processamento da IA por conversa</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Tempo até Atendimento Humano</h3>
            <Clock className="w-5 h-5 text-primary/60" />
          </div>
          <div className="my-4">
            <span className="text-4xl font-light text-foreground tracking-tight">
              {metrics ? formatSeconds(metrics.tempoEsperaHumanoSeg) : '—'}
            </span>
            <p className="text-xs text-muted-foreground font-light mt-2">Do fim da IA até atendimento humano</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Resumos Enviados</h3>
            <FileText className="w-5 h-5 text-primary/60" />
          </div>
          <div className="my-4">
            <span className="text-4xl font-light text-foreground tracking-tight">
              {metrics?.resumosEnviados ?? 0}
            </span>
            <p className="text-xs text-muted-foreground font-light mt-2">Total de resumos enviados pela IA</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Dados Coletados</h3>
            <Database className="w-5 h-5 text-primary/60" />
          </div>
          <div className="my-4">
            <span className="text-4xl font-light text-foreground tracking-tight">
              {metrics?.dadosColetados ?? 0}
            </span>
            <p className="text-xs text-muted-foreground font-light mt-2">Total de {metrics?.dadosColetadosAtendimentos ?? 0} atendimentos</p>
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Volume por Hora do Dia</h3>
            <p className="text-xs text-muted-foreground font-light mt-1">Distribuição ao longo do dia (Brasília)</p>
          </div>
          <BarChart3 className="w-5 h-5 text-primary/60" />
        </div>
        <div className="w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics?.volumePorHora ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 300, fontFamily: 'Outfit' }} dy={10} interval={1} angle={-45} textAnchor="end" height={50} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 300, fontFamily: 'Outfit' }} allowDecimals={false} width={30} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#121824', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff', fontWeight: 300, fontFamily: 'Outfit' }} />
              <Bar dataKey="total" fill="hsl(220, 60%, 50%)" name="Atendimentos" radius={[8, 8, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
