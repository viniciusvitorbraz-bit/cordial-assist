import { Settings } from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
      <Settings className="w-16 h-16 mb-4 opacity-40" />
      <h2 className="text-xl font-semibold mb-2">Configurações</h2>
      <p className="text-sm opacity-70">Em breve você poderá gerenciar as configurações do sistema aqui.</p>
    </div>
  );
}
