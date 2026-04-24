import { SupabaseClient } from '@supabase/supabase-js';

export type DateRangeKey = 'Hoje' | 'Ontem' | 'Últimos 7 dias' | 'Últimos 30 dias' | 'Últimos 2 meses' | 'custom';

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
    case 'Últimos 2 meses': {
      const twoMonthsStart = new Date(todayStart.getTime() - 60 * 24 * 60 * 60 * 1000);
      return { start: twoMonthsStart.toISOString(), end: todayEnd.toISOString() };
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
  resumosEnviados: number;
  dadosColetados: number;
  dadosColetadosAtendimentos: number;
}

export async function fetchDashboardMetrics(
  db: SupabaseClient,
  range: DateRange
): Promise<DashboardMetrics> {
  const rangeStartMs = new Date(range.start).getTime();
  const rangeEndMs = new Date(range.end).getTime();
  const isWithinRange = (createdAt: string) => {
    const ts = new Date(createdAt).getTime();
    return ts >= rangeStartMs && ts <= rangeEndMs;
  };

  // ── Query 1: eventos no período selecionado ──
  const { data: events, error } = await db
    .from('conversation_events')
    .select('id, conversation_id, event_type, created_at')
    .in('event_type', ['conversation_started', 'ai_started', 'ai_finished', 'human_started'])
    .gte('created_at', range.start)
    .lte('created_at', range.end)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const selectedEvents = events ?? [];

  // ── Backfill: traz baseline histórico para conversas com atividade no período ──
  const conversationIds = Array.from(new Set(selectedEvents.map((ev) => ev.conversation_id)));
  let historicalEvents: typeof selectedEvents = [];

  if (conversationIds.length > 0) {
    const { data: historyData, error: historyError } = await db
      .from('conversation_events')
      .select('id, conversation_id, event_type, created_at')
      .in('conversation_id', conversationIds)
      .in('event_type', ['conversation_started', 'ai_started', 'ai_finished', 'human_started'])
      .lt('created_at', range.start)
      .order('created_at', { ascending: true });

    if (historyError) throw new Error(historyError.message);
    historicalEvents = historyData ?? [];
  }

  const allEvents = [...historicalEvents, ...selectedEvents];

  // ── Query 2: últimos 7 dias (sempre, independente do filtro) ──
  const todayMidnight = getBrasiliaMidnightUTC();
  const todayEndUTC = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(todayMidnight.getTime() - 6 * 24 * 60 * 60 * 1000);

  const { data: weeklyEvents, error: weeklyError } = await db
    .from('conversation_events')
    .select('id, conversation_id, event_type, created_at')
    .in('event_type', ['conversation_started', 'human_started'])
    .gte('created_at', sevenDaysAgo.toISOString())
    .lte('created_at', todayEndUTC.toISOString())
    .order('created_at', { ascending: true });

  if (weeklyError) throw new Error(weeklyError.message);

  const toBrasilia = (ts: number) => new Date(ts - 3 * 60 * 60 * 1000);
  const findLatestBefore = (
    items: typeof allEvents,
    eventType: 'conversation_started' | 'ai_started' | 'ai_finished',
    limitTs: number,
  ) => {
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.event_type !== eventType) continue;
      if (new Date(item.created_at).getTime() <= limitTs) return item;
    }
    return null;
  };

  // ── Processar dados do período selecionado ──
  // Conta conversation_ids únicos no período (não depende apenas de conversation_started)
  const uniqueConversationsInRange = new Set(selectedEvents.map((ev) => ev.conversation_id));
  const totalAtendimentos = uniqueConversationsInRange.size;
  const hourCounts = new Map<number, number>();
  let lastTempoIA: { diff: number; timestamp: number } | null = null;
  let lastTempoEspera: { diff: number; timestamp: number } | null = null;

  // Para volume por hora, usa o primeiro evento de cada conversa no período
  const firstEventByConv = new Map<string, typeof selectedEvents[0]>();
  for (const ev of selectedEvents) {
    if (!firstEventByConv.has(ev.conversation_id)) {
      firstEventByConv.set(ev.conversation_id, ev);
    }
  }
  for (const [, ev] of firstEventByConv) {
    const ts = new Date(ev.created_at).getTime();
    const brasiliaDate = toBrasilia(ts);
    const hour = brasiliaDate.getUTCHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  if (allEvents.length > 0) {
    const byConversation = new Map<string, typeof allEvents>();
    for (const ev of allEvents) {
      const cid = ev.conversation_id;
      if (!byConversation.has(cid)) byConversation.set(cid, []);
      byConversation.get(cid)!.push(ev);
    }

    for (const [, evts] of byConversation) {
      const sorted = [...evts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Tempo Conversa IA: ai_started → ai_finished (fallback: conversation_started → ai_finished)
      const aiStarted = sorted.find((ev) => ev.event_type === 'ai_started');
      const firstAiFinished = sorted.find((ev) => ev.event_type === 'ai_finished');
      const convStarted = sorted.find((ev) => ev.event_type === 'conversation_started');
      const baselineEvent = aiStarted ?? convStarted;

      if (baselineEvent && firstAiFinished) {
        const startTime = new Date(baselineEvent.created_at).getTime();
        const endTime = new Date(firstAiFinished.created_at).getTime();
        const diff = (endTime - startTime) / 1000;
        if (diff > 0 && diff < 600) {
          const ts = endTime;
          if (!lastTempoIA || ts > lastTempoIA.timestamp) {
            lastTempoIA = { diff, timestamp: ts };
          }
        }
      }

      // Tempo até Atendimento Humano: último ai_finished → primeiro human_started
      const aiFinishedInRange = sorted.filter(
        (ev) => ev.event_type === 'ai_finished' && isWithinRange(ev.created_at),
      );
      const humanStartedInRange = sorted.filter(
        (ev) => ev.event_type === 'human_started' && isWithinRange(ev.created_at),
      );
      const lastAiFinished = aiFinishedInRange.length > 0 ? aiFinishedInRange[aiFinishedInRange.length - 1] : null;
      const firstHumanAfterAi = lastAiFinished
        ? humanStartedInRange.find((ev) => new Date(ev.created_at).getTime() > new Date(lastAiFinished.created_at).getTime())
        : null;

      if (lastAiFinished && firstHumanAfterAi) {
        const diff = (new Date(firstHumanAfterAi.created_at).getTime() - new Date(lastAiFinished.created_at).getTime()) / 1000;
        if (diff >= 0) {
          const ts = new Date(firstHumanAfterAi.created_at).getTime();
          if (!lastTempoEspera || ts > lastTempoEspera.timestamp) {
            lastTempoEspera = { diff, timestamp: ts };
          }
        }
      }
    }
  }

  // ── Fallback: se não encontrou pares no período, busca o último par válido de qualquer data ──
  // ── Fallback: se não encontrou pares no período, busca o último par válido de qualquer data ──
  if (!lastTempoEspera) {
    const { data: fallbackEvents } = await db
      .from('conversation_events')
      .select('conversation_id, event_type, created_at')
      .in('event_type', ['ai_finished', 'human_started'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (fallbackEvents && fallbackEvents.length > 0) {
      const fbByConv = new Map<string, typeof fallbackEvents>();
      for (const ev of fallbackEvents) {
        if (!fbByConv.has(ev.conversation_id)) fbByConv.set(ev.conversation_id, []);
        fbByConv.get(ev.conversation_id)!.push(ev);
      }

      for (const [, evts] of fbByConv) {
        const sorted = [...evts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const aiFinishedList = sorted.filter((ev) => ev.event_type === 'ai_finished');
        const humanStartedList = sorted.filter((ev) => ev.event_type === 'human_started');
        const lastAf = aiFinishedList.length > 0 ? aiFinishedList[aiFinishedList.length - 1] : null;
        const firstHa = lastAf
          ? humanStartedList.find((ev) => new Date(ev.created_at).getTime() > new Date(lastAf.created_at).getTime())
          : null;
        if (lastAf && firstHa) {
          const diff = (new Date(firstHa.created_at).getTime() - new Date(lastAf.created_at).getTime()) / 1000;
          const ts = new Date(firstHa.created_at).getTime();
          if (diff >= 0 && (!lastTempoEspera || ts > lastTempoEspera.timestamp)) {
            lastTempoEspera = { diff, timestamp: ts };
          }
        }
      }
    }
  }

  // ── Fallback tempo IA: busca último par válido de qualquer data ──
  if (!lastTempoIA) {
    const { data: fallbackIaEvents } = await db
      .from('conversation_events')
      .select('conversation_id, event_type, created_at')
      .in('event_type', ['conversation_started', 'ai_started', 'ai_finished'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (fallbackIaEvents && fallbackIaEvents.length > 0) {
      const fbByConv = new Map<string, typeof fallbackIaEvents>();
      for (const ev of fallbackIaEvents) {
        if (!fbByConv.has(ev.conversation_id)) fbByConv.set(ev.conversation_id, []);
        fbByConv.get(ev.conversation_id)!.push(ev);
      }

      for (const [, evts] of fbByConv) {
        const sorted = [...evts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const aiStarted = sorted.find((ev) => ev.event_type === 'ai_started');
        const convStarted = sorted.find((ev) => ev.event_type === 'conversation_started');
        const aiFinished = sorted.find((ev) => ev.event_type === 'ai_finished');
        const baseline = aiStarted ?? convStarted;
        if (baseline && aiFinished) {
          const diff = (new Date(aiFinished.created_at).getTime() - new Date(baseline.created_at).getTime()) / 1000;
          const ts = new Date(aiFinished.created_at).getTime();
          if (diff > 0 && diff < 600 && (!lastTempoIA || ts > lastTempoIA.timestamp)) {
            lastTempoIA = { diff, timestamp: ts };
          }
        }
      }
    }
  }


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

  const weeklyData: WeeklyDayData[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayMs = todayMidnight.getTime() - i * 24 * 60 * 60 * 1000;
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

  const allHours = Array.from(hourCounts.keys());
  const minHour = allHours.length > 0 ? Math.min(0, ...allHours) : 8;
  const maxHour = allHours.length > 0 ? Math.max(23, ...allHours) : 18;
  const volumePorHora: { hora: string; total: number }[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    volumePorHora.push({ hora: `${String(h).padStart(2, '0')}h`, total: hourCounts.get(h) ?? 0 });
  }

  

  let horarioPico: string | null = null;
  if (volumePorHora.length > 0) {
    const peak = volumePorHora.reduce((max, cur) => cur.total > max.total ? cur : max, volumePorHora[0]);
    horarioPico = peak.hora;
  }

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

  // ── Resumos enviados (filtrado por período) ──
  const { count: resumosCount, error: resumosError } = await db
    .from('metricas')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'resumo_enviado')
    .gte('created_at', range.start)
    .lte('created_at', range.end);

  const resumosEnviados = resumosError ? 0 : (resumosCount ?? 0);

  // ── Dados coletados (filtrado por período) ──
  const { data: dadosData, error: dadosError } = await db
    .from('metricas')
    .select('quantidade')
    .eq('tipo', 'dados_coletados')
    .gte('created_at', range.start)
    .lte('created_at', range.end);

  let dadosColetados = 0;
  let dadosColetadosAtendimentos = 0;
  if (!dadosError && dadosData) {
    dadosColetados = dadosData.reduce((acc: number, row: any) => acc + (row.quantidade || 0), 0);
    dadosColetadosAtendimentos = dadosData.length;
  }

  return {
    totalAtendimentos,
    volumePorHora,
    tempoConversaIaSeg: lastTempoIA ? lastTempoIA.diff : NaN,
    tempoEsperaHumanoSeg: lastTempoEspera ? lastTempoEspera.diff : NaN,
    tempoTotalSeg: (lastTempoIA ? lastTempoIA.diff : 0) + (lastTempoEspera ? lastTempoEspera.diff : 0) || NaN,
    weeklyData,
    horarioPico,
    variacaoSemanal,
    resumosEnviados,
    dadosColetados,
    dadosColetadosAtendimentos,
  };
}
