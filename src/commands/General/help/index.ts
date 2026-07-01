import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  Message,
  type StringSelectMenuInteraction,
  type ButtonInteraction,
  type ColorResolvable,
  type TextChannel,
  PermissionFlagsBits,
  PermissionsBitField,
  MessageFlags,
  Guild as DiscordGuild
} from 'discord.js';
import { Guild as GuildModel } from '../../../models/Guild';
import config from '../../../config';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../../modules/General';
import { getInteractionErrorCode } from '../../../lib/utils/interactionHelpers';
import {
  createDefaultGuildData,
  createHelpModuleSelect,
  createHelpPaginationButtons,
  paginateItems,
  sendInteractionErrorMessage
} from '../../../lib/utils/helpCommandHelpers';
import { Args, CommandOptions } from '@sapphire/framework';
import { getFilteredModules } from './_permissions';
import { getMemberPermissions } from './_permissions';
import {
  buildHelpEmbed,
  createHomeButton,
  updateHelpResponse,
  generateCommandEmbed,
  getCommandCategories
} from './_rendering';

const COMMANDS_PER_PAGE = 11;

interface ExtendedCommand extends Command<Args, CommandOptions> {
  category: string | null;
}

@ApplyOptions<Command.Options>({
  name: 'help',
  description: 'Shows all available commands',
  enabled: true
})
export class HelpCommand extends ModuleCommand<GeneralModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'General', description: 'Shows all available commands', enabled: true });
  }

  public override async registerApplicationCommands(registry: Command.Registry): Promise<void> {
    await registry.registerChatInputCommand((builder) =>
      builder
        .setName('help')
        .setDescription('Shows all available commands')
        .setContexts(0, 1, 2)
        .setIntegrationTypes(0, 1)
        .addStringOption(option =>
          option.setName('command').setDescription('Get help for a specific command').setRequired(false).setAutocomplete(true)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      const commandName = interaction.options.getString('command');

      if (commandName) {
        await this.showCommandHelp(interaction, commandName);
      } else {
        await this.handleHelp(interaction);
      }
    } catch (error) {
      this.container.logger.error('Error in help command:', error);
      try {
        await interaction.editReply({ content: 'An error occurred while loading the help menu. Please try again later.' });
      } catch (e) {
        try {
          await interaction.reply({ content: 'An error occurred while loading the help menu. Please try again later.', flags: MessageFlags.Ephemeral });
        } catch (finalError) {
          this.container.logger.error('Failed to respond to interaction:', finalError);
        }
      }
    }
  }

  private async handleHelp(interaction: Command.ChatInputCommandInteraction | Message) {
    const isSlash = 'options' in interaction;
    const guildId = isSlash ? interaction.guildId : interaction.guild?.id;
    const member = isSlash ? interaction.member : (interaction as Message).member;
    const memberPermissions = getMemberPermissions(member);

    if (!guildId) {
      return this.handleDMHelp(interaction);
    }

    let guildData: Record<string, unknown> | null = null;
    try {
      guildData = await Promise.race([
        GuildModel.findOne({ guildId }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 10000))
      ]) as Record<string, unknown> | null;
    } catch (error) {
      this.container.logger.error('Database error in help command:', error);
      guildData = createDefaultGuildData(guildId);
    }

    if (!guildData) {
      guildData = createDefaultGuildData(guildId);
      try {
        const newGuildData = new GuildModel(guildData);
        await newGuildData.save();
        this.container.logger.info(`Created default guild data for guild ${guildId}`);
      } catch (saveError) {
        this.container.logger.error(`Failed to save default guild data for guild ${guildId}:`, saveError);
      }
    }

    const categories = getCommandCategories();
    const filteredModules = await getFilteredModules(
      categories, guildData, interaction.guild as DiscordGuild | null, interaction, memberPermissions
    );

    const moduleSelect = createHelpModuleSelect(filteredModules);
    const mainEmbed = buildHelpEmbed(filteredModules);
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(moduleSelect);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(createHomeButton(true));

    const response = await (isSlash
      ? (interaction as Command.ChatInputCommandInteraction).editReply({ embeds: [mainEmbed], components: [selectRow, buttonRow] })
      : (interaction.channel as TextChannel).send({ embeds: [mainEmbed], components: [selectRow, buttonRow] }));

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === (isSlash ? interaction.user.id : (interaction as Message).author.id),
      time: 300000
    });

    collector.on('collect', async (i: ButtonInteraction | StringSelectMenuInteraction) => {
      try {
        if (i.isStringSelectMenu()) {
          await this.handleModuleSelect(i, filteredModules, categories);
        } else if (i.isButton()) {
          if (i.customId === 'help-home') {
            const mainEmbed = buildHelpEmbed(filteredModules);
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(moduleSelect);
            const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(createHomeButton(true));
            await updateHelpResponse(i, mainEmbed, [selectRow, buttonRow]);
          } else {
            await this.handlePaginationButton(i);
          }
        }
      } catch (error) {
        this.container.logger.error('Error handling interaction in collector:', error);
        if (getInteractionErrorCode(error) === 10062) {
          this.container.logger.debug('Interaction expired, ignoring...');
        } else {
          await sendInteractionErrorMessage(i as ButtonInteraction, 'An error occurred while processing your request.');
        }
      }
    });

    collector.on('end', async () => {
      try {
        const expiredEmbed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('Help Menu Expired')
          .setDescription('This help menu has expired. Use `/help` to open a new one.')
          .setTimestamp();

        if (response instanceof Message) {
          await response.edit({ embeds: [expiredEmbed], components: [] }).catch(() => null);
        } else if (isSlash) {
          await (interaction as Command.ChatInputCommandInteraction).editReply({ embeds: [expiredEmbed], components: [] }).catch(() => null);
        }
      } catch (error) {
        this.container.logger.error('Error updating message on collector end:', error);
      }
    });
  }

  private async handleDMHelp(interaction: Command.ChatInputCommandInteraction | Message) {
    const isSlash = 'options' in interaction;
    const userId = isSlash ? interaction.user.id : (interaction as Message).author.id;

    const commands = Array.from(container.stores.get('commands').values() as IterableIterator<ExtendedCommand>)
      .filter(cmd => !cmd.options?.preconditions?.includes('GuildOnly'));

    const COMMANDS_PER_DM_PAGE = 7;
    const needsPagination = commands.length > COMMANDS_PER_DM_PAGE;

    const pages: ExtendedCommand[][] = [];
    for (let i = 0; i < commands.length; i += COMMANDS_PER_DM_PAGE) {
      pages.push(commands.slice(i, i + COMMANDS_PER_DM_PAGE));
    }

    const generateEmbed = (pageIndex: number) => {
      const pageCommands = pages[pageIndex];
      return new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('Available Commands')
        .setDescription(
          'Here are the commands you can use in Direct Messages:\n\n' +
          pageCommands.map(cmd => {
            const commandId = this.container.client.application?.commands.cache.find(c => c.name === cmd.name)?.id;
            const commandMention = commandId ? `</${cmd.name}:${commandId}>` : `\`/${cmd.name}\``;
            return `${commandMention}\n↳ ${cmd.description || 'No description available'}\n`;
          }).join('\n')
        )
        .setFooter({ text: needsPagination ? `Page ${pageIndex + 1}/${pages.length}` : 'Help Menu' });
    };

    const embed = generateEmbed(0);
    const components = needsPagination
      ? [new ActionRowBuilder<ButtonBuilder>().addComponents(...createHelpPaginationButtons(0, pages.length))]
      : [];

    const response = await (isSlash
      ? (interaction as Command.ChatInputCommandInteraction).editReply({ embeds: [embed], components })
      : (interaction.channel as any).send({ embeds: [embed], components }));

    if (!needsPagination) return response;

    const collector = response.createMessageComponentCollector({
      filter: (i: ButtonInteraction) => i.user.id === userId,
      time: 300000
    });

    collector.on('collect', async (i: ButtonInteraction) => {
      try {
        const footerText = i.message.embeds[0].footer?.text;
        if (!footerText) return;
        const match = footerText.match(/Page (\d+)\/(\d+)/);
        if (!match) return;

        const currentPage = parseInt(match[1]) - 1;
        let newPage = currentPage;
        if (i.customId === 'previous') newPage--;
        if (i.customId === 'next') newPage++;

        if (newPage < 0 || newPage >= pages.length) return;

        const newEmbed = generateEmbed(newPage);
        const newButtons = createHelpPaginationButtons(newPage, pages.length);
        await i.update({ embeds: [newEmbed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...newButtons)] });
      } catch (error) {
        this.container.logger.error('Error handling DM help pagination:', error);
        if (getInteractionErrorCode(error) === 10062) {
          this.container.logger.debug('DM help interaction expired, ignoring...');
        }
      }
    });

    collector.on('end', () => {
      try {
        if (response instanceof Message) {
          response.edit({ components: [] }).catch(() => null);
        } else if (isSlash) {
          (interaction as Command.ChatInputCommandInteraction).editReply({ components: [] }).catch(() => null);
        }
      } catch (error) {
        this.container.logger.error('Error removing components on DM help collector end:', error);
      }
    });

    return response;
  }

  private async showCommandHelp(interaction: Command.ChatInputCommandInteraction, commandName: string) {
    const commandStore = this.container.client.stores.get('commands');
    const command = Array.from(commandStore.values()).find(
      cmd => cmd.name.toLowerCase() === commandName.toLowerCase()
    ) as ExtendedCommand | undefined;

    if (!command) {
      return interaction.editReply({ content: `Command \`/${commandName}\` was not found.` });
    }

    const requiredPerms = command.options?.requiredUserPermissions;
    if (requiredPerms && interaction.member?.permissions instanceof PermissionsBitField &&
      !(interaction.member.permissions as Readonly<PermissionsBitField>).has(requiredPerms)) {
      return interaction.editReply({ content: `You don't have the required permissions to view this command.` });
    }

    const commandId = this.container.client.application?.commands.cache.find(c => c.name === command.name)?.id;

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor.default as ColorResolvable)
      .setTitle(`Command: /${command.name}`);

    let description = `${command.description || 'No description available'}\n`;

    if (command.category) {
      description += `> **Module:** \` ${command.category} \` \n`;
    }

    if (command.options?.requiredUserPermissions) {
      const perms = Array.isArray(command.options.requiredUserPermissions)
        ? command.options.requiredUserPermissions
        : [command.options.requiredUserPermissions];

      const permNames = perms.map(perm => {
        if (typeof perm === 'string') return perm;
        return Object.keys(PermissionFlagsBits).find(
          key => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] === perm
        ) || String(perm);
      });

      description += `\n**Required Permissions:** ${permNames.join(', ')}\n`;
    }

    const hasSubcommandOptions = command.options?.options &&
      Array.isArray(command.options.options) &&
      command.options.options.some((opt) => opt.type === 1);

    if (hasSubcommandOptions) {
      description += '\n**Subcommands:**\n';

      const appCommand = this.container.client.application?.commands.cache.find(c => c.name === command.name);

      if (appCommand && commandId) {
        const subcommands = appCommand.options
          .filter(opt => opt.type === 1)
          .map(opt => `</${command.name} ${opt.name}:${commandId}> - ${opt.description}`);

        if (subcommands.length > 0) {
          description += subcommands.join('\n');
        } else {
          description += '*No subcommands found in application command data*';
        }
      } else {
        const cmdOptions = command.options?.options;
        const subcommandOptions = Array.isArray(cmdOptions)
          ? cmdOptions.filter((opt) => opt.type === 1)
          : [];

        if (subcommandOptions && subcommandOptions.length > 0) {
          description += subcommandOptions
            .map((opt) => `\`/${command.name} ${opt.name}\` - ${opt.description || 'No description'}`)
            .join('\n');
        } else {
          description += '*Use the command to see available subcommands*';
        }
      }
    } else {
      const cmdOptions = command.options?.options;
      if (cmdOptions && Array.isArray(cmdOptions) && cmdOptions.length > 0) {
        description += '\n**Options:**\n';
        description += cmdOptions
          .map((opt) => {
            const required = opt.required ? ' *(required)*' : '';
            return `\`${opt.name}\` - ${opt.description || 'No description'}${required}`;
          })
          .join('\n');
      }
    }

    description += '> **Usage:** ';
    if (commandId) {
      description += `</${command.name}:${commandId}>`;
    } else {
      description += `\`/${command.name}\``;
    }

    if (hasSubcommandOptions) {
      const cmdOptions = command.options?.options;
      const firstSubcommand = Array.isArray(cmdOptions)
        ? cmdOptions.find((opt: any) => opt.type === 1)
        : undefined;

      if (firstSubcommand) {
        description += `\n${commandId
          ? `</${command.name} ${firstSubcommand.name}:${commandId}>`
          : `\`/${command.name} ${firstSubcommand.name}\``}`;
      }
    }

    embed.setDescription(description);
    return interaction.editReply({ embeds: [embed] });
  }

  private async handleModuleSelect(interaction: StringSelectMenuInteraction, filteredModules: string[], categories: string[]) {
    try {
      const selectedModule = interaction.values[0];

      const commands = Array.from(container.stores.get('commands').values() as IterableIterator<ExtendedCommand>)
        .filter(cmd => {
          if (cmd.category?.toLowerCase() !== selectedModule) return false;
          const requiredPerms = cmd.options?.requiredUserPermissions;
          if (requiredPerms) {
            return interaction.member?.permissions instanceof PermissionsBitField;
          }
          return true;
        });

      if (!commands.length) {
        const categoriesSet = new Set<string>();
        for (const command of container.stores.get('commands').values()) {
          if (command.category) categoriesSet.add(command.category);
        }

        const moduleSelect = createHelpModuleSelect(Array.from(categoriesSet));
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(moduleSelect);
        const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(createHomeButton(false));

        await interaction.update({
          embeds: [new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle(`${selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)} Commands`)
            .setDescription('No commands available in this module.')],
          components: [row, buttonRow]
        });
        return;
      }

      const guildId = interaction.guildId!;
      const guildData = await GuildModel.findOne({ guildId }) as Record<string, unknown> | null;
      const memberPermissions = getMemberPermissions(interaction.member);

      const newFilteredModules = await getFilteredModules(
        categories, guildData, interaction.guild as DiscordGuild | null, interaction, memberPermissions
      );

      const moduleSelect = createHelpModuleSelect(newFilteredModules);
      const pages = paginateItems(commands, COMMANDS_PER_PAGE);
      const embed = generateCommandEmbed(pages[0], selectedModule, 1, pages.length);
      const buttons = createHelpPaginationButtons(0, pages.length);

      const components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] = [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(moduleSelect),
        new ActionRowBuilder<ButtonBuilder>().addComponents(createHomeButton(false))
      ];

      if (pages.length > 1) {
        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons));
      }

      await interaction.update({ embeds: [embed], components });
    } catch (error) {
      this.container.logger.error('Error in handleModuleSelect:', error);
      if (getInteractionErrorCode(error) === 10062) {
        this.container.logger.debug('Module select interaction expired, ignoring...');
        return;
      }
      try {
        await interaction.update({ content: 'An error occurred while fetching commands.', components: [] }).catch(() => null);
      } catch (updateError) {
        this.container.logger.error('Failed to update interaction:', updateError);
      }
    }
  }

  public async handlePaginationButton(interaction: ButtonInteraction) {
    try {
      if (Date.now() - interaction.createdTimestamp > 14 * 60 * 1000) {
        this.container.logger.debug('Pagination interaction expired, ignoring...');
        return;
      }

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }

      const footerText = interaction.message.embeds[0].footer?.text;
      if (!footerText) throw new Error('Footer text not found');

      const match = footerText.match(/Page (\d+)\/(\d+)/);
      if (!match) throw new Error('Page information not found in footer');

      const [, currentPageStr, totalPagesStr] = match;
      const currentPage = parseInt(currentPageStr);
      const totalPages = parseInt(totalPagesStr);

      let newPage = currentPage;
      if (interaction.customId === 'previous') newPage--;
      if (interaction.customId === 'next') newPage++;

      if (newPage < 1 || newPage > totalPages) return;

      const titleText = interaction.message.embeds[0].title;
      if (!titleText) throw new Error('Title not found');

      const selectedModule = titleText.split(' ')[0].toLowerCase();

      const commandStore = container.stores.get('commands');
      const commands = Array.from(commandStore.values())
        .filter(cmd => cmd.category?.toLowerCase() === selectedModule) as unknown as ExtendedCommand[];

      const pages = paginateItems(commands, COMMANDS_PER_PAGE);
      const embed = generateCommandEmbed(pages[newPage - 1], selectedModule, newPage, totalPages);
      const buttons = createHelpPaginationButtons(newPage - 1, totalPages);

      const components = [
        interaction.message.components[0] as unknown as ActionRowBuilder<StringSelectMenuBuilder>,
        new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)
      ];

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed], components });
      } else {
        await interaction.update({ embeds: [embed], components });
      }
    } catch (error) {
      this.container.logger.error('Error in handlePaginationButton:', error);
      if (getInteractionErrorCode(error) === 10062) {
        this.container.logger.debug('Pagination interaction expired, ignoring...');
        return;
      }
      await sendInteractionErrorMessage(interaction, 'An error occurred while navigating pages.');
    }
  }

  public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const commandStore = this.container.client.stores.get('commands');
    const commands = Array.from(commandStore.values()) as ExtendedCommand[];

    let filtered = commands;
    if (focusedValue) {
      filtered = commands.filter(cmd =>
        cmd.name.toLowerCase().includes(focusedValue) ||
        (cmd.description && cmd.description.toLowerCase().includes(focusedValue)) ||
        (cmd.category && cmd.category.toLowerCase().includes(focusedValue))
      );
    }

    filtered = filtered.slice(0, 25);

    const choices = filtered.map(cmd => ({
      name: cmd.category ? `${cmd.name} (${cmd.category})` : cmd.name,
      value: cmd.name
    }));

    return interaction.respond(choices);
  }
}
