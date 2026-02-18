import { useState } from 'react';
import { Calendar, ChevronDown, Clock, CheckCircle, BrainCircuit, ThumbsUp, Zap, Timer, UserCheck, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import StatCard from './StatCard';
import ServiceMetric from './ServiceMetric';
import { hourlyVolumeData } from '@/data/climo-data';

const weeklyVolumeData = [
  { day: 'Seg', volume: 145 }, { day: 'Ter', volume: 132 }, { day: 'Qua', volume: 164 },
  { day: 'Qui', volume: 150 }, { day: 'Sex', volume: 158 }, { day: 'Sáb', volume: 45 }, { day: 'Dom', volume: 22 },
];

export default function DashboardView() {
  const [dateRange, setDateRange] = useState('Hoje');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Atendimentos" value="382" subtext="No período selecionado" trend="up" trendValue="15%" highlight />
        <StatCard title="ASOs Confirmados" value="124" subtext="Emitidos no período" trend="up" trendValue="8%" />
        <StatCard title="Taxa de Automação" value="72%" subtext="Resolvidos sem humano" trend="up" trendValue="4%" />
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-climo-cyan" /> Eficiência Operacional
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ServiceMetric label="Primeira Resposta" value="2s" subValue="Instantâneo" icon={Clock} colorClass="bg-chart-1/15 text-chart-1" />
          <ServiceMetric label="Tempo de Resolução" value="45s" subValue="Média IA" icon={CheckCircle} colorClass="bg-climo-cyan/15 text-climo-cyan" />
          <ServiceMetric label="Taxa de Retenção" value="72%" subValue="Sem humano" icon={BrainCircuit} colorClass="bg-chart-3/15 text-chart-3" />
          <ServiceMetric label="Satisfação (CSAT)" value="4.8" subValue="/ 5.0" icon={ThumbsUp} colorClass="bg-chart-4/15 text-chart-4" />
        </div>
      </div>

      {/* Tempos Operacionais */}
      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <Timer className="w-4 h-4 text-chart-1" /> Tempos Operacionais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ServiceMetric label="Tempo Médio de Conversa" value="3m 12s" subValue="Duração total" icon={Timer} colorClass="bg-chart-1/15 text-chart-1" />
          <ServiceMetric label="Tempo até Intervenção" value="1m 45s" subValue="Escalonamento humano" icon={UserCheck} colorClass="bg-chart-3/15 text-chart-3" />
          <ServiceMetric label="Tempo de Resolução Total" value="4m 30s" subValue="Do início ao fim" icon={CheckCircle2} colorClass="bg-climo-cyan/15 text-climo-cyan" />
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
              <BarChart data={hourlyVolumeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 20%, 90%)" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'hsl(220, 25%, 96%)' }}
                  contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(220, 20%, 90%)', borderRadius: '0.5rem', color: 'hsl(235, 50%, 20%)' }}
                />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {hourlyVolumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.volume > 50 ? 'hsl(235, 70%, 25%)' : 'hsl(200, 70%, 50%)'} />
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
              <BarChart data={weeklyVolumeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 20%, 90%)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(230, 20%, 45%)', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'hsl(220, 25%, 96%)' }}
                  contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(220, 20%, 90%)', borderRadius: '0.5rem', color: 'hsl(235, 50%, 20%)' }}
                />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {weeklyVolumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.volume > 100 ? 'hsl(235, 70%, 25%)' : 'hsl(200, 70%, 50%)'} />
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
