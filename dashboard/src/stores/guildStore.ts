import { create } from 'zustand';
import type { Guild } from '@/types';

interface GuildState {
  guilds: Guild[];
  selectedGuild: Guild | null;
  setGuilds: (guilds: Guild[]) => void;
  setSelectedGuild: (guild: Guild | null) => void;
}

export const useGuildStore = create<GuildState>((set) => ({
  guilds: [],
  selectedGuild: null,
  setGuilds: (guilds) => set({ guilds }),
  setSelectedGuild: (guild) => set({ selectedGuild: guild }),
}));
