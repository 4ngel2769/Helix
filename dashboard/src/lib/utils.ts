import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarUrl(user: { id: string; avatar: string | null; discriminator?: string }): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  const defaultAvatar = user.discriminator ? parseInt(user.discriminator) % 5 : 0;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
}

export function getGuildIconUrl(guild: { id: string; icon: string | null }): string {
  if (guild.icon) {
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
  }
  return '/default-guild.png';
}
