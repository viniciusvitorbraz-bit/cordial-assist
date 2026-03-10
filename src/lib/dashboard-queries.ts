import { SupabaseClient } from '@supabase/supabase-js';

export type DateRangeKey = 'Hoje' | 'Ontem' | 'Últimos 7 dias' | 'Últimos 30 dias' | 'custom';

export interface DateRange {
  start: string; // ISO string
  end: string;   // ISO string
}

/**
 * Retorna meia-noite de hoje em Brasília (UTC-3) como Date UTC.
 * Ex: se agora é 2026-02-24T22:00Z (19h Brasília), retorna 2026-02-24T03:00:00.000Z
 */
function getBrasiliaMidnightUTC(): Date {
  const now = new Date();
  // Brasília = UTC - 3h. Converter "agora" para horário de Brasília
  const brasiliaMs = now.getTime() - 3 * 60 * 60 * 1000;
  const brasiliaDate = new Date(brasiliaMs);
  // Meia-noite Brasília em UTC = data de Brasília + 3h
  return new Date(Date.UTC(
    brasiliaDate.getUTCFullYear(),
    brasiliaDate.getUTCMonth(),
    brasiliaDate.getUTCDate(),
    3, 0, 0, 0 // 00:00 Brasília = 03:00 UTC
  ));
}

