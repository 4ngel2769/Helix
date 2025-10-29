import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { GuildConfig } from '@/types';
import toast from 'react-hot-toast';

export function useGuildConfig(guildId: string | undefined) {
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (!guildId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; config: GuildConfig }>(`/guild/${guildId}/config`);
      if (response.data.success) {
        setConfig(response.data.config);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [guildId]);

  const updateConfig = async (updates: Partial<GuildConfig>) => {
    if (!guildId) return;

    try {
      const response = await api.patch<{ success: boolean; config: GuildConfig }>(
        `/guild/${guildId}/config`,
        updates
      );
      if (response.data.success) {
        setConfig(response.data.config);
        toast.success('Configuration updated successfully!');
        return response.data.config;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update configuration';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    config,
    isLoading,
    error,
    updateConfig,
    refetch: fetchConfig,
  };
}
