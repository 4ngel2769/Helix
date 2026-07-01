import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  type ButtonInteraction,
  type ColorResolvable,
  type StringSelectMenuBuilder,
  type StringSelectMenuInteraction
} from 'discord.js';
import { type Command } from '@sapphire/framework';
import { Args, Command as SapphireCommand, CommandOptions, container } from '@sapphire/framework';
import config from '../../../config';

const COMMANDS_PER_PAGE = 11;

interface ExtendedCommand extends SapphireCommand<Args, CommandOptions> {
  category: string | null;
}

export function getCommandCategories(): string[] {
  const categories = new Set<string>();
  for (const command of container.stores.get('commands').values()) {
    if (command.category) categories.add(command.category);
  }
  return Array.from(categories);
}

export function getFilteredCommandCounts(filteredModules: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const module of filteredModules) {
    counts.set(module.toLowerCase(), 0);
  }
  for (const command of container.stores.get('commands').values() as IterableIterator<ExtendedCommand>) {
    const category = command.category?.toLowerCase();
    if (!category) continue;
    if (!counts.has(category)) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts;
}

export function buildHelpEmbed(filteredModules: string[]) {
  return new EmbedBuilder()
    .setColor(config.bot.embedColor.default as ColorResolvable)
    .setTitle('Help Menu')
    .setDescription(
      'Use the dropdown below to browse command modules. Press **Main Help** anytime to return here.'
    )
    .addFields([
      {
        name: 'Quick links',
        value: '[Dashboard](https://helix.angellabs.xyz/dashboard) • [Command List](https://helix.angellabs.xyz/commands)'
      },
      {
        name: 'Policies',
        value: '[Terms of Service](https://helix.angellabs.xyz/terms) • [Privacy Policy](https://helix.angellabs.xyz/privacy)'
      },
      {
        name: 'Need help?',
        value: 'Use the dropdown to select a module, or type `/help <command>` for specific command information.'
      }
    ])
    .setFooter({ text: `Helix v${config.bot.version} • ${filteredModules.length} module${filteredModules.length === 1 ? '' : 's'} available` });
}

export function createHomeButton(disabled = false) {
  return new ButtonBuilder()
    .setCustomId('help-home')
    .setLabel('Main Help')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);
}

export async function updateHelpResponse(
  interaction: Command.ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction | Message,
  embed: EmbedBuilder,
  components: Array<ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>>
) {
  if (!(interaction instanceof Message) && interaction.isMessageComponent()) {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed], components });
    } else {
      try {
        await interaction.update({ embeds: [embed], components });
      } catch (error: unknown) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: number }).code : undefined;
        if (code === 40060 || code === 10062) {
          await interaction.editReply({ embeds: [embed], components }).catch(() => null);
        } else {
          throw error;
        }
      }
    }
    return;
  }

  if (!(interaction instanceof Message) && interaction.isRepliable() && typeof interaction.editReply === 'function') {
    await interaction.editReply({ embeds: [embed], components });
    return;
  }

  if (interaction instanceof Message) {
    await interaction.edit({ embeds: [embed], components });
  }
}

export function generateCommandEmbed(
  commands: ExtendedCommand[],
  moduleName: string,
  currentPage: number,
  totalPages: number
) {
  const truncate = (text: string, length: number) =>
    text.length > length ? `${text.slice(0, length).trim()}…` : text;

  const lines = commands.map((cmd) => {
    const commandId = container.client.application?.commands.cache
      .find(c => c.name === cmd.name)?.id;

    const mention = commandId ? `</${cmd.name}:${commandId}>` : `/${cmd.name}`;
    const description = cmd.description ? truncate(cmd.description, 68) : 'No description available.';

    const options = Array.isArray(cmd.options?.options)
      ? cmd.options.options
          .filter((opt: any) => opt.type !== 1)
          .map((opt: any) => opt.name)
          .slice(0, 3)
          .join(', ')
      : '';

    const subcommands = Array.isArray(cmd.options?.options)
      ? cmd.options.options
          .filter((opt: any) => opt.type === 1)
          .map((opt: any) => opt.name)
          .slice(0, 4)
          .join(', ')
      : '';

    const parts = [`**${mention}**`, `— ${description}`];
    if (options) parts.push(`(${options})`);
    if (subcommands) parts.push(`*(subcommands: ${subcommands})*`);

    return parts.join(' ');
  });

  return new EmbedBuilder()
    .setColor(config.bot.embedColor.default as ColorResolvable)
    .setTitle(`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Commands`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Page ${currentPage}/${totalPages}` });
}
