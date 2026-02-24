import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiUrl, saveApiUrl } from '@/lib/supabase-config';

export default function SettingsView() {
  const [apiUrl, setApiUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const url = getApiUrl();
    if (url) setApiUrl(url);
  }, []);

  const handleSave = () => {
    if (!apiUrl.trim()) return;
    saveApiUrl(apiUrl.trim());
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
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">API de Métricas</h3>
            <p className="text-xs text-muted-foreground">Insira a URL base da API externa que fornece as métricas do dashboard.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">URL da API</Label>
            <Input
              id="api-url"
              placeholder="https://sua-api.com"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">O dashboard fará requisições para <code className="text-xs bg-muted px-1 py-0.5 rounded">{apiUrl || '...'}/api/ai-dashboard</code></p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!apiUrl.trim()}
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
