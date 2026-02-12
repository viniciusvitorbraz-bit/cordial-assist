import { type LucideIcon } from 'lucide-react';

interface ServiceMetricProps {
  label: string;
  value: string;
  subValue: string;
  icon: LucideIcon;
  colorClass: string;
}

export default function ServiceMetric({ label, value, subValue, icon: Icon, colorClass }: ServiceMetricProps) {
  return (
    <div className="flex items-center p-4 bg-card border border-border rounded-lg shadow-climo-sm">
      <div className={`p-3 rounded-sm mr-4 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{subValue}</span>
        </div>
      </div>
    </div>
  );
}
