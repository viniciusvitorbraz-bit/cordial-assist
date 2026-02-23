import { useState } from 'react';
import {
  LayoutDashboard, MessageSquare, Settings,
  BrainCircuit, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface ClimoSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', label: 'Conversas', icon: MessageSquare },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function ClimoSidebar({
  activeTab, onTabChange, onLogout, collapsed, onToggleCollapse,
}: ClimoSidebarProps) {
  return (
    <aside
      className={`flex flex-col fixed h-full z-20 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-3">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center shrink-0">
          <BrainCircuit className="w-5 h-5 text-sidebar-primary" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight whitespace-nowrap">
            Climo<span className="text-sidebar-primary">AI</span>
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
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors relative ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Status + User */}
      <div className="p-3 border-t border-sidebar-border space-y-3">
        {/* Status indicator */}
        {!collapsed && (
          <div className="px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-climo-success animate-pulse" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">Sistema</p>
                <p className="text-xs font-semibold text-climo-success">Operacional</p>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-climo-success animate-pulse" />
          </div>
        )}

        {/* User */}
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary text-xs font-bold shrink-0">
            G
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">Dr. Gestor</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">admin@climo.com.br</p>
            </div>
          )}
        </div>

        {/* Logout + Collapse toggle */}
        <div className={`flex ${collapsed ? 'flex-col items-center gap-1' : 'items-center justify-between'}`}>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sair"
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
