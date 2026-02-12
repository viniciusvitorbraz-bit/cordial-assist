import { LayoutDashboard, Users, MessageSquare, Settings, FileText, BrainCircuit } from 'lucide-react';

interface ClimoSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'crm', label: 'Solicitações', icon: Users },
  { id: 'chat', label: 'Atendimento', icon: MessageSquare },
];

const managementItems = [
  { id: 'reports', label: 'Relatórios ASO', icon: FileText },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function ClimoSidebar({ activeTab, onTabChange }: ClimoSidebarProps) {
  return (
    <aside className="w-64 flex flex-col fixed h-full z-20 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <BrainCircuit className="w-6 h-6 mr-3 text-sidebar-primary" />
        <span className="text-lg font-bold tracking-tight">
          Climo<span className="text-sidebar-primary">AI</span>
        </span>
      </div>

      <div className="p-4">
        <div className="text-xs font-bold uppercase tracking-wider mb-2 px-3 opacity-70">Principal</div>
        <nav className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                activeTab === id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {id === 'chat' && (
                <span className="ml-auto bg-sidebar-foreground text-sidebar text-xs font-bold px-1.5 py-0.5 rounded-full">3</span>
              )}
            </button>
          ))}
        </nav>

        <div className="text-xs font-bold uppercase tracking-wider mt-8 mb-2 px-3 opacity-70">Gestão</div>
        <nav className="space-y-1">
          {managementItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                activeTab === id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-sidebar-accent flex items-center justify-center text-sidebar-foreground text-xs font-bold">DR</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Dr. Gestor</p>
            <p className="text-xs opacity-60 truncate">Administrador</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
