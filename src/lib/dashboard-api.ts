import { getApiUrl } from '@/lib/supabase-config';
import { type DateRangeKey } from '@/lib/dashboard-queries';

export interface ExternalDashboardMetrics {
  total_atendimentos: number;
  volume_por_hora: { hora: string; quantidade: number }[];
  tempo_medio_ia: number;
  tempo_medio_espera_humano: number;
  tempo_medio_resolucao: number;
}

/** Map DateRangeKey to start/end ISO date strings */
function getDateStrings(key: DateRangeKey): { start_date: string; end_date: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (key) {
    case 'Hoje':
      return { start_date: fmt(today), end_date: fmt(tomorrow) };
    case 'Ontem': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start_date: fmt(y), end_date: fmt(today) };
    }
    case 'Últimos 7 dias': {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      return { start_date: fmt(w), end_date: fmt(tomorrow) };
    }
    case 'Últimos 30 dias': {
      const m = new Date(today);
      m.setDate(m.getDate() - 30);
      return { start_date: fmt(m), end_date: fmt(tomorrow) };
    }
    default:
      return { start_date: fmt(today), end_date: fmt(tomorrow) };
  }
}

export async function fetchExternalDashboard(
  dateRange: DateRangeKey
): Promise<ExternalDashboardMetrics> {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error('API URL não configurada. Acesse Configurações.');

  const { start_date, end_date } = getDateStrings(dateRange);
  const url = `${apiUrl}/api/ai-dashboard?start_date=${start_date}&end_date=${end_date}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao consultar API de métricas.`);
  }

  const data: ExternalDashboardMetrics = await res.json();
  return data;
}
