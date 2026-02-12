import { useState } from 'react';
import ClimoSidebar from '@/components/climo/ClimoSidebar';
import ClimoTopbar from '@/components/climo/ClimoTopbar';
import DashboardView from '@/components/climo/DashboardView';
import CrmView from '@/components/climo/CrmView';
import ChatView from '@/components/climo/ChatView';
import ReportsView from '@/components/climo/ReportsView';
import SettingsView from '@/components/climo/SettingsView';

export default function Index() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans">
      <ClimoSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <ClimoTopbar activeTab={activeTab} />
        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'crm' && <CrmView />}
          {activeTab === 'chat' && <ChatView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  );
}
