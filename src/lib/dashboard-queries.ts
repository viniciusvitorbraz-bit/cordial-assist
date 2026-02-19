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

export interface DashboardMetrics {
  totalAtendimentos: number;
  volumePorHora: { hora: string; total: number }[];
  tempoConversaIaSeg: number;
  tempoEsperaHumanoSeg: number;
  tempoTotalSeg: number;
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
      // 2️⃣ Volume por hora
      const hour = new Date(conversationStarted).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }

    // 3️⃣ Tempo conversa IA (ignore sem ai_started ou ai_finished)
    if (aiStarted !== null && aiFinished !== null) {
      const diff = (aiFinished - aiStarted) / 1000;
      if (diff > 0) temposIA.push(diff);
    }

    // 4️⃣ Tempo espera humano (ai_finished → human_started)
    if (aiFinished !== null && humanStarted !== null) {
      const diff = (humanStarted - aiFinished) / 1000;
      if (diff > 0) temposEspera.push(diff);
    }

    // 5️⃣ Tempo total (ai_started → human_started)
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

  const avg = (arr: number[]) => arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  return {
    totalAtendimentos,
    volumePorHora,
    tempoConversaIaSeg: avg(temposIA),
    tempoEsperaHumanoSeg: avg(temposEspera),
    tempoTotalSeg: avg(temposTotal),
  };
}
