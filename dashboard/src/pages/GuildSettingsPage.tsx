import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Settings, DollarSign, Shield, Users, Smile, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useGuilds } from '@/hooks/useGuilds';
import { useGuildConfig } from '@/hooks/useGuildConfig';
import { useGuildModules } from '@/hooks/useGuildModules';
import { getGuildIconUrl } from '@/lib/utils';
import GeneralSettings from '@/components/guild/GeneralSettings';
import EconomySettings from '@/components/guild/EconomySettings';
import ModerationSettings from '@/components/guild/ModerationSettings';
import LoadingPage from './LoadingPage';

type TabId = 'general' | 'economy' | 'moderation' | 'verification' | 'fun';

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
  { id: 'economy', label: 'Economy', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'moderation', label: 'Moderation', icon: <Shield className="w-4 h-4" /> },
  { id: 'verification', label: 'Verification', icon: <CheckCircle className="w-4 h-4" /> },
  { id: 'fun', label: 'Fun & Games', icon: <Smile className="w-4 h-4" /> },
];

export default function GuildSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const { guilds } = useGuilds();
  const { config, isLoading: configLoading } = useGuildConfig(guildId || '');
  const { modules, isLoading: modulesLoading } = useGuildModules(guildId || '');
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const guild = guilds.find((g) => g.id === guildId);

  if (!guildId) {
    return <div>Invalid guild ID</div>;
  }

  if (configLoading || modulesLoading) {
    return <LoadingPage />;
  }

  if (!guild) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <p className="text-muted-foreground">Guild not found</p>
          <Link to="/dashboard" className="text-helix hover:underline mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Servers
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={getGuildIconUrl(guild)}
              alt={guild.name}
              className="w-16 h-16 rounded-full"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%233b66ff"/%3E%3C/svg%3E';
              }}
            />
            <div>
              <h1 className="text-3xl font-bold">{guild.name}</h1>
              <p className="text-muted-foreground">Server Configuration</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-card border border-border rounded-lg p-2 sticky top-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-helix text-white'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-card border border-border rounded-lg p-6">
              {activeTab === 'general' && <GeneralSettings guildId={guildId} config={config} modules={modules} />}
              {activeTab === 'economy' && <EconomySettings guildId={guildId} modules={modules} />}
              {activeTab === 'moderation' && <ModerationSettings guildId={guildId} modules={modules} />}
              {activeTab === 'verification' && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Verification Settings</h3>
                  <p className="text-muted-foreground">Configuration options coming soon...</p>
                </div>
              )}
              {activeTab === 'fun' && (
                <div className="text-center py-12">
                  <Smile className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Fun & Games Settings</h3>
                  <p className="text-muted-foreground">Configuration options coming soon...</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
