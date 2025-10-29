import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useGuildConfig } from '@/hooks/useGuildConfig';
import { useGuildRoles } from '@/hooks/useGuildRoles';
import { useGuildModules } from '@/hooks/useGuildModules';
import { GuildConfig, Module } from '@/types';
import toast from 'react-hot-toast';

interface GeneralSettingsProps {
  guildId: string;
  config: GuildConfig | null;
  modules: Module[];
}

export default function GeneralSettings({ guildId, config, modules }: GeneralSettingsProps) {
  const { updateConfig } = useGuildConfig(guildId);
  const { roles } = useGuildRoles(guildId);
  const { toggleModule } = useGuildModules(guildId);

  const [prefix, setPrefix] = useState(config?.prefix || '!');
  const [adminRoleId, setAdminRoleId] = useState(config?.adminRoleId || '');
  const [modRoleId, setModRoleId] = useState(config?.modRoleId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setPrefix(config.prefix);
      setAdminRoleId(config.adminRoleId || '');
      setModRoleId(config.modRoleId || '');
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig({
        prefix,
        adminRoleId: adminRoleId || undefined,
        modRoleId: modRoleId || undefined,
      });
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">General Settings</h2>
      </div>

      {/* Bot Prefix */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Command Prefix
        </label>
        <input
          type="text"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          maxLength={5}
          className="w-full max-w-xs px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
          placeholder="!"
        />
        <p className="text-sm text-muted-foreground">
          The prefix used to trigger bot commands (e.g., !help)
        </p>
      </div>

      {/* Admin Role */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Administrator Role
        </label>
        <select
          value={adminRoleId}
          onChange={(e) => setAdminRoleId(e.target.value)}
          className="w-full max-w-xs px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
        >
          <option value="">No role selected</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          Members with this role can use admin commands
        </p>
      </div>

      {/* Moderator Role */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Moderator Role
        </label>
        <select
          value={modRoleId}
          onChange={(e) => setModRoleId(e.target.value)}
          className="w-full max-w-xs px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
        >
          <option value="">No role selected</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          Members with this role can use moderation commands
        </p>
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-helix text-white rounded-lg hover:bg-helix-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Module Toggles */}
      <div className="border-t border-border pt-8">
        <h3 className="text-xl font-semibold mb-4">Enabled Modules</h3>
        <div className="space-y-3">
          {modules.map((module) => (
            <div
              key={module.id}
              className="flex items-center justify-between p-4 bg-background border border-border rounded-lg"
            >
              <div>
                <h4 className="font-medium">{module.name}</h4>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
              <button
                onClick={() => toggleModule(module.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  module.enabled ? 'bg-helix' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    module.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
