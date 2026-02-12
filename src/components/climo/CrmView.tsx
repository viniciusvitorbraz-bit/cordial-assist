import { useState } from 'react';
import { List, Columns, Filter, Building2 } from 'lucide-react';
import KanbanCard from './KanbanCard';
import { leadsData, kanbanColumns } from '@/data/climo-data';

export default function CrmView() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center bg-card p-3 border border-border rounded-lg shadow-climo-sm mb-4">
        <div className="flex gap-2">
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-sm border ${viewMode === 'list' ? 'bg-muted border-border text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-sm border ${viewMode === 'kanban' ? 'bg-muted border-border text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>
            <Columns className="w-4 h-4" />
          </button>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-muted">
          <Filter className="w-3 h-3" /> Filtrar Status
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-card border border-border rounded-lg shadow-climo-sm overflow-hidden flex-1">
          <table className="w-full text-left">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Solicitante</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Tipo</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Valor</th>
                <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leadsData.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-foreground">{lead.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> {lead.company}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                      lead.status === 'Agendado' ? 'bg-climo-cyan/10 text-climo-cyan border-climo-cyan/20' :
                      lead.status === 'Atenção' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      'bg-chart-3/10 text-chart-3 border-chart-3/20'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{lead.intent}</td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground">{lead.value}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-primary hover:text-primary/80 text-xs font-bold uppercase tracking-wide">Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {Object.entries(kanbanColumns).map(([columnName, items]) => (
            <div key={columnName} className="min-w-[280px] w-full bg-muted/50 rounded-lg p-3 border border-border">
              <div className="flex justify-between items-center mb-3 border-b border-border pb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{columnName}</span>
                <span className="text-xs font-bold text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((lead) => <KanbanCard key={lead.id} lead={lead} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
