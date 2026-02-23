import { SupabaseClient } from '@supabase/supabase-js';

export type DateRangeKey = 'Hoje' | 'Ontem' | 'Últimos 7 dias' | 'Últimos 30 dias' | 'custom';

export interface DateRange {
  start: string; // ISO string
  end: string;   // ISO string
}

export function getDateRange(key: DateRangeKey, customRange?: DateRange): DateRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  switch (key) {
    case 'Hoje':
      return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
    case 'Ontem': {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      return { start: yesterdayStart.toISOString(), end: todayStart.toISOString() };
    }
    case 'Últimos 7 dias': {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      return { start: weekStart.toISOString(), end: todayEnd.toISOString() };
    }
    case 'Últimos 30 dias': {
      const monthStart = new Date(todayStart);
      monthStart.setDate(monthStart.getDate() - 30);
      return { start: monthStart.toISOString(), end: todayEnd.toISOString() };
    }
    case 'custom':
      return customRange ?? { start: todayStart.toISOString(), end: todayEnd.toISOString() };
  }
}

export interface WeeklyDayData {
  day: string;
  resolvidoIA: number;
  transbordo: number;
}

export interface DashboardMetrics {
  totalAtendimentos: number;
  volumePorHora: { hora: string; total: number }[];
  tempoConversaIaSeg: number;
  tempoEsperaHumanoSeg: number;
  tempoTotalSeg: number;
  weeklyData: WeeklyDayData[];
  horarioPico: string | null;
  variacaoSemanal: number | null; // percentage change vs previous period
}

export async function fetchDashboardMetrics(
  db: SupabaseClient,
  range: DateRange
): Promise<DashboardMetrics> {
  // 1. Get all conversation_events in range
  const { data: events, error } = await db
    .from('conversation_events')
    .select('id, conversation_id, event_type, created_at')
    .in('event_type', ['conversation_started', 'ai_started', 'ai_finished', 'human_started'])
    .gte('created_at', range.start)
    .lte('created_at', range.end)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!events || events.length === 0) {
    return {
      totalAtendimentos: 0,
      volumePorHora: [],
      tempoConversaIaSeg: 0,
      tempoEsperaHumanoSeg: 0,
      tempoTotalSeg: 0,
      weeklyData: [],
      horarioPico: null,
      variacaoSemanal: null,
    };
  }

  // Group events by conversation_id
  const byConversation = new Map<string, typeof events>();
  for (const ev of events) {
    const cid = ev.conversation_id;
    if (!byConversation.has(cid)) byConversation.set(cid, []);
    byConversation.get(cid)!.push(ev);
  }

  // 1️⃣ Total atendimentos = count of conversation_started
  let totalAtendimentos = 0;
  const hourCounts = new Map<number, number>();

  // Metrics accumulators
  const temposIA: number[] = [];
  const temposEspera: number[] = [];
  const temposTotal: number[] = [];

  // Daily counts for weekly chart
  const dailyResolvido = new Map<string, number>();
  const dailyTransbordo = new Map<string, number>();

  for (const [, evts] of byConversation) {
    const getTime = (type: string) => {
      const e = evts.find(ev => ev.event_type === type);
      return e ? new Date(e.created_at).getTime() : null;
    };

    const conversationStarted = getTime('conversation_started');
    const aiStarted = getTime('ai_started');
    const aiFinished = getTime('ai_finished');
    const humanStarted = getTime('human_started');

    // Count conversation_started
    if (conversationStarted !== null) {
      totalAtendimentos++;
      const hour = new Date(conversationStarted).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

      // Daily grouping for weekly chart
      const dateKey = new Date(conversationStarted).toISOString().slice(0, 10);
      const isTransbordo = humanStarted !== null;
      if (isTransbordo) {
        dailyTransbordo.set(dateKey, (dailyTransbordo.get(dateKey) ?? 0) + 1);
      } else {
        dailyResolvido.set(dateKey, (dailyResolvido.get(dateKey) ?? 0) + 1);
      }
    }

    if (aiStarted !== null && aiFinished !== null) {
      const diff = (aiFinished - aiStarted) / 1000;
      if (diff > 0) temposIA.push(diff);
    }

    if (aiFinished !== null && humanStarted !== null) {
      const diff = (humanStarted - aiFinished) / 1000;
      if (diff > 0) temposEspera.push(diff);
    }

    if (aiStarted !== null && humanStarted !== null) {
      const diff = (humanStarted - aiStarted) / 1000;
      if (diff > 0) temposTotal.push(diff);
    }
  }

  // Build volume por hora (sorted)
  const volumePorHora: { hora: string; total: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const count = hourCounts.get(h);
    if (count) {
      volumePorHora.push({ hora: `${String(h).padStart(2, '0')}h`, total: count });
    }
  }

  // Build weekly data (last 7 days sorted)
  const allDays = new Set([...dailyResolvido.keys(), ...dailyTransbordo.keys()]);
  const weeklyData: WeeklyDayData[] = Array.from(allDays)
    .sort()
    .map(dateKey => {
      const d = new Date(dateKey + 'T12:00:00');
      const day = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      return {
        day,
        resolvidoIA: dailyResolvido.get(dateKey) ?? 0,
        transbordo: dailyTransbordo.get(dateKey) ?? 0,
      };
    });

  const avg = (arr: number[]) => arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  // Horário de pico
  let horarioPico: string | null = null;
  if (volumePorHora.length > 0) {
    const peak = volumePorHora.reduce((max, cur) => cur.total > max.total ? cur : max, volumePorHora[0]);
    horarioPico = peak.hora;
  }

  // Variação semanal: buscar período anterior de mesmo tamanho
  const rangeMs = new Date(range.end).getTime() - new Date(range.start).getTime();
  const prevStart = new Date(new Date(range.start).getTime() - rangeMs).toISOString();
  const prevEnd = range.start;

  const { data: prevEvents } = await db
    .from('conversation_events')
    .select('id')
    .eq('event_type', 'conversation_started')
    .gte('created_at', prevStart)
    .lte('created_at', prevEnd);

  const prevTotal = prevEvents?.length ?? 0;
  const variacaoSemanal = prevTotal === 0
    ? (totalAtendimentos > 0 ? 100 : null)
    : Math.round(((totalAtendimentos - prevTotal) / prevTotal) * 100);

  return {
    totalAtendimentos,
    volumePorHora,
    tempoConversaIaSeg: avg(temposIA),
    tempoEsperaHumanoSeg: avg(temposEspera),
    tempoTotalSeg: avg(temposTotal),
    weeklyData,
    horarioPico,
    variacaoSemanal,
  };
}
