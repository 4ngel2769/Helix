import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useGuildStore } from '@/stores/guildStore';
import type { Guild } from '@/types';

export function useGuilds() {
  const { guilds, setGuilds } = useGuildStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuilds = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; guilds: Guild[] }>('/guilds');
      if (response.data.success) {
        setGuilds(response.data.guilds);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch guilds');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuilds();
  }, []);

  return {
    guilds,
    isLoading,
    error,
    refetch: fetchGuilds,
  };
}
