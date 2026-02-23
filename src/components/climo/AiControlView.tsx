import { useState, useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AiControlView() {
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('bot_control')
        .select('ai_enabled')
        .eq('id', 1)
        .maybeSingle();
      if (!error && data) {
        setAiEnabled(data.ai_enabled);
      } else {
        // Registro não existe, criar com valor padrão
        const { data: inserted, error: insertError } = await supabase
          .from('bot_control')
          .upsert({ id: 1, ai_enabled: true })
          .select('ai_enabled')
          .maybeSingle();
        if (!insertError && inserted) {
          setAiEnabled(inserted.ai_enabled);
        } else {
          setAiEnabled(true);
        }
      }
    };
    fetchStatus();
  }, []);

  const toggle = async () => {
    if (aiEnabled === null) return;
    const newValue = !aiEnabled;
    setLoading(true);

    const { error } = await supabase
      .from('bot_control')
      .update({ ai_enabled: newValue })
      .eq('id', 1);

    if (error) {
      toast.error('Erro ao atualizar status da IA');
    } else {
      setAiEnabled(newValue);
      toast.success(newValue ? 'IA ativada' : 'IA pausada');
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
            {aiEnabled === null ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                aiEnabled
                  ? 'bg-chart-3/10 text-chart-3 border-chart-3/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              }`}>
                {aiEnabled ? 'IA ATIVA' : 'IA PAUSADA'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            <Switch
              checked={aiEnabled ?? false}
              onCheckedChange={toggle}
              disabled={aiEnabled === null || loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
