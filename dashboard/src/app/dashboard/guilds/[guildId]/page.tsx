'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { useUser } from '@/contexts/UserContext';
import ReactionRolesSettings from '@/components/ReactionRolesSettings';

// Define interfaces for the data we expect from the API
interface GuildData {
  guild: any; // Define guild properties more accurately if needed
  channels: any[];
  roles: any[];
  settings: any; // Define settings properties more accurately if needed
}

const GuildManagePage = () => {
  const { guildId } = useParams();
  const [guildData, setGuildData] = useState<GuildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useUser();

  const [verificationChannelId, setVerificationChannelId] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationRoleId, setVerificationRoleId] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchGuildData = async () => {
      try {
        const { data } = await axios.get(`/api/guilds/${guildId}`);
        setGuildData(data);
        setVerificationChannelId(data.settings?.verificationChannelId || '');
        setVerificationMessage(data.settings?.verificationMessage || '');
        setVerificationRoleId(data.settings?.verificationRoleId || '');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch guild data');
      } finally {
        setLoading(false);
      }
    };

    fetchGuildData();
  }, [guildId, isAuthenticated]);

  const handleSave = async () => {
    try {
      await axios.post(`/api/guilds/${guildId}/verification`, {
        verificationChannelId,
        verificationMessage,
        verificationRoleId,
      });
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings.');
    }
  };

  if (loading) {
    return <div>Loading guild data...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!guildData) {
    return <div>Guild not found.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage {guildData.guild.name}</h1>
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Verification Settings</h2>
        <div className="flex flex-col space-y-4">
          <div>
            <label htmlFor="channel" className="block mb-1">Verification Channel</label>
            <select
              id="channel"
              value={verificationChannelId}
              onChange={(e) => setVerificationChannelId(e.target.value)}
              className="w-full p-2 rounded bg-gray-700"
            >
              <option value="">Select a channel</option>
              {guildData.channels
                .filter((c: any) => c.type === 0) // Text channels
                .map((channel: any) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="role" className="block mb-1">Verification Role</label>
            <select
              id="role"
              value={verificationRoleId}
              onChange={(e) => setVerificationRoleId(e.target.value)}
              className="w-full p-2 rounded bg-gray-700"
            >
              <option value="">Select a role</option>
              {guildData.roles.map((role: any) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="message" className="block mb-1">Verification Message</label>
            <textarea
              id="message"
              value={verificationMessage}
              onChange={(e) => setVerificationMessage(e.target.value)}
              className="w-full p-2 rounded bg-gray-700"
              rows={4}
            />
          </div>
          <button
            onClick={handleSave}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded self-start"
          >
            Save Settings
          </button>
        </div>
      </div>
      <ReactionRolesSettings />
    </div>
  );
};

export default GuildManagePage;
