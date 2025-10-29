export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  avatarUrl: string;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  botPresent: boolean;
}

export interface GuildConfig {
  guildId: string;
  prefix: string;
  adminRoleId?: string;
  modRoleId?: string;
  modules: Record<string, boolean>;
}

export interface Module {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  emoji?: string;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  managed: boolean;
}
