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

      // Fetch conversation events to determine dynamic status
      const { data: events } = await db
        .from('conversation_events')
        .select('phone, conversation_id, event_type, created_at')
        .in('event_type', ['ai_started', 'ai_finished', 'human_started'])
        .order('created_at', { ascending: false });

      // Build a map: phone → latest relevant event_type
      const phoneStatusMap = new Map<string, string>();
      if (events) {
        for (const ev of events as ConversationEvent[]) {
          const phone = ev.phone?.replace(/\D/g, '');
          if (phone && !phoneStatusMap.has(phone)) {
            phoneStatusMap.set(phone, ev.event_type);
          }
        }
      }

      const enriched = (data ?? []).map((c: any) => {
        const digits = c.telefone?.replace(/\D/g, '') ?? '';
        return { ...c, dynamicStatus: phoneStatusMap.get(digits) ?? null };
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