export function getDateRange(key: DateRangeKey, customRange?: DateRange): DateRange {
  const todayStart = getBrasiliaMidnightUTC();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  switch (key) {
    case 'Hoje':
      return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
    case 'Ontem': {
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      return { start: yesterdayStart.toISOString(), end: todayStart.toISOString() };
    }
    case 'Últimos 7 dias': {
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: weekStart.toISOString(), end: todayEnd.toISOString() };
    }
    case 'Últimos 30 dias': {
      const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
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
  // ── Query 1: eventos no período selecionado (para cards e volume/hora) ──
  const { data: events, error } = await db
    .from('conversation_events')
    .select('id, conversation_id, event_type, created_at')
    .in('event_type', ['conversation_started', 'ai_started', 'ai_finished', 'human_started'])
    .gte('created_at', range.start)
    .lte('created_at', range.end)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  // ── Query 2: últimos 7 dias (sempre, independente do filtro) ──
  const todayMidnight = getBrasiliaMidnightUTC();
  const todayEndUTC = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(todayMidnight.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 dias atrás + hoje = 7 dias

  const { data: weeklyEvents, error: weeklyError } = await db
    .from('conversation_events')
    .select('id, conversation_id, event_type, created_at')
    .in('event_type', ['conversation_started', 'human_started'])
    .gte('created_at', sevenDaysAgo.toISOString())
    .lte('created_at', todayEndUTC.toISOString())
    .order('created_at', { ascending: true });

  if (weeklyError) throw new Error(weeklyError.message);

  // Helper: convert UTC timestamp to Brasília (UTC-3) Date
  const toBrasilia = (ts: number) => new Date(ts - 3 * 60 * 60 * 1000);

  // ── Processar dados do período selecionado ──
  let totalAtendimentos = 0;
  const hourCounts = new Map<number, number>();
  const temposIA: number[] = [];
  const temposEspera: number[] = [];
  const temposTotal: number[] = [];

  if (events && events.length > 0) {
    const byConversation = new Map<string, typeof events>();
    for (const ev of events) {
      const cid = ev.conversation_id;
      if (!byConversation.has(cid)) byConversation.set(cid, []);
      byConversation.get(cid)!.push(ev);
    }

    for (const [, evts] of byConversation) {
      // Sort events chronologically within this conversation
      const sorted = [...evts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const conversationStartedEv = sorted.find(ev => ev.event_type === 'conversation_started');
      const humanStartedEv = sorted.find(ev => ev.event_type === 'human_started');

      if (conversationStartedEv) {
        totalAtendimentos++;
        const ts = new Date(conversationStartedEv.created_at).getTime();
        const brasiliaDate = toBrasilia(ts);
        const hour = brasiliaDate.getUTCHours();
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      }

      // Tempo IA: conversation_started até primeiro ai_finished
      // (não existem eventos ai_started na tabela, o fluxo é conversation_started → IA atende → ai_finished)
      const aiFinishEvents = sorted.filter(ev => ev.event_type === 'ai_finished');

      if (conversationStartedEv && aiFinishEvents.length > 0) {
        const startTime = new Date(conversationStartedEv.created_at).getTime();
        // Usar o PRIMEIRO ai_finished como fim do atendimento IA
        const firstFinish = aiFinishEvents[0];
        const finishTime = new Date(firstFinish.created_at).getTime();
        const diff = (finishTime - startTime) / 1000;
        if (diff > 0) {
          temposIA.push(diff);
        }
      }

      // Tempo espera humano: último ai_finished até primeiro human_started
      if (humanStartedEv && aiFinishEvents.length > 0) {
        const humanTime = new Date(humanStartedEv.created_at).getTime();
        const lastAiFinish = aiFinishEvents[aiFinishEvents.length - 1];
        const aiFinishTime = new Date(lastAiFinish.created_at).getTime();
        const diff = (humanTime - aiFinishTime) / 1000;
        if (diff > 0) temposEspera.push(diff);
      }

      // Tempo total: conversation_started até human_started
      if (conversationStartedEv && humanStartedEv) {
        const startTime = new Date(conversationStartedEv.created_at).getTime();
        const humanTime = new Date(humanStartedEv.created_at).getTime();
        const diff = (humanTime - startTime) / 1000;
        if (diff > 0) temposTotal.push(diff);
      }
    }
  }

  // ── Processar gráfico semanal (sempre últimos 7 dias) ──
  const weeklyByConversation = new Map<string, { started: boolean; transbordo: boolean; dateKey: string | null }>();

  if (weeklyEvents && weeklyEvents.length > 0) {
    for (const ev of weeklyEvents) {
      const cid = ev.conversation_id;
      if (!weeklyByConversation.has(cid)) {
        weeklyByConversation.set(cid, { started: false, transbordo: false, dateKey: null });
      }
      const entry = weeklyByConversation.get(cid)!;
      if (ev.event_type === 'conversation_started') {
        entry.started = true;
        const brasiliaDate = toBrasilia(new Date(ev.created_at).getTime());
        entry.dateKey = brasiliaDate.toISOString().slice(0, 10);
      }
      if (ev.event_type === 'human_started') {
        entry.transbordo = true;
      }
    }
  }

  const dailyResolvido = new Map<string, number>();
  const dailyTransbordo = new Map<string, number>();
  for (const [, entry] of weeklyByConversation) {
    if (!entry.started || !entry.dateKey) continue;
    if (entry.transbordo) {
      dailyTransbordo.set(entry.dateKey, (dailyTransbordo.get(entry.dateKey) ?? 0) + 1);
    } else {
      dailyResolvido.set(entry.dateKey, (dailyResolvido.get(entry.dateKey) ?? 0) + 1);
    }
  }

  // Gerar sempre 7 labels (mesmo com 0 atendimentos)
  const weeklyData: WeeklyDayData[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayMs = todayMidnight.getTime() - i * 24 * 60 * 60 * 1000;
    // Converter de volta para data Brasília para obter a dateKey
    const brasiliaDay = new Date(dayMs - 3 * 60 * 60 * 1000);
    const dateKey = brasiliaDay.toISOString().slice(0, 10);
    const d = new Date(dateKey + 'T12:00:00');
    const day = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    weeklyData.push({
      day,
      resolvidoIA: dailyResolvido.get(dateKey) ?? 0,
      transbordo: dailyTransbordo.get(dateKey) ?? 0,
    });
  }

  // Volume por hora
  const allHours = Array.from(hourCounts.keys());
  const minHour = allHours.length > 0 ? Math.min(0, ...allHours) : 8;
  const maxHour = allHours.length > 0 ? Math.max(23, ...allHours) : 18;
  const volumePorHora: { hora: string; total: number }[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    volumePorHora.push({ hora: `${String(h).padStart(2, '0')}h`, total: hourCounts.get(h) ?? 0 });
  }

  const avg = (arr: number[]) => arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  // Horário de pico
  let horarioPico: string | null = null;
  if (volumePorHora.length > 0) {
    const peak = volumePorHora.reduce((max, cur) => cur.total > max.total ? cur : max, volumePorHora[0]);
    horarioPico = peak.hora;
  }

  // Variação: período anterior de mesmo tamanho
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
