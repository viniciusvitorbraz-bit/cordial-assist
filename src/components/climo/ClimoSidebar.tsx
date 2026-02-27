import {
  LayoutDashboard, MessageSquare, Settings,
  BrainCircuit, LogOut, ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import climoAvatar from '@/assets/climo-avatar.jpg';

interface ClimoSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: 'ai-control', label: 'Controle da IA', icon: BrainCircuit },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'chat', label: 'Conversas', icon: MessageSquare },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function ClimoSidebar({
  activeTab, onTabChange, onLogout, collapsed, onToggleCollapse,
}: ClimoSidebarProps) {
  return (
    <aside
      className={`flex flex-col fixed h-full z-20 border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <BrainCircuit className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <span className="text-base font-light tracking-tight whitespace-nowrap">
            Climo<span className="text-primary font-medium">AI</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-2 space-y-6 overflow-y-auto">
        <nav className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-light rounded-xl transition-all relative ${
                  active
                    ? 'bg-sidebar-accent text-foreground'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-foreground'
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
                    style={{ boxShadow: '0 0 10px rgba(59,130,246,0.8)' }}
                  />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-primary' : ''}`} />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="p-3 border-t border-border space-y-3">
        {!collapsed && (
          <div className="px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-climo-success animate-pulse" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/40">Sistema</p>
                <p className="text-xs font-medium text-climo-success">Operacional</p>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-climo-success animate-pulse" />
          </div>
        )}

        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <img src={climoAvatar} alt="Climo avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-light truncate text-foreground">Climo - Santa Maria</p>
              <p className="text-[11px] text-sidebar-foreground/40 truncate">climo@2026.com.br</p>
            </div>
          )}
        </div>

        <div className={`flex ${collapsed ? 'flex-col items-center gap-1' : 'items-center justify-between'}`}>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sair"
              className="p-1.5 rounded-xl hover:bg-sidebar-accent transition-colors text-sidebar-foreground/40 hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="p-1.5 rounded-xl hover:bg-sidebar-accent transition-colors text-sidebar-foreground/40 hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
