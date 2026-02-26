import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, AlertTriangle, Users } from 'lucide-react';
import { createDynamicSupabaseClient } from '@/lib/supabase-config';
import { Input } from '@/components/ui/input';

interface Cliente {
  id: string;
  telefone: string;
  nome: string;
  status: string | null;
  created_at: string;
  dynamicStatus?: 'ai_started' | 'ai_finished' | 'human_started' | null;
}

interface ConversationEvent {
  phone: string | null;
  conversation_id: string;
  event_type: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  ai_started:    { label: 'Atendimento IA',     bg: 'bg-blue-500/10',   text: 'text-blue-500' },
  ai_finished:   { label: 'Aguardando Humano',  bg: 'bg-yellow-500/10', text: 'text-yellow-600' },
  human_started: { label: 'Finalizado',         bg: 'bg-green-500/10',  text: 'text-green-600' },
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 12) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export default function ClientesView() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = createDynamicSupabaseClient();
      if (!db) { setError('Banco de dados não configurado.'); setLoading(false); return; }

      const { data, error: dbError } = await db
        .from('clientes_atendimento')
        .select('id, telefone, nome, status, created_at')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // Step 1: Get phone → conversation_id mapping from ai_events
      const { data: aiEvents, error: aiErr } = await db
        .from('ai_events')
        .select('phone, conversation_id')
        .not('phone', 'is', null);

      console.log('[Clientes] ai_events:', aiEvents, 'error:', aiErr);

      // Normalize phone: keep only last 10-11 digits for matching
      const normalizePhone = (p: string) => {
        const digits = p.replace(/\D/g, '');
        // If has country code (55), strip it for matching
        return digits.length >= 12 ? digits.slice(-11) : digits.length === 11 ? digits : digits;
      };

      // Build phone → conversation_id map (using normalized phone)
      const phoneToConvMap = new Map<string, string>();
      if (aiEvents) {
        for (const ev of aiEvents) {
          const phone = normalizePhone((ev.phone as string) ?? '');
          if (phone && ev.conversation_id) {
            phoneToConvMap.set(phone, ev.conversation_id);
          }
        }
      }
      console.log('[Clientes] phoneToConvMap:', Object.fromEntries(phoneToConvMap));

      // Step 2: Get latest status events from conversation_events
      const { data: convEvents, error: convErr } = await db
        .from('conversation_events')
        .select('conversation_id, event_type, created_at')
        .in('event_type', ['ai_started', 'ai_finished', 'human_started'])
        .order('created_at', { ascending: false });

      console.log('[Clientes] conversation_events:', convEvents, 'error:', convErr);

      // Build conversation_id → latest event_type map
      const convStatusMap = new Map<string, string>();
      if (convEvents) {
        for (const ev of convEvents as any[]) {
          if (!convStatusMap.has(ev.conversation_id)) {
            convStatusMap.set(ev.conversation_id, ev.event_type);
          }
        }
      }

      // Step 3: Enrich clients with dynamic status
      const enriched = (data ?? []).map((c: any) => {
        const normalized = normalizePhone(c.telefone ?? '');
        const convId = phoneToConvMap.get(normalized);
        const status = convId ? convStatusMap.get(convId) ?? null : null;
        console.log('[Clientes] client:', c.nome, 'phone:', c.telefone, 'normalized:', normalized, 'convId:', convId, 'status:', status);
        return { ...c, dynamicStatus: status };
      });

      setClientes(enriched);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao buscar clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (c.nome?.toLowerCase().includes(q)) || (c.telefone?.includes(q));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando clientes…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertTriangle className="w-6 h-6" />
        <p className="text-sm">{error}</p>
        <button onClick={fetchClientes} className="text-xs underline hover:no-underline">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Clientes</h2>
            <p className="text-xs text-muted-foreground">{clientes.length} contato{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Telefone</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Data do Contato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                    {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente registrado.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{c.nome || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{formatPhone(c.telefone)}</td>
                    <td className="px-4 py-3">
                      {c.dynamicStatus && STATUS_MAP[c.dynamicStatus] ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_MAP[c.dynamicStatus].bg} ${STATUS_MAP[c.dynamicStatus].text}`}>
                          {STATUS_MAP[c.dynamicStatus].label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
