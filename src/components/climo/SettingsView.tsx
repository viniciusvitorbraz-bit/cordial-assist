import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseConfig, saveSupabaseConfig } from '@/lib/supabase-config';

export default function SettingsView() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (config) {
      setUrl(config.url);
      setAnonKey(config.anonKey);
    }
  }, []);

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) return;
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5" /> Configurações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações de integração do sistema.</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Conexão com Banco de Dados</h3>
            <p className="text-xs text-muted-foreground">Insira a URL e Anon Key do seu projeto Supabase externo onde as métricas estão armazenadas.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">URL do Projeto</Label>
            <Input
              id="supabase-url"
              placeholder="https://xxxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-key">Anon Key</Label>
            <Input
              id="supabase-key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!url.trim() || !anonKey.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Salvar Configuração
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-primary">
              <CheckCircle2 className="w-4 h-4" /> Salvo com sucesso!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
