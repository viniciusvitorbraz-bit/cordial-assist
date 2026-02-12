import { Bell, Activity } from 'lucide-react';

interface ClimoTopbarProps {
  activeTab: string;
}

const titles: Record<string, string> = {
  dashboard: 'Dashboard Operacional',
  crm: 'Gestão de Solicitações',
  chat: 'Central de Atendimento',
};

export default function ClimoTopbar({ activeTab }: ClimoTopbarProps) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10 shadow-climo-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-foreground">{titles[activeTab] ?? ''}</h1>
        <span className="h-4 w-px bg-border hidden md:block" />
        <div className="hidden md:flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded-sm border border-border">
          <Activity className="w-3 h-3 mr-1 text-climo-cyan" /> Sistema Operacional
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-muted-foreground hover:bg-muted rounded-sm transition-all">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
