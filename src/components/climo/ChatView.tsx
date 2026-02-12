import { useState } from 'react';
import { Search, Building2, BrainCircuit, Globe, MoreVertical } from 'lucide-react';
import { activeChats, chatHistoryMock, type ChatContact } from '@/data/climo-data';

export default function ChatView() {
  const [selectedChat, setSelectedChat] = useState<ChatContact>(activeChats[0]);
  const [isHumanHandling, setIsHumanHandling] = useState(false);
  const [chatMode, setChatMode] = useState<'custom' | 'iframe'>('custom');
  const [chatwootUrl, setChatwootUrl] = useState('');

  const handleChatSelect = (chat: ChatContact) => {
    setSelectedChat(chat);
    setIsHumanHandling(chat.status === 'human');
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center bg-card p-3 border border-border rounded-lg shadow-climo-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChatMode('custom')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${chatMode === 'custom' ? 'bg-muted text-foreground border border-border' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <BrainCircuit className="w-4 h-4" /> Layout Climo AI
          </button>
          <button
            onClick={() => setChatMode('iframe')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${chatMode === 'iframe' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Globe className="w-4 h-4" /> Chatwoot Real
          </button>
        </div>
        {chatMode === 'iframe' && (
          <input
            type="text"
            placeholder="Cole a URL..."
            value={chatwootUrl}
            onChange={(e) => setChatwootUrl(e.target.value)}
            className="px-3 py-1.5 text-xs border border-border bg-background rounded-sm w-64 focus:outline-none focus:border-primary"
          />
        )}
      </div>

      {chatMode === 'custom' ? (
        <div className="h-[calc(100vh-220px)] flex border border-border rounded-lg bg-card overflow-hidden shadow-climo-sm">
          {/* Chat list */}
          <div className="w-80 border-r border-border flex flex-col bg-muted/30">
            <div className="p-3 border-b border-border bg-card">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input type="text" placeholder="Buscar conversa..." className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted border border-border rounded-sm focus:outline-none focus:border-primary focus:bg-card transition-all placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {activeChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                  className={`p-3 border-b border-border cursor-pointer hover:bg-card transition-colors ${
                    selectedChat.id === chat.id ? 'bg-card border-l-4 border-l-primary shadow-climo-sm' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-semibold truncate ${selectedChat.id === chat.id ? 'text-primary' : 'text-foreground'}`}>{chat.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{chat.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate w-40">{chat.lastMsg}</p>
                    {chat.unread > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{chat.unread}</span>}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                      chat.status === 'bot' ? 'bg-muted text-muted-foreground border-border' : 'bg-climo-cyan/10 text-climo-cyan border-climo-cyan/20'
                    }`}>{chat.status === 'bot' ? 'IA' : 'MANUAL'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-muted/20">
            <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shadow-climo-sm z-10">
              <div>
                <h3 className="text-sm font-bold text-foreground">{selectedChat.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {selectedChat.company}</span>
                  <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                  <span className={isHumanHandling ? 'text-climo-cyan font-bold' : 'text-primary font-bold'}>
                    {isHumanHandling ? 'Intervenção Humana' : 'IA Ativa'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHumanHandling(!isHumanHandling)}
                  className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-sm border transition-colors ${
                    isHumanHandling
                      ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
                      : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
                  }`}
                >
                  {isHumanHandling ? 'Retomar IA' : 'Parar IA'}
                </button>
                <button className="p-1.5 text-muted-foreground hover:text-foreground border border-transparent hover:border-border rounded-sm">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-background">
              {chatHistoryMock.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] p-3 rounded-lg text-sm shadow-climo-sm border ${
                    msg.sender === 'user'
                      ? 'bg-card text-foreground border-border rounded-tl-none'
                      : 'bg-primary text-primary-foreground border-primary rounded-tr-none'
                  }`}>
                    <p>{msg.text}</p>
                    <p className="text-[10px] mt-1 text-right opacity-70">{msg.time}</p>
                  </div>
                </div>
              ))}
              {isHumanHandling && (
                <div className="flex justify-center my-4">
                  <span className="bg-climo-cyan/10 text-climo-cyan text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded border border-climo-cyan/20">
                    Você assumiu o controle
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-card border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={!isHumanHandling}
                  placeholder={isHumanHandling ? 'Digite a mensagem...' : 'Pause a IA para intervir'}
                  className="flex-1 border border-border bg-background rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground transition-all placeholder:text-muted-foreground"
                />
                <button
                  disabled={!isHumanHandling}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-sm text-sm font-bold hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[calc(100vh-220px)] border border-border rounded-lg bg-muted/20 flex flex-col items-center justify-center overflow-hidden">
          {chatwootUrl ? (
            <iframe src={chatwootUrl} className="w-full h-full border-none" title="Painel Chatwoot" />
          ) : (
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Conectar Chatwoot Real</h3>
              <p className="text-sm text-muted-foreground mb-6">Cole a URL do seu painel do Chatwoot para visualizar sua caixa de entrada real aqui.</p>
              <input
                type="text"
                placeholder="https://app.chatwoot.com/..."
                className="w-full px-4 py-2 border border-border bg-card rounded-lg mb-3 focus:border-primary focus:outline-none"
                onBlur={(e) => setChatwootUrl(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
