import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Module } from '@/types';
import toast from 'react-hot-toast';

export function useGuildModules(guildId: string | undefined) {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = async () => {
    if (!guildId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; modules: Module[] }>(`/guild/${guildId}/modules`);
      if (response.data.success) {
        setModules(response.data.modules);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch modules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [guildId]);

  const toggleModule = async (moduleKey: string, enabled: boolean) => {
    if (!guildId) return;

    try {
      const response = await api.patch<{ success: boolean; module: { key: string; enabled: boolean } }>(
        `/guild/${guildId}/modules`,
        { moduleKey, enabled }
      );
      
      if (response.data.success) {
        setModules((prev) =>
          prev.map((mod) =>
            mod.key === moduleKey ? { ...mod, enabled } : mod
          )
        );
        toast.success(`${moduleKey} ${enabled ? 'enabled' : 'disabled'} successfully!`);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to toggle module';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    modules,
    isLoading,
    error,
    toggleModule,
    refetch: fetchModules,
  };
}
