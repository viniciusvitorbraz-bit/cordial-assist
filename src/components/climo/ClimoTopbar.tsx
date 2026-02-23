import { Bell, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ClimoTopbarProps {
  activeTab: string;
}

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  chat: 'Conversas',
  settings: 'Configurações',
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
    <header className="h-14 bg-card/50 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground font-medium">Módulo</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-foreground uppercase tracking-wide text-xs">
          {titles[activeTab] ?? ''}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>
        <button
          onClick={() => setDark(!dark)}
          className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          title={dark ? 'Modo claro' : 'Modo escuro'}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          G
        </div>
      </div>
    </header>
  );
}
