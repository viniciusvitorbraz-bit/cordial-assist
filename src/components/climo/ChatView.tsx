import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, RefreshCw, User, ChevronLeft, X, Inbox, Loader2, Settings, AlertTriangle, Database, BotOff, Bot, Mic, Square, FileText, Search, Image, Paperclip } from 'lucide-react';
import { activeChats, chatHistoryMock } from '@/data/climo-data';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const N8N_WEBHOOK_URL = 'https://autopilot-n8n.rdhe1h.easypanel.host/webhook/toggle-ai';

interface Attachment {
  id: number;
  file_type: string;
  data_url: string;
  account_id?: number;
}

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
  custom_attributes?: {
    ai_status?: string;
    [key: string]: any;
  };
  created_at: number;
  last_activity_at: number;
  unread_count?: number;
}

interface Message {
  id: number;
  content: string;
  message_type: number;
  created_at: number;
  sender?: { name: string; thumbnail?: string };
  content_type?: string;
  attachments?: Attachment[];
}

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: 'open', cls: 'bg-climo-success/20 text-climo-success border border-climo-success/30' },
    pending: { label: 'pending', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
    resolved: { label: 'resolved', cls: 'bg-primary/20 text-primary border border-primary/30' },
    snoozed: { label: 'snoozed', cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  };
  return map[status] || { label: status, cls: 'bg-muted text-muted-foreground' };
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
  const [showConfig, setShowConfig] = useState(false);
  const [usingExampleData, setUsingExampleData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [aiPaused, setAiPaused] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const listRef = useRef<HTMLDivElement>(null);

  const callProxy = useCallback(async (endpoint: string, method = 'GET', body?: any) => {
    const { data, error } = await supabase.functions.invoke('chatwoot-proxy', {
      body: {
        endpoint,
        method,
        body,
        api_access_token: token,
        base_url: baseUrl.replace(/\/+$/, ''),
      },
    });
    if (error) throw new Error(error.message || 'Erro ao chamar proxy');
    if (data?.error) throw new Error(data.error);
    return data;
  }, [token, baseUrl]);

  // Fetch ALL conversations with pagination + retry logic
  const fetchConversations = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError('');
    setUsingExampleData(false);
    try {
      const allConversations: Conversation[] = [];
      let page = 1;
      let totalPages = Infinity;

      const fetchPageWithRetry = async (p: number, retries = 3): Promise<any> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            return await callProxy(`/api/v1/accounts/${accountId}/conversations?page=${p}`);
          } catch (err) {
            if (attempt === retries) throw err;
            // Wait before retrying (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      };

      while (page <= totalPages) {
        try {
          const data = await fetchPageWithRetry(page);
          const payload = data.data?.payload || [];
          const meta = data.data?.meta;
          
          if (meta?.all_count && totalPages === Infinity) {
            totalPages = Math.ceil(meta.all_count / 25);
          }

          allConversations.push(...payload);
          
          if (payload.length < 25) break;
          page++;
        } catch (pageErr) {
          console.warn(`Falha ao carregar página ${page}, usando dados parciais`, pageErr);
          break; // Stop pagination but keep what we have
        }
      }

      if (allConversations.length > 0) {
        setConversations(allConversations);
      } else {
        throw new Error('Nenhuma conversa carregada');
      }
    } catch (err: any) {
      let msg = err.message || 'Erro desconhecido';
      if (msg.includes('Failed to fetch') || msg.includes('FunctionsHttpError') || msg.includes('non-2xx') || msg.includes('dns error') || msg.includes('name resolution')) {
        msg = 'Erro de conexão com o servidor. Tente novamente em alguns segundos.';
      }
      setError(msg);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [connected, accountId, callProxy]);

  const fetchMessages = useCallback(async (convoId: number) => {
    if (usingExampleData) return;
    setLoadingMsgs(true);
    try {
      const data = await callProxy(`/api/v1/accounts/${accountId}/conversations/${convoId}/messages`);
      setMessages(data.payload || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, [accountId, callProxy, usingExampleData]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConvo || usingExampleData) return;
    setSending(true);
    try {
      await callProxy(
        `/api/v1/accounts/${accountId}/conversations/${selectedConvo.id}/messages`,
        'POST',
        { content: newMessage, message_type: 'outgoing' }
      );
      setNewMessage('');
      await fetchMessages(selectedConvo.id);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const toggleAi = async () => {
    if (!selectedConvo) return;
    if (!N8N_WEBHOOK_URL) {
      toast({ title: 'Webhook não configurado', description: 'Defina a constante N8N_WEBHOOK_URL.', variant: 'destructive' });
      return;
    }
    const currentStatus = selectedConvo.custom_attributes?.ai_status || 'active';
    const desiredStatus = currentStatus === 'paused' ? 'active' : 'paused';
    setAiPaused(desiredStatus === 'paused');
    setTogglingAi(true);
    toast({ title: 'Comando enviado', description: `Alternando IA para "${desiredStatus}" na conversa #${selectedConvo.id}…` });
    try {
      const { error } = await supabase.functions.invoke('n8n-proxy', {
        body: {
          webhook_url: N8N_WEBHOOK_URL,
          conversation_id: selectedConvo.id,
          account_id: Number(accountId),
          action: 'toggle_ai',
          current_status: currentStatus,
          desired_status: desiredStatus,
        },
      });
      if (error) throw error;
      setSelectedConvo(prev => prev ? { ...prev, custom_attributes: { ...prev.custom_attributes, ai_status: desiredStatus } } : prev);
    } catch (err: any) {
      setAiPaused(currentStatus === 'paused');
      toast({ title: 'Erro ao enviar para n8n', description: err.message || 'Verifique a URL do webhook.', variant: 'destructive' });
    } finally {
      setTogglingAi(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: 'Erro ao acessar microfone', description: 'Permita o acesso ao microfone.', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!selectedConvo || usingExampleData) return;
    setSendingAudio(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          await supabase.functions.invoke('chatwoot-proxy', {
            body: {
              endpoint: `/api/v1/accounts/${accountId}/conversations/${selectedConvo.id}/messages`,
              method: 'POST',
              body: { content: '', message_type: 'outgoing', attachments: [{ content: base64, encoding: 'base64', filename: 'audio.webm', content_type: 'audio/webm' }] },
              api_access_token: token,
              base_url: baseUrl.replace(/\/+$/, ''),
            },
          });
          await fetchMessages(selectedConvo.id);
          toast({ title: 'Áudio enviado com sucesso' });
        } catch (err: any) {
          toast({ title: 'Erro ao enviar áudio', description: err.message, variant: 'destructive' });
        } finally {
          setSendingAudio(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err: any) {
      toast({ title: 'Erro ao processar áudio', description: err.message, variant: 'destructive' });
      setSendingAudio(false);
    }
  };

  useEffect(() => { if (connected) fetchConversations(); }, [connected, fetchConversations]);
  useEffect(() => {
    if (selectedConvo) {
      fetchMessages(selectedConvo.id);
      setAiPaused(selectedConvo.custom_attributes?.ai_status === 'paused');
    }
  }, [selectedConvo, fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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

  const isAudioAttachment = (att: Attachment) => att.file_type === 'audio' || att.data_url?.match(/\.(ogg|mp3|wav|webm|mpeg|m4a)(\?|$)/i);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.meta?.sender?.name?.toLowerCase() || '';
    const phone = c.meta?.sender?.phone_number?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  // Virtual pagination: only render visibleCount items
  const visibleConversations = filteredConversations.slice(0, visibleCount);
  const hasMore = visibleCount < filteredConversations.length;

  // Reset visible count when search changes
  useEffect(() => { setVisibleCount(50); }, [searchQuery]);

  // Infinite scroll handler
  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount(prev => Math.min(prev + 50, filteredConversations.length));
    }
  }, [hasMore, filteredConversations.length]);

  // Message type label - matching reference: CONTATO (green), HUMANO (red/warm)
  const getMessageLabel = (msg: Message) => {
    if (msg.message_type === 0) return { text: 'CONTATO', cls: 'bg-climo-success/20 text-climo-success' };
    if (msg.message_type === 1) return { text: 'HUMANO', cls: 'bg-destructive/20 text-destructive' };
    return null;
  };

  // Count messages by type for the header stats
  const msgStats = {
    contato: messages.filter(m => m.message_type === 0).length,
    humano: messages.filter(m => m.message_type === 1).length,
    agente: messages.filter(m => m.message_type === 2).length,
  };

  // --- CONFIG SCREEN ---
  if (!connected) {
    return (
      <div className="h-[calc(100vh-120px)] border border-border rounded-xl bg-card/50 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Conectar ao Chatwoot</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Insira seus dados de acesso. O <strong>Token de acesso</strong> está em:<br />
            <em>Chatwoot → Perfil → Token de acesso</em>
          </p>
          <div className="space-y-3 text-left">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL da instância</label>
              <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://app.chatwoot.com"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-lg text-sm focus:border-primary focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID da Conta (Account ID)</label>
              <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Ex: 1"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-lg text-sm focus:border-primary focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Token de Acesso (API)</label>
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole seu token aqui"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-lg text-sm focus:border-primary focus:outline-none transition-colors" />
            </div>
            <button onClick={handleConnect} disabled={!baseUrl || !token || !accountId}
              className="w-full mt-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Conectar via API
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN CHAT INTERFACE ---
  return (
    <div className="h-[calc(100vh-120px)] border border-border rounded-xl bg-card flex overflow-hidden relative">
      {/* Sidebar - Conversations List */}
      <div className={`w-72 border-r border-border flex flex-col bg-card shrink-0 ${selectedConvo ? 'hidden md:flex' : 'flex'}`}>
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Count + actions */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {loading ? 'Carregando...' : `${filteredConversations.length} conversas`}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowConfig(true)} className="p-1 hover:bg-muted rounded-md transition-colors" title="Configurações">
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={fetchConversations} className="p-1 hover:bg-muted rounded-md transition-colors" title="Atualizar">
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleDisconnect} className="p-1 hover:bg-destructive/10 rounded-md transition-colors" title="Desconectar">
              <X className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto" ref={listRef} onScroll={handleListScroll}>
          {error && (
            <div className="p-3 space-y-2">
              <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">{error}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowConfig(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-colors">
                  <Settings className="w-3.5 h-3.5" /> Config
                </button>
                <button onClick={loadExampleData}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors">
                  <Database className="w-3.5 h-3.5" /> Exemplo
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
              <button onClick={loadExampleData} className="mt-2 text-xs text-primary hover:underline">Carregar dados de exemplo</button>
            </div>
          )}
          {visibleConversations.map((convo) => {
            const sender = convo.meta?.sender;
            const isSelected = selectedConvo?.id === convo.id;
            return (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={`w-full text-left px-3 py-3 border-b border-white/[0.03] hover:bg-muted/30 transition-colors ${
                  isSelected ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {sender?.thumbnail ? (
                      <img src={sender.thumbnail} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {(sender?.name || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{sender?.name || 'Sem nome'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{sender?.phone_number || ''}</p>
                  </div>
                </div>
              </button>
            );
          })}
          {hasMore && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-background ${!selectedConvo ? 'hidden md:flex' : 'flex'}`}>
        {selectedConvo ? (
          <>
            {/* Monitor Header */}
            <div className="p-4 border-b border-border bg-card/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedConvo(null)} className="md:hidden p-1 hover:bg-muted rounded-md">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="w-2.5 h-2.5 rounded-full bg-climo-success animate-pulse" />
                  <h3 className="text-sm font-bold text-foreground">Monitor de Conversa</h3>
                </div>
                <button onClick={() => fetchMessages(selectedConvo.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMsgs ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-xs font-medium text-foreground">
                  ✦ {selectedConvo.meta?.sender?.name || 'Sem nome'}
                </span>
                {selectedConvo.meta?.sender?.phone_number && (
                  <span className="inline-flex items-center px-2.5 py-1 bg-muted rounded-lg text-xs text-foreground">
                    {selectedConvo.meta.sender.phone_number}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 bg-muted rounded-lg text-xs text-muted-foreground">
                  Conv: #{selectedConvo.id}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusBadge(selectedConvo.status).cls}`}>
                  {statusBadge(selectedConvo.status).label}
                </span>
              </div>

              {/* AI toggle only */}
              <div className="flex items-center justify-end">
                <button
                  onClick={toggleAi}
                  disabled={togglingAi}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    aiPaused
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  }`}
                  title={aiPaused ? 'IA pausada — clique para retomar' : 'IA ativa — clique para pausar'}
                >
                  {togglingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : aiPaused ? <BotOff className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  {aiPaused ? 'Retomar IA' : 'Parar IA'}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMsgs && (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {messages.map((msg) => {
                const isOutgoing = msg.message_type === 1;
                const label = getMessageLabel(msg);
                return (
                  <div key={msg.id} className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
                    {/* Message type label */}
                    {label && (
                      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded mb-1 ${label.cls}`}>
                        {label.text}
                      </span>
                    )}
                    <div className="flex items-end gap-2">
                      {!isOutgoing && (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden mb-5">
                          {msg.sender?.thumbnail ? (
                            <img src={msg.sender.thumbnail} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isOutgoing
                          ? 'bg-primary/15 text-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}>
                        {/* Attachments */}
                        {msg.attachments?.map((att) => {
                          if (isAudioAttachment(att)) {
                            return (
                              <div key={att.id} className="mb-2">
                                <audio controls className="max-w-full h-10" preload="metadata">
                                  <source src={att.data_url} />
                                </audio>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Áudio</p>
                              </div>
                            );
                          }
                          if (att.file_type === 'image') {
                            return (
                              <a key={att.id} href={att.data_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                                <img src={att.data_url} alt="Anexo" className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />
                              </a>
                            );
                          }
                          if (att.file_type === 'file') {
                            return (
                              <a key={att.id} href={att.data_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2.5 mb-2 rounded-lg border border-border bg-background/50 hover:bg-muted transition-colors">
                                <FileText className="w-5 h-5 text-primary shrink-0" />
                                <span className="text-xs font-medium truncate text-foreground">Documento</span>
                              </a>
                            );
                          }
                          return null;
                        })}
                        {msg.content && <p>{msg.content}</p>}
                      </div>
                      {isOutgoing && (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden mb-5">
                          {msg.sender?.thumbnail ? (
                            <img src={msg.sender.thumbnail} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] text-muted-foreground mt-1 ${isOutgoing ? 'mr-9' : 'ml-9'}`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border bg-card/50">
              <p className="text-[10px] text-muted-foreground mb-2 ml-1">Enviar mensagem como humano</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Imagem">
                    <Image className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Anexo">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={sendingAudio || usingExampleData}
                    className={`p-2 rounded-lg transition-colors ${
                      isRecording ? 'bg-destructive text-destructive-foreground animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    } disabled:opacity-50`}
                    title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                  >
                    {sendingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {isRecording && (
                <p className="text-[10px] text-destructive mt-1 animate-pulse ml-1">🔴 Gravando áudio… clique no ■ para parar</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Send className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Por favor, selecione uma conversa no painel da esquerda</p>
            </div>
          </div>
        )}
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowConfig(false)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">Configurações de API</h3>
              <button onClick={() => setShowConfig(false)} className="p-1 hover:bg-muted rounded-md"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL da instância</label>
              <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value.replace(/\/+$/, ''))} placeholder="https://app.chatwoot.com"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID da Conta</label>
              <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Ex: 1"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Token de Acesso</label>
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole seu token aqui"
                className="w-full mt-1 px-4 py-2.5 border border-border bg-background rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
            <button onClick={handleConnect} disabled={!baseUrl || !token || !accountId}
              className="w-full mt-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
