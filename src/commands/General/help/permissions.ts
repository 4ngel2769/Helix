import {
  PermissionFlagsBits,
  PermissionsBitField,
  type Message,
  type StringSelectMenuInteraction,
  type Guild as DiscordGuild
} from 'discord.js';
import { type Command } from '@sapphire/framework';
import { container } from '@sapphire/framework';
import type { IsEnabledContext, ModuleError, Modules, ModuleCommandUnion } from '@kbotdev/plugin-modules';
import { Result } from '@sapphire/result';

interface ExtendedModule {
  name: string;
  IsEnabled: (context: IsEnabledContext) => Promise<Result<boolean, ModuleError>>;
  requiredPermissions?: bigint[];
}

export const modulePermissions: Record<string, bigint[]> = {
  Administration: [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild
  ],
  Moderation: [
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ModerateMembers
  ]
};

export function getMemberPermissions(member: unknown): bigint | Readonly<PermissionsBitField> | undefined {
  if (!member || typeof member !== 'object' || !('permissions' in member)) return undefined;
  const permissions = (member as { permissions?: unknown }).permissions;
  if (typeof permissions === 'bigint' || permissions instanceof PermissionsBitField) {
    return permissions as bigint | Readonly<PermissionsBitField>;
  }
  return undefined;
}

export function hasPermission(
  permissions: bigint | Readonly<PermissionsBitField> | undefined,
  permission: bigint
): boolean {
  if (!permissions) return false;
  return typeof permissions === 'bigint'
    ? (permissions & permission) === permission
    : permissions.has(permission);
}

export function hasAnyPermission(
  permissions: bigint | Readonly<PermissionsBitField> | undefined,
  requiredPermissions: readonly bigint[]
): boolean {
  return requiredPermissions.some((permission) => hasPermission(permissions, permission));
}

export function isLegacyModuleDisabled(guildData: Record<string, unknown> | null, category: string): boolean {
  if (!guildData) return false;
  const key = `is${category}Module`;
  return guildData[key] === false;
}

export async function isModuleEnabledForContext(
  category: string,
  guild: DiscordGuild | null,
  interaction: Command.ChatInputCommandInteraction | StringSelectMenuInteraction | Message,
  memberPermissions: bigint | Readonly<PermissionsBitField> | undefined
): Promise<boolean> {
  const moduleStore = container.stores.get('modules');
  const module = moduleStore.get(category.toLowerCase() as keyof Modules) as ExtendedModule | undefined;

  if (module?.requiredPermissions && !hasAnyPermission(memberPermissions, module.requiredPermissions)) return false;

  if (module && typeof module.IsEnabled === 'function' && guild) {
    const moduleCommand = (module as any).container?.stores?.get('commands')?.get(module.name);
    const isEnabled = await module.IsEnabled({
      guild,
      interaction: interaction as unknown as Command.ChatInputCommandInteraction,
      command: moduleCommand as ModuleCommandUnion
    });
    if (isEnabled.isErr() || !isEnabled.unwrap()) return false;
  }

  const restrictedPermissions = modulePermissions[category];
  if (restrictedPermissions && !hasAnyPermission(memberPermissions, restrictedPermissions)) return false;

  return true;
}

export async function getFilteredModules(
  categories: string[],
  guildData: Record<string, unknown> | null,
  guild: DiscordGuild | null,
  interaction: Command.ChatInputCommandInteraction | StringSelectMenuInteraction | Message,
  memberPermissions: bigint | Readonly<PermissionsBitField> | undefined
): Promise<string[]> {
  const enabledModules = await Promise.all(
    categories.map(async (category) => {
      if (isLegacyModuleDisabled(guildData, category)) return null;
      const isEnabled = await isModuleEnabledForContext(category, guild, interaction, memberPermissions);
      return isEnabled ? category : null;
    })
  );
  return enabledModules.filter((m): m is string => m !== null);
}
