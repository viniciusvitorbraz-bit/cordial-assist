import { useEffect, useState } from 'react';
import { Settings, MessageCircle } from 'lucide-react';

declare global {
  interface Window {
    chatwootSettings?: {
      hideMessageBubble?: boolean;
      position?: string;
      locale?: string;
      type?: string;
    };
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: {
      toggle: (state?: string) => void;
      isOpen?: boolean;
    };
  }
}

interface ChatwootWidgetProps {
  websiteToken: string;
  baseUrl: string;
}

export default function ChatwootWidget({ websiteToken, baseUrl }: ChatwootWidgetProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!websiteToken || !baseUrl) return;

    // Remove existing script if any
    const existingScript = document.getElementById('chatwoot-sdk');
    if (existingScript) existingScript.remove();

    window.chatwootSettings = {
      hideMessageBubble: false,
      position: 'right',
      locale: 'pt_BR',
      type: 'standard',
    };

    const script = document.createElement('script');
    script.id = 'chatwoot-sdk';
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.onload = () => {
      window.chatwootSDK?.run({ websiteToken, baseUrl });
      setLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
      // Clean up chatwoot elements
      const bubble = document.querySelector('.woot-widget-bubble');
      const holder = document.querySelector('.woot-widget-holder');
      bubble?.remove();
      holder?.remove();
    };
  }, [websiteToken, baseUrl]);

  return null;
}

export function ChatwootConfig({
  onSave,
}: {
  onSave: (token: string, url: string) => void;
}) {
  const [token, setToken] = useState(() => localStorage.getItem('chatwoot_token') || '');
  const [url, setUrl] = useState(() => localStorage.getItem('chatwoot_url') || 'https://app.chatwoot.com');

  const handleSave = () => {
    localStorage.setItem('chatwoot_token', token);
    localStorage.setItem('chatwoot_url', url);
    onSave(token, url);
  };

  return (
    <div className="text-center p-8 max-w-md mx-auto">
      <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <MessageCircle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Configurar Widget Chatwoot</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Insira o <strong>Website Token</strong> do seu inbox no Chatwoot. Encontre-o em{' '}
        <em>Configurações → Inboxes → Configurações</em>.
      </p>
      <div className="space-y-3 text-left">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL da instância</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://app.chatwoot.com"
            className="w-full mt-1 px-4 py-2 border border-border bg-card rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website Token</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Ex: abc123def456"
            className="w-full mt-1 px-4 py-2 border border-border bg-card rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!token || !url}
          className="w-full mt-2 bg-primary text-primary-foreground py-2 rounded-[var(--radius)] text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Ativar Widget
        </button>
      </div>
    </div>
  );
}
