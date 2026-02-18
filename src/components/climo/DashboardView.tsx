import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, Timer, UserCheck, CheckCircle2, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import StatCard from './StatCard';
import ServiceMetric from './ServiceMetric';
import { createDynamicSupabaseClient } from '@/lib/supabase-config';

function formatSeconds(seg: number): string {
  if (!seg) return '0m 00s';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function DashboardView() {
  const [dateRange, setDateRange] = useState('Hoje');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [totalAtendimentos, setTotalAtendimentos] = useState<{ hoje: number; ontem: number; crescimento_pct: number } | null>(null);
  const [tempos, setTempos] = useState<{ tempo_conversa_ia_seg: number; tempo_intervencao_seg: number; tempo_resolucao_total_seg: number } | null>(null);
  const [volumeHora, setVolumeHora] = useState<{ hora: string; total: number }[]>([]);
  const [atendimentosSemana, setAtendimentosSemana] = useState<{ dia: string; total: number }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const db = createDynamicSupabaseClient();
      if (!db) {
        setLoading(false);
        return;
      }
      const [resTotal, resTempos, resHora, resSemana] = await Promise.all([
        db.from('v_total_atendimentos').select('*').maybeSingle(),
        db.from('v_tempos_operacionais').select('*').maybeSingle(),
        db.from('v_volume_por_hora').select('*'),
        db.from('v_atendimentos_semana').select('*'),
      ]);

      if (resTotal.data) setTotalAtendimentos(resTotal.data);
      if (resTempos.data) setTempos(resTempos.data);
      if (resHora.data) setVolumeHora(resHora.data);
      if (resSemana.data) setAtendimentosSemana(resSemana.data);
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="space-y-8">
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
              {['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias'].map((option) => (
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

      <div className="grid grid-cols-1 gap-6">
        <StatCard
          title="Total Atendimentos"
          value={String(totalAtendimentos?.hoje ?? 0)}
          subtext="No período selecionado"
          trend={totalAtendimentos && totalAtendimentos.crescimento_pct >= 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(totalAtendimentos?.crescimento_pct ?? 0)}%`}
          highlight
        />
      </div>

      {/* Tempos Operacionais */}
      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <Timer className="w-4 h-4 text-chart-1" /> Tempos Operacionais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ServiceMetric label="Tempo Médio de Conversa" value={formatSeconds(tempos?.tempo_conversa_ia_seg ?? 0)} subValue="Duração total" icon={Timer} colorClass="bg-chart-1/15 text-chart-1" />
          <ServiceMetric label="Tempo até Intervenção" value={formatSeconds(tempos?.tempo_intervencao_seg ?? 0)} subValue="Escalonamento humano" icon={UserCheck} colorClass="bg-chart-3/15 text-chart-3" />
          <ServiceMetric label="Tempo de Resolução Total" value={formatSeconds(tempos?.tempo_resolucao_total_seg ?? 0)} subValue="Do início ao fim" icon={CheckCircle2} colorClass="bg-climo-cyan/15 text-climo-cyan" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 border border-border rounded-lg shadow-climo-sm">
          <div className="mb-6">
            <h3 className="font-bold text-card-foreground">Volume por Hora</h3>
            <p className="text-xs text-muted-foreground">Distribuição de demanda ao longo do dia</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeHora}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 20%, 90%)" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'hsl(220, 25%, 96%)' }}
                  contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(220, 20%, 90%)', borderRadius: '0.5rem', color: 'hsl(235, 50%, 20%)' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {volumeHora.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total > 50 ? 'hsl(235, 70%, 25%)' : 'hsl(200, 70%, 50%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 border border-border rounded-lg shadow-climo-sm">
          <div className="mb-6">
            <h3 className="font-bold text-card-foreground">Atendimentos na Semana</h3>
            <p className="text-xs text-muted-foreground">Volume diário de atendimentos</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={atendimentosSemana}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 20%, 90%)" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'hsl(220, 25%, 96%)' }}
                  contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(220, 20%, 90%)', borderRadius: '0.5rem', color: 'hsl(235, 50%, 20%)' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {atendimentosSemana.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total > 100 ? 'hsl(235, 70%, 25%)' : 'hsl(200, 70%, 50%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
