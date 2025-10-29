import { Shield } from 'lucide-react';
import { useGuildModules } from '@/hooks/useGuildModules';
import { Module } from '@/types';

interface ModerationSettingsProps {
  guildId: string;
  modules: Module[];
}

export default function ModerationSettings({ guildId, modules }: ModerationSettingsProps) {
  const { toggleModule } = useGuildModules(guildId);
  const moderationModule = modules.find((m) => m.id === 'Moderation');

  if (!moderationModule?.enabled) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Moderation Module Disabled</h3>
        <p className="text-muted-foreground mb-4">
          Enable the Moderation module in General Settings to configure moderation features.
        </p>
        <button
          onClick={() => toggleModule('Moderation')}
          className="px-6 py-2 bg-helix text-white rounded-lg hover:bg-helix-dark transition-colors"
        >
          Enable Moderation Module
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Moderation Settings</h2>
        <p className="text-muted-foreground">Configure moderation and auto-mod features</p>
      </div>

      <div className="grid gap-6">
        {/* Auto-Mod */}
        <div className="p-4 bg-background border border-border rounded-lg">
          <h3 className="font-semibold mb-2">Auto-Moderation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically filter messages with prohibited content
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-border text-helix focus:ring-helix"
              />
              <span className="text-sm">Enable Auto-Mod</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-border text-helix focus:ring-helix"
              />
              <span className="text-sm">Filter Profanity</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-helix focus:ring-helix"
              />
              <span className="text-sm">Filter Spam</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-helix focus:ring-helix"
              />
              <span className="text-sm">Filter Links</span>
            </label>
          </div>
        </div>

        {/* Logging */}
        <div className="p-4 bg-background border border-border rounded-lg">
          <h3 className="font-semibold mb-2">Moderation Logs</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure where moderation actions are logged
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Log Channel
              </label>
              <select className="w-full max-w-xs px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix">
                <option value="">Select a channel...</option>
                <option value="123">#mod-logs</option>
                <option value="456">#admin-logs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Warning System */}
        <div className="p-4 bg-background border border-border rounded-lg">
          <h3 className="font-semibold mb-2">Warning System</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Automatic actions when users accumulate warnings
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Warnings before timeout
              </label>
              <input
                type="number"
                defaultValue={3}
                min={1}
                max={10}
                className="w-full max-w-xs px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Warnings before kick
              </label>
              <input
                type="number"
                defaultValue={5}
                min={1}
                max={10}
                className="w-full max-w-xs px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
              />
            </div>
          </div>
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
