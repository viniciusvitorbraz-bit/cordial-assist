import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtext: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  highlight?: boolean;
}

export default function StatCard({ title, value, subtext, trend, trendValue, highlight = false }: StatCardProps) {
  return (
    <div className={`p-5 rounded-2xl border border-border transition-all duration-200 ${
      highlight
        ? 'bg-primary text-primary-foreground'
        : 'bg-card text-card-foreground'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className={`text-[10px] font-medium uppercase tracking-[0.2em] ${highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{title}</h3>
      </div>
      <p className="text-3xl font-light tracking-tight">{value}</p>
      <div className="flex items-center mt-2 justify-between">
        <p className={`text-xs font-light ${highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{subtext}</p>
        {trend && trendValue && (
          <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-lg ${
            trend === 'up'
              ? (highlight ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary')
              : (highlight ? 'bg-white/20 text-white' : 'bg-destructive/10 text-destructive')
          }`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
