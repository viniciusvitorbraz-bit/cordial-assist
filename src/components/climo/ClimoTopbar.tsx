import { Sun, Moon, RefreshCw, Settings, Calendar, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import climoAvatar from '@/assets/climo-avatar.jpg';

interface ClimoTopbarProps {
  activeTab: string;
}

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  chat: 'Conversas',
  settings: 'Configurações',
  clientes: 'Clientes',
  'ai-control': 'Controle da IA',
};

export default function ClimoTopbar({ activeTab }: ClimoTopbarProps) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('climo-theme') !== 'light';
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('climo-theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      localStorage.setItem('climo-theme', 'light');
    }
  }, [dark]);

  return (
    <header className="h-14 bg-card/60 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Módulo</span>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground">
          {titles[activeTab] ?? ''}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="p-2 text-muted-foreground hover:text-foreground rounded-xl bg-card border border-border transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <img src={climoAvatar} alt="Climo avatar" className="w-8 h-8 rounded-full object-cover ml-1" />
      </div>
    </header>
  );
}
