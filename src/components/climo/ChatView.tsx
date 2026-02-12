import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatwootWidget, { ChatwootConfig } from './ChatwootWidget';

export default function ChatView() {
  const [widgetToken, setWidgetToken] = useState(() => localStorage.getItem('chatwoot_token') || '');
  const [widgetBaseUrl, setWidgetBaseUrl] = useState(() => localStorage.getItem('chatwoot_url') || '');

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="h-[calc(100vh-180px)] border border-border rounded-lg bg-muted/20 flex flex-col items-center justify-center overflow-hidden">
        {widgetToken ? (
          <div className="w-full h-full flex items-center justify-center">
            <ChatwootWidget websiteToken={widgetToken} baseUrl={widgetBaseUrl} />
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Widget Ativo</h3>
              <p className="text-sm text-muted-foreground mb-4">O widget do Chatwoot está ativo no canto inferior direito da tela.</p>
              <button
                onClick={() => { setWidgetToken(''); setWidgetBaseUrl(''); localStorage.removeItem('chatwoot_token'); localStorage.removeItem('chatwoot_url'); }}
                className="text-xs text-destructive hover:underline"
              >
                Desconectar widget
              </button>
            </div>
          </div>
        ) : (
          <ChatwootConfig onSave={(token, url) => { setWidgetToken(token); setWidgetBaseUrl(url); }} />
        )}
      </div>
    </div>
  );
}
