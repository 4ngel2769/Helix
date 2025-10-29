import { DollarSign } from 'lucide-react';
import { useGuildModules } from '@/hooks/useGuildModules';
import { Module } from '@/types';

interface EconomySettingsProps {
  guildId: string;
  modules: Module[];
}

export default function EconomySettings({ guildId, modules }: EconomySettingsProps) {
  const { toggleModule } = useGuildModules(guildId);
  const economyModule = modules.find((m) => m.id === 'Economy');

  if (!economyModule?.enabled) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Economy Module Disabled</h3>
        <p className="text-muted-foreground mb-4">
          Enable the Economy module in General Settings to configure economy features.
        </p>
        <button
          onClick={() => toggleModule('Economy')}
          className="px-6 py-2 bg-helix text-white rounded-lg hover:bg-helix-dark transition-colors"
        >
          Enable Economy Module
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Economy Settings</h2>
        <p className="text-muted-foreground">Configure the economy system for your server</p>
      </div>

      <div className="grid gap-6">
        {/* Daily Rewards */}
        <div className="p-4 bg-background border border-border rounded-lg">
          <h3 className="font-semibold mb-2">Daily Rewards</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Members can claim daily currency rewards
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Daily Reward Amount
              </label>
              <input
                type="number"
                defaultValue={100}
                className="w-full max-w-xs px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
              />
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="p-4 bg-background border border-border rounded-lg">
          <h3 className="font-semibold mb-2">Currency Settings</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Customize the currency name and emoji
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Currency Name
              </label>
              <input
                type="text"
                defaultValue="coins"
                className="w-full max-w-xs px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Currency Emoji
              </label>
              <input
                type="text"
                defaultValue="🪙"
                className="w-full max-w-xs px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
              />
            </div>
          </div>
        </div>

        {/* Shop Settings */}
        <div className="p-4 bg-background border border-border rounded-lg">
          <h3 className="font-semibold mb-2">Shop Settings</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure the server shop (coming soon)
          </p>
          <button
            disabled
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg cursor-not-allowed opacity-50"
          >
            Manage Shop Items
          </button>
        </div>

        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            Note: These settings are currently display-only. Full configuration will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
