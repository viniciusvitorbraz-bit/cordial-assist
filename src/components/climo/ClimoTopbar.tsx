import { Bell, Search, Settings, Sun } from 'lucide-react';

interface ClimoTopbarProps {
  activeTab: string;
}

const titles: Record<string, string> = {
  dashboard: 'Dashboard',
  crm: 'Solicitações',
  chat: 'Conversas',
  reports: 'Relatórios',
  settings: 'Configurações',
};

export default function ClimoTopbar({ activeTab }: ClimoTopbarProps) {
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
        {/* Search bar */}
        <div className="hidden md:flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-1.5 text-sm text-muted-foreground w-52">
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Buscar...</span>
          <kbd className="ml-auto text-[10px] bg-card border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
        </div>

        <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>
        <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
          <Sun className="w-4 h-4" />
        </button>
        <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          G
        </div>
      </div>
    </header>
  );
}
