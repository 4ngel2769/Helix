'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  hasBot: boolean;
}

interface UserContextType {
  user: User | null;
  guilds: Guild[];
  clientId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [dashboardRes, configRes] = await Promise.all([
          axios.get('/api/dashboard'),
          axios.get('/api/config')
        ]);

        if (dashboardRes.data.authenticated) {
          const userRes = await axios.get('/api/users/@me');
          setUser(userRes.data);
          setGuilds(dashboardRes.data.guilds);
        }

        setClientId(configRes.data.clientId);

      } catch (error) {
        setUser(null);
        setGuilds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const login = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = () => {
    window.location.href = '/api/auth/logout';
  };

  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{ user, guilds, clientId, isAuthenticated, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
