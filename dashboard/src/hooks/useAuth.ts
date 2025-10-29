import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

export function useAuth() {
  const { user, setUser, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get<{ success: boolean; user: User }>('/user');
        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          setUser(null);
        } else {
          setError('Failed to fetch user');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [setUser]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      storeLogout();
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    logout,
  };
}
