import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { Role } from '@/types';

export function useGuildRoles(guildId: string | undefined) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = async () => {
    if (!guildId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; roles: Role[] }>(`/guild/${guildId}/roles`);
      if (response.data.success) {
        setRoles(response.data.roles);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [guildId]);

  return {
    roles,
    isLoading,
    error,
    refetch: fetchRoles,
  };
}
