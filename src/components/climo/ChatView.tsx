import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, RefreshCw, User, Clock, ChevronLeft, X, Inbox, Loader2, Settings, AlertTriangle, Database } from 'lucide-react';
import { activeChats, chatHistoryMock } from '@/data/climo-data';

interface Conversation {
  id: number;
  inbox_id: number;
  status: string;
  messages: Message[];
  meta: {
    sender?: {
      name: string;
      email?: string;
      phone_number?: string;
      thumbnail?: string;
    };
  };
  created_at: number;
  last_activity_at: number;
  unread_count?: number;
}

interface Message {
  id: number;
  content: string;
  message_type: number; // 0=incoming, 1=outgoing
  created_at: number;
  sender?: { name: string; thumbnail?: string };
  content_type?: string;
}

function timeAgo(timestamp: number) {
  const diff = Math.floor((Date.now() / 1000) - timestamp);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    open: { label: 'Aberta', color: 'bg-green-500' },
    pending: { label: 'Pendente', color: 'bg-yellow-500' },
    resolved: { label: 'Resolvida', color: 'bg-blue-500' },
    snoozed: { label: 'Adiada', color: 'bg-orange-500' },
  };
  return map[status] || { label: status, color: 'bg-muted' };
}

export default function ChatView() {
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('chatwoot_url') || '');
  const [token, setToken] = useState(() => localStorage.getItem('chatwoot_api_token') || '');
  const [accountId, setAccountId] = useState(() => localStorage.getItem('chatwoot_account_id') || '');
  const [connected, setConnected] = useState(() => !!(localStorage.getItem('chatwoot_api_token') && localStorage.getItem('chatwoot_url') && localStorage.getItem('chatwoot_account_id')));

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'open' | 'pending' | 'resolved' | 'all'>('open');
  const [showConfig, setShowConfig] = useState(false);
  const [usingExampleData, setUsingExampleData] = useState(false);

  const apiHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'api_access_token': token,
  }), [token]);

  const apiBase = useCallback(() => {
    return `${baseUrl.replace(/\/+$/, '')}/api/v1/accounts/${accountId}`;
  }, [baseUrl, accountId]);

  const fetchConversations = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError('');
    setUsingExampleData(false);
    try {
      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const res = await fetch(`${apiBase()}/conversations?page=1${statusParam}`, {
        headers: apiHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Erro 401: Token de acesso inválido. Verifique nas configurações.');
        if (res.status === 404) throw new Error('Erro 404: URL ou Account ID incorretos. Verifique nas configurações.');
        const errorText = await res.text();
        throw new Error(`Erro ${res.status}: ${errorText || res.statusText}`);
      }
      const data = await res.json();
      setConversations(data.data?.payload || []);
    } catch (err: any) {
      let msg = err.message || 'Erro desconhecido';
      if (msg.includes('Failed to fetch')) {
        msg = 'Erro de conexão: Verifique se a URL está correta, se o servidor está acessível, ou se há bloqueio de CORS.';
      }
      setError(msg);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [connected, filter, apiBase, apiHeaders]);

  const fetchMessages = useCallback(async (convoId: number) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`${apiBase()}/conversations/${convoId}/messages`, {
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error('Erro ao carregar mensagens');
      const data = await res.json();
      setMessages(data.payload || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, [apiBase, apiHeaders]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConvo) return;
    setSending(true);
    try {
      await fetch(`${apiBase()}/conversations/${selectedConvo.id}/messages`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ content: newMessage, message_type: 'outgoing' }),
      });
      setNewMessage('');
      await fetchMessages(selectedConvo.id);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (connected) fetchConversations();
  }, [connected, fetchConversations]);

  useEffect(() => {
    if (selectedConvo) fetchMessages(selectedConvo.id);
  }, [selectedConvo, fetchMessages]);

  const handleConnect = () => {
    if (!baseUrl || !token || !accountId) return;
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    localStorage.setItem('chatwoot_url', cleanUrl);
    localStorage.setItem('chatwoot_api_token', token);
    localStorage.setItem('chatwoot_account_id', accountId);
    setBaseUrl(cleanUrl);
    setConnected(true);
    setShowConfig(false);
    setUsingExampleData(false);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('chatwoot_url');
    localStorage.removeItem('chatwoot_api_token');
    localStorage.removeItem('chatwoot_account_id');
    setConnected(false);
    setConversations([]);
    setSelectedConvo(null);
    setMessages([]);
    setToken('');
    setBaseUrl('');
    setAccountId('');
    setUsingExampleData(false);
  };

  const loadExampleData = () => {
    setUsingExampleData(true);
    setError('');
    const exampleConvos: Conversation[] = activeChats.map((c, i) => ({
      id: c.id,
      inbox_id: 1,
      status: c.status === 'bot' ? 'open' : 'pending',
      messages: [{ id: i, content: c.lastMsg, message_type: 0, created_at: Date.now() / 1000 }],
      meta: { sender: { name: c.name } },
      created_at: Date.now() / 1000,
      last_activity_at: Date.now() / 1000,
      unread_count: c.unread,
    }));
    setConversations(exampleConvos);
    setMessages(chatHistoryMock.map((m, i) => ({
      id: i,
      content: m.text,
      message_type: m.sender === 'user' ? 0 : 1,
      created_at: Date.now() / 1000,
    })));
  };

  // --- CONFIG SCREEN ---
  if (!connected) {
    return (
      <div className="h-[calc(100vh-180px)] border border-border rounded-lg bg-muted/20 flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Conectar ao Chatwoot</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Insira seus dados de acesso. O <strong>Token de acesso</strong> está em:<br />
            <em>Chatwoot → Perfil → Token de acesso</em>
          </p>
          <div className="space-y-3 text-left">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL da instância</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://app.chatwoot.com"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-card rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID da Conta (Account ID)</label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Ex: 1"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-card rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Veja na URL do Chatwoot: app.chatwoot.com/app/accounts/<strong>1</strong>/...</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Token de Acesso (API)</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole seu token aqui"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-card rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={!baseUrl || !token || !accountId}
              className="w-full mt-2 bg-primary text-primary-foreground py-2.5 rounded-[var(--radius)] text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Conectar via API
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN CHAT INTERFACE ---
  return (
    <div className="h-[calc(100vh-180px)] border border-border rounded-lg bg-card flex overflow-hidden relative">
      {/* Sidebar - Conversations List */}
      <div className={`w-80 border-r border-border flex flex-col bg-muted/20 shrink-0 ${selectedConvo ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Conversas</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowConfig(true)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Configurações de API">
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={fetchConversations} className="p-1.5 hover:bg-muted rounded transition-colors" title="Atualizar">
                <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={handleDisconnect} className="p-1.5 hover:bg-destructive/10 rounded transition-colors" title="Desconectar">
                <X className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          </div>
          {/* Filters */}
          <div className="flex gap-1">
            {(['open', 'pending', 'resolved', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
                  filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f === 'open' ? 'Abertas' : f === 'pending' ? 'Pendentes' : f === 'resolved' ? 'Resolvidas' : 'Todas'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 space-y-2">
              <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-[var(--radius)]">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">{error}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfig(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] text-xs font-medium hover:opacity-90 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configurações de API
                </button>
                <button
                  onClick={loadExampleData}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-[var(--radius)] text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  Dados de Exemplo
                </button>
              </div>
            </div>
          )}
          {loading && !conversations.length && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && !conversations.length && !error && (
            <div className="text-center p-8 text-muted-foreground">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Nenhuma conversa encontrada</p>
              <button onClick={loadExampleData} className="mt-2 text-xs text-primary hover:underline">
                Carregar dados de exemplo
              </button>
            </div>
          )}
          {conversations.map((convo) => {
            const sender = convo.meta?.sender;
            const st = statusLabel(convo.status);
            return (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                  selectedConvo?.id === convo.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {sender?.thumbnail ? (
                      <img src={sender.thumbnail} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {sender?.name || `#${convo.id}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(convo.last_activity_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${st.color}`} />
                      <span className="text-[10px] text-muted-foreground">{st.label}</span>
                      {sender?.phone_number && (
                        <span className="text-[10px] text-muted-foreground truncate">· {sender.phone_number}</span>
                      )}
                    </div>
                    {convo.messages?.[0]?.content && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">{convo.messages[0].content}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedConvo ? 'hidden md:flex' : 'flex'}`}>
        {selectedConvo ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-border flex items-center gap-3">
              <button onClick={() => setSelectedConvo(null)} className="md:hidden p-1 hover:bg-muted rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {selectedConvo.meta?.sender?.thumbnail ? (
                  <img src={selectedConvo.meta.sender.thumbnail} className="w-full h-full object-cover" alt="" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{selectedConvo.meta?.sender?.name || `Conversa #${selectedConvo.id}`}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedConvo.meta?.sender?.phone_number || selectedConvo.meta?.sender?.email || `ID: ${selectedConvo.id}`}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusLabel(selectedConvo.status).color} text-white`}>
                {statusLabel(selectedConvo.status).label}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs && (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {messages.map((msg) => {
                const isOutgoing = msg.message_type === 1;
                return (
                  <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                      isOutgoing
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      {msg.content && <p>{msg.content}</p>}
                      <span className={`text-[9px] mt-1 block ${isOutgoing ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-3 py-2 border border-border bg-background rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowConfig(false)}>
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">Configurações de API</h3>
              <button onClick={() => setShowConfig(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL da instância</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value.replace(/\/+$/, ''))}
                placeholder="https://app.chatwoot.com"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID da Conta</label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Ex: 1"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Token de Acesso</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole seu token aqui"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={!baseUrl || !token || !accountId}
              className="w-full mt-2 bg-primary text-primary-foreground py-2.5 rounded-[var(--radius)] text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Salvar e Reconectar
            </button>
          </div>
        </div>
      )}

      {/* Example data banner */}
      {usingExampleData && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-accent text-accent-foreground text-[10px] px-3 py-1 rounded-full font-medium shadow">
          📋 Dados de exemplo — conecte à API para dados reais
        </div>
      )}
    </div>
  );
}
