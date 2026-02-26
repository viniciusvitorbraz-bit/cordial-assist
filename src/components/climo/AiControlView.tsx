import { useState, useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createDynamicSupabaseClient } from '@/lib/supabase-config';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AiControlView() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const client = createDynamicSupabaseClient();
      if (!client) { setLoading(false); return; }
      const { data } = await client
        .from('app_config')
        .select('ia_ativa')
        .eq('id', 1)
        .maybeSingle();
      if (data) setAiEnabled(data.ia_ativa);
      setLoading(false);
    };
    fetchStatus();
  }, []);

  const toggle = async () => {
    const newValue = !aiEnabled;
    setLoading(true);

    try {
      await supabase.functions.invoke('n8n-proxy', {
        body: {
          webhook_url: 'https://autopilot-n8n.rdhe1h.easypanel.host/webhook/uazapi',
          controle_ia: newValue,
        },
      });

      const client = createDynamicSupabaseClient();
      if (client) {
        await client
          .from('app_config')
          .update({ ia_ativa: newValue })
          .eq('id', 1);
      }

      setAiEnabled(newValue);
      toast.success(newValue ? 'IA ativada' : 'IA pausada');
    } catch (err) {
      console.error('Erro ao notificar webhook:', err);
      toast.error('Erro ao alterar status da IA');
    }

    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-card border border-border rounded-lg shadow-climo-sm p-4">
        <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Controle da IA</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                aiEnabled
                  ? 'bg-chart-3/10 text-chart-3 border-chart-3/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              }`}>
                {aiEnabled ? 'IA ATIVA' : 'IA PAUSADA'}
              </span>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            <Switch
              checked={aiEnabled}
              onCheckedChange={toggle}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
