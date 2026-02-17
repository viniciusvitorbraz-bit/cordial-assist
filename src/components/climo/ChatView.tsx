import { useState } from 'react';
import { MessageCircle, ExternalLink, X } from 'lucide-react';

export default function ChatView() {
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('chatwoot_url') || '');
  const [connected, setConnected] = useState(() => !!localStorage.getItem('chatwoot_url'));

  const handleConnect = () => {
    if (!baseUrl) return;
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    localStorage.setItem('chatwoot_url', cleanUrl);
    setBaseUrl(cleanUrl);
    setConnected(true);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('chatwoot_url');
    setBaseUrl('');
    setConnected(false);
  };

  if (!connected) {
    return (
      <div className="h-[calc(100vh-180px)] border border-border rounded-lg bg-muted/20 flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Conectar ao Chatwoot</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Insira a URL da sua instância do Chatwoot para acessar o painel de atendimento diretamente aqui.
          </p>
          <div className="space-y-3 text-left">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL da instância Chatwoot</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://app.chatwoot.com"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-card rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={!baseUrl}
              className="w-full mt-2 bg-primary text-primary-foreground py-2.5 rounded-[var(--radius)] text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Conectar
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Você fará login normalmente no Chatwoot dentro do painel embutido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Conectado a <strong className="text-foreground">{baseUrl}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Abrir em nova aba
          </a>
          <button
            onClick={handleDisconnect}
            className="text-xs text-destructive hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Desconectar
          </button>
        </div>
      </div>
      <iframe
        src={baseUrl}
        className="w-full flex-1 border border-border rounded-lg bg-card"
        title="Chatwoot"
        allow="camera; microphone; clipboard-write"
      />
    </div>
  );
}
