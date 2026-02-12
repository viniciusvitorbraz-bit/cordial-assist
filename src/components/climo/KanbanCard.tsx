import { Building2 } from 'lucide-react';
import type { Lead } from '@/data/climo-data';

export default function KanbanCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-card p-3 border border-border rounded-lg shadow-climo-sm mb-2 hover:border-primary transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-primary group">
      <div className="flex justify-between items-start">
        <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{lead.name}</span>
        <span className="text-[10px] text-muted-foreground">{lead.time}</span>
      </div>
      {lead.company && (
        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
          <Building2 className="w-3 h-3" />
          <span className="text-xs">{lead.company}</span>
        </div>
      )}
      <div className="mt-2 flex justify-between items-center border-t border-border pt-2">
        <span className="text-xs text-muted-foreground">{lead.intent}</span>
        <span className="text-xs font-medium text-foreground">{lead.value}</span>
      </div>
    </div>
  );
}
