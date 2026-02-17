import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, RefreshCw, User, Clock, ChevronLeft, X, Inbox, Loader2, Settings, AlertTriangle, Database, BotOff, Bot, Mic, MicOff, Square, FileText } from 'lucide-react';
import { activeChats, chatHistoryMock } from '@/data/climo-data';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// ========== CONFIGURE SUA URL DO WEBHOOK N8N AQUI ==========
const N8N_WEBHOOK_URL = 'https://autopilot-n8n.rdhe1h.easypanel.host/webhook/toggle-ai';
// ===========================================================


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

  // N8N AI toggle state
  const [aiPaused, setAiPaused] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const fetchConversations = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError('');
    setUsingExampleData(false);
    try {
      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const data = await callProxy(`/api/v1/accounts/${accountId}/conversations?page=1${statusParam}`);
      setConversations(data.data?.payload || []);
    } catch (err: any) {
      let msg = err.message || 'Erro desconhecido';
      if (msg.includes('Failed to fetch') || msg.includes('FunctionsHttpError')) {
        msg = 'Erro de conexão com o proxy. Verifique se a URL e o Token estão corretos nas configurações.';
      }
      setError(msg);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [connected, filter, accountId, callProxy]);

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

  // ---- N8N AI Toggle ----
  const toggleAi = async () => {
    if (!selectedConvo) return;
    if (!N8N_WEBHOOK_URL) {
      toast({
        title: 'Webhook não configurado',
        description: 'Defina a constante N8N_WEBHOOK_URL no código do ChatView.',
        variant: 'destructive',
      });
      return;
    }

    const currentStatus = selectedConvo.custom_attributes?.ai_status || 'active';
    const desiredStatus = currentStatus === 'paused' ? 'active' : 'paused';

    // Optimistic update
    setAiPaused(desiredStatus === 'paused');
    setTogglingAi(true);
    toast({
      title: 'Comando enviado',
      description: `Alternando IA para "${desiredStatus}" na conversa #${selectedConvo.id}…`,
    });

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
      // Update the local conversation object so switching away and back keeps state
      setSelectedConvo(prev => prev ? {
        ...prev,
        custom_attributes: { ...prev.custom_attributes, ai_status: desiredStatus },
      } : prev);
    } catch (err: any) {
      // Revert optimistic update
      setAiPaused(currentStatus === 'paused');
      toast({
        title: 'Erro ao enviar para n8n',
        description: err.message || 'Verifique a URL do webhook.',
        variant: 'destructive',
      });
    } finally {
      setTogglingAi(false);
    }
  };

  // ---- Audio Recording ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({
        title: 'Erro ao acessar microfone',
        description: 'Permita o acesso ao microfone no navegador.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!selectedConvo || usingExampleData) return;
    setSendingAudio(true);
    try {
      const formData = new FormData();
      formData.append('attachments[]', audioBlob, 'audio.webm');
      formData.append('message_type', 'outgoing');
      formData.append('content', '');

      const cleanBase = baseUrl.replace(/\/+$/, '');
      const endpoint = `${cleanBase}/api/v1/accounts/${accountId}/conversations/${selectedConvo.id}/messages`;

      // For file uploads we call the Chatwoot API directly through the proxy edge function
      // but since FormData can't be JSON-serialized, we use a direct fetch through the proxy
      // by sending the audio as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          await supabase.functions.invoke('chatwoot-proxy', {
            body: {
              endpoint: `/api/v1/accounts/${accountId}/conversations/${selectedConvo.id}/messages`,
              method: 'POST',
              body: {
                content: '',
                message_type: 'outgoing',
                attachments: [{
                  content: base64,
                  encoding: 'base64',
                  filename: 'audio.webm',
                  content_type: 'audio/webm',
                }],
              },
              api_access_token: token,
              base_url: baseUrl.replace(/\/+$/, ''),
            },
          });
          await fetchMessages(selectedConvo.id);
          toast({ title: 'Áudio enviado com sucesso' });
        } catch (err: any) {
          toast({
            title: 'Erro ao enviar áudio',
            description: err.message,
            variant: 'destructive',
          });
        } finally {
          setSendingAudio(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err: any) {
      toast({
        title: 'Erro ao processar áudio',
        description: err.message,
        variant: 'destructive',
      });
      setSendingAudio(false);
    }
  };

  useEffect(() => {
    if (connected) fetchConversations();
  }, [connected, fetchConversations]);

  useEffect(() => {
    if (selectedConvo) {
      fetchMessages(selectedConvo.id);
      // Sync AI state from conversation's custom_attributes
      const status = selectedConvo.custom_attributes?.ai_status;
      setAiPaused(status === 'paused');
    }
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

  // Helper to check if attachment is audio
  const isAudioAttachment = (att: Attachment) => {
    return att.file_type === 'audio' || att.data_url?.match(/\.(ogg|mp3|wav|webm|mpeg|m4a)(\?|$)/i);
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

              {/* AI Toggle Button */}
              <button
                onClick={toggleAi}
                disabled={togglingAi}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                  aiPaused
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                }`}
                title={aiPaused ? 'IA pausada — clique para retomar' : 'IA ativa — clique para pausar'}
              >
                {togglingAi ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : aiPaused ? (
                  <BotOff className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
                {aiPaused ? 'Retomar IA' : 'Parar IA'}
              </button>

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
                      {/* Render attachments */}
                      {msg.attachments?.map((att) => {
                        if (isAudioAttachment(att)) {
                          return (
                            <audio key={att.id} controls className="mb-1 max-w-full" preload="metadata">
                              <source src={att.data_url} />
                              Seu navegador não suporta áudio.
                            </audio>
                          );
                        }
                        if (att.file_type === 'image') {
                          return (
                            <a key={att.id} href={att.data_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                              <img
                                src={att.data_url}
                                alt="Anexo"
                                className="max-w-full rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </a>
                          );
                        }
                        if (att.file_type === 'file') {
                          return (
                            <a
                              key={att.id}
                              href={att.data_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 p-2 mb-1 rounded-md border transition-colors ${
                                isOutgoing
                                  ? 'bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground'
                                  : 'bg-background border-border hover:bg-accent text-foreground'
                              }`}
                            >
                              <FileText className={`w-5 h-5 shrink-0 ${isOutgoing ? 'text-primary-foreground' : 'text-primary'}`} />
                              <span className="text-xs font-medium truncate">
                                {att.data_url?.split('/').pop()?.split('?')[0] || 'Visualizar Documento'}
                              </span>
                            </a>
                          );
                        }
                        return null;
                      })}
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
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-3 py-2 border border-border bg-background rounded-[var(--radius)] text-sm focus:border-primary focus:outline-none"
                />
                {/* Mic button */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={sendingAudio || usingExampleData}
                  className={`p-2 rounded-[var(--radius)] transition-colors ${
                    isRecording
                      ? 'bg-destructive text-destructive-foreground animate-pulse'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  } disabled:opacity-50`}
                  title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                >
                  {sendingAudio ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {isRecording && (
                <p className="text-[10px] text-destructive mt-1 animate-pulse">🔴 Gravando áudio… clique no ■ para parar</p>
              )}
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
