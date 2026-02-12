import { FileText } from 'lucide-react';

export default function ReportsView() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
      <FileText className="w-16 h-16 mb-4 opacity-40" />
      <h2 className="text-xl font-semibold mb-2">Relatórios ASO</h2>
      <p className="text-sm opacity-70">Em breve você poderá visualizar e gerar relatórios aqui.</p>
    </div>
  );
}
