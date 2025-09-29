import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command, CommandOptions, container } from '@sapphire/framework';
import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder,
    ButtonStyle,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
    ButtonInteraction,
    ColorResolvable,
    Message,
    TextChannel,
    PermissionFlagsBits,
    PermissionsBitField,
    MessageFlags
} from 'discord.js';
import { Guild as DiscordGuild } from 'discord.js';
import { Guild as GuildModel } from '../../models/Guild';
import config from '../../config';
import { Module, Modules, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import { Result } from '@sapphire/result';
import { ModuleCommand, ModuleCommandUnion } from '@kbotdev/plugin-modules';
import { GeneralModule } from '../../modules/General';
import { getAllModuleKeys, getModuleConfig } from '../../config/modules';

const COMMANDS_PER_PAGE = 5;

interface ExtendedCommand extends Command<Args, CommandOptions> {
    category: string | null;
}

interface CommandPermissions {
    [key: string]: bigint[];
}

interface ExtendedModule extends Module {
    name: string;
    IsEnabled: (context: IsEnabledContext) => Promise<Result<boolean, ModuleError>>;
    requiredPermissions?: bigint[];
}

@ApplyOptions<Command.Options>({
    name: 'help',
    description: 'Shows all available commands',
    enabled: true
})
export class HelpCommand extends ModuleCommand<GeneralModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'GeneralModule',
            description: 'Shows all available commands',
            enabled: true
        });
    }

    // Define required permissions for each module
    private modulePermissions: CommandPermissions = {
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

    // Add the missing method
    private createDefaultGuildData(guildId: string) {
        const modules: Record<string, boolean> = {};
        
        // Use our module configs to set default values
        getAllModuleKeys().forEach(moduleKey => {
            const config = getModuleConfig(moduleKey);
            if (config) {
                modules[moduleKey] = config.defaultEnabled;
            }
        });
        
        return { 
            guildId,
            modules
        };
    }

    public override async registerApplicationCommands(registry: Command.Registry): Promise<void> {
        await registry.registerChatInputCommand((builder) =>
            builder
                .setName('help')
                .setDescription('Shows all available commands')
                .setContexts(0, 1, 2)  // All contexts (0=GUILD, 1=BOT_DM, 2=PRIVATE_CHANNEL)
                .setIntegrationTypes(0, 1)  // Both integration types (0=GUILD_INSTALL, 1=USER_INSTALL)
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('Get help for a specific command')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        );
        
        return;
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        try {
            // Defer reply immediately to prevent interaction timeout
            await interaction.deferReply({
                // flags: MessageFlags.Ephemeral
            });
            
            // Check if a specific command was requested
            const commandName = interaction.options.getString('command');
            
            if (commandName) {
                // Show help for the specific command
                await this.showCommandHelp(interaction, commandName);
            } else {
                // Show main help menu with all modules
                await this.handleHelp(interaction);
            }
        } catch (error) {
            console.error('Error in help command:', error);
            // Error handling...
            try {
                await interaction.editReply({
                    content: 'An error occurred while loading the help menu. Please try again later.'
                });
            } catch (e) {
                // Fallback error handling...
                try {
                    await interaction.reply({
                        content: 'An error occurred while loading the help menu. Please try again later.',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (finalError) {
                    console.error('Failed to respond to interaction:', finalError);
                }
            }
        }
    }

    // Add a new method to show commands for a specific module
    // private async showModuleCommands(interaction: Command.ChatInputCommandInteraction, moduleName: string) {
    //     const guildId = interaction.guildId;
    //     const member = interaction.member;
        
    //     // Handle DM case
    //     if (!guildId) {
    //         return interaction.editReply({
    //             embeds: [new EmbedBuilder()
    //                 .setColor('Blurple')
    //                 .setTitle(`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Commands`)
    //                 .setDescription('Module-specific command lists are not available in Direct Messages.')]
    //         });
    //     }
        
    //     // Get guild settings
    //     let guildData;
    //     try {
    //         guildData = await Promise.race([
    //             GuildModel.findOne({ guildId }),
    //             new Promise((_, reject) => 
    //                 setTimeout(() => reject(new Error('Database timeout')), 10000)
    //             )
    //         ]);
    //     } catch (error) {
    //         console.error('Database error in help command:', error);
    //         guildData = this.createDefaultGuildData(guildId);
    //     }
        
    //     if (!guildData) {
    //         guildData = this.createDefaultGuildData(guildId);
    //     }
        
    //     // Check if module is enabled
    //     const moduleStatus = guildData[`is${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module` as keyof typeof guildData];
    //     if (moduleStatus === false) {
    //         return interaction.editReply({
    //             content: `The ${moduleName} module is disabled in this server.`
    //         });
    //     }
        
    //     // Check module's IsEnabled status
    //     const moduleStore = container.stores.get('modules');
    //     const module = moduleStore.get(moduleName.toLowerCase() as keyof Modules) as ExtendedModule | undefined;
        
    //     if (module && typeof module.IsEnabled === 'function') {
    //         const moduleCommand = module.container.stores.get('commands').get(module.name);
            
    //         // Check for required module permissions
    //         if (module.requiredPermissions) {
    //             const hasPermission = module.requiredPermissions.some(perm => {
    //                 if (!member?.permissions) return false;
    //                 return typeof member.permissions === 'bigint'
    //                     ? (member.permissions & perm) === perm
    //                     : (member.permissions as Readonly<PermissionsBitField>).has(perm);
    //             });
    //             if (!hasPermission) {
    //                 return interaction.editReply({
    //                     content: `You don't have the required permissions to view the ${moduleName} module.`
    //                 });
    //             }
    //         }
            
    //         const isEnabled = await module.IsEnabled({
    //             guild: interaction.guild! as DiscordGuild,
    //             interaction: interaction as any,
    //             command: moduleCommand as ModuleCommandUnion
    //         });
    //         if (isEnabled.isErr() || !isEnabled.unwrap()) {
    //             return interaction.editReply({
    //                 content: `The ${moduleName} module is currently unavailable.`
    //             });
    //         }
    //     }
        
    //     // Check if user has required permissions for restricted modules
    //     if (this.modulePermissions[moduleName.charAt(0).toUpperCase() + moduleName.slice(1)]) {
    //         const hasPermission = this.modulePermissions[moduleName.charAt(0).toUpperCase() + moduleName.slice(1)].some(perm => {
    //             if (!member?.permissions) return false;
    //             return typeof member.permissions === 'bigint' 
    //                 ? member.permissions === perm
    //                 : (member.permissions as Readonly<PermissionsBitField>).has(perm);
    //         });
    //         if (!hasPermission) {
    //             return interaction.editReply({
    //                 content: `You don't have the required permissions to view the ${moduleName} module.`
    //             });
    //         }
    //     }
        
    //     // Get commands for the selected module
    //     const commands = Array.from(container.stores.get('commands').values() as IterableIterator<ExtendedCommand>)
    //         .filter(cmd => {
    //             // Filter commands by module
    //             if (cmd.category?.toLowerCase() !== moduleName.toLowerCase()) return false;
    //             // Check if user has required permissions for the command
    //             const requiredPerms = cmd.options?.requiredUserPermissions;
    //             if (requiredPerms) {
    //                 return member?.permissions instanceof PermissionsBitField && 
    //                        (member.permissions as Readonly<PermissionsBitField>).has(requiredPerms);
    //             }
    //             return true;
    //         });
        
    //     if (!commands.length) {
    //         return interaction.editReply({
    //             embeds: [new EmbedBuilder()
    //                 .setColor(config.bot.embedColor.default as ColorResolvable)
    //                 .setTitle(`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Commands`)
    //                 .setDescription('No commands available in this module.')]
    //         });
    //     }
        
    //     const pages = this.generateCommandPages(commands);
    //     const embed = this.generateCommandEmbed(pages[0], moduleName, 1, pages.length);
        
    //     const buttons = this.createPaginationButtons(0, pages.length);
        
    //     const components = pages.length > 1 
    //         ? [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)]
    //         : [];
        
    //     return interaction.editReply({ embeds: [embed], components });
    // }

    private async handleHelp(interaction: Command.ChatInputCommandInteraction | Message) {
        const isSlash = 'options' in interaction;
        const guildId = isSlash ? interaction.guildId : interaction.guild?.id;
        const member = isSlash ? interaction.member : (interaction as Message).member;
        
        // Handle DM case - create simpler embed with available commands
        if (!guildId) {
            return this.handleDMHelp(interaction);
        }
        
        // Get guild settings with improved error handling
        let guildData;
        try {
            // Try to get guild data with a timeout
            guildData = await Promise.race([
                GuildModel.findOne({ guildId }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database timeout')), 10000)
                )
            ]);
        } catch (error) {
            console.error('Database error in help command:', error);
            // Create default guild data as fallback for errors
            guildData = this.createDefaultGuildData(guildId);
        }
        
        // If no guild data exists, create default data instead of showing error
        if (!guildData) {
            guildData = this.createDefaultGuildData(guildId);
            
            // Optionally save the default data to database
            try {
                const newGuildData = new GuildModel(guildData);
                await newGuildData.save();
                console.log(`Created default guild data for guild ${guildId}`);
            } catch (saveError) {
                console.error(`Failed to save default guild data for guild ${guildId}:`, saveError);
                // Continue with the temporary data even if save fails
            }
        }
        
        // Get all categories (modules)
        const categories = new Set<string>();
        for (const command of container.stores.get('commands').values()) {
            if (command.category) categories.add(command.category);
        }

        // Filter modules based on user permissions and enabled status
        const enabledModules = await Promise.all(
            Array.from(categories).map(async (category: string) => {
                // Check if module is enabled in guild
                const moduleStatus = guildData[`is${category}Module` as keyof typeof guildData];
                if (moduleStatus === false) return null;

                // Check module's IsEnabled status
                const moduleStore = container.stores.get('modules');
                const module = moduleStore.get(category.toLowerCase() as keyof Modules) as ExtendedModule | undefined;
                
                if (module && typeof module.IsEnabled === 'function') {
                    const moduleCommand = module.container.stores.get('commands').get(module.name);
                    
                    // Check for required module permissions
                    if (module.requiredPermissions) {
                        const hasPermission = module.requiredPermissions.some(perm => {
                            if (!member?.permissions) return false;
                            return typeof member.permissions === 'bigint'
                                ? (member.permissions & perm) === perm
                                : (member.permissions as Readonly<PermissionsBitField>).has(perm);
                        });
                        if (!hasPermission) return null;
                    }

                    const isEnabled = await module.IsEnabled({
                        guild: interaction.guild! as DiscordGuild,
                        interaction: interaction as any,
                        command: moduleCommand as ModuleCommandUnion
                    });
                    if (isEnabled.isErr() || !isEnabled.unwrap()) return null;
                }

                // Check if user has required permissions for restricted modules
                if (this.modulePermissions[category]) {
                    // Allow if user has any of the required permissions
                    const hasPermission = this.modulePermissions[category].some(perm => {
                        if (!member?.permissions) return false;
                        return typeof member.permissions === 'bigint' 
                            ? member.permissions === perm
                            : (member.permissions as Readonly<PermissionsBitField>).has(perm);
                    });
                    if (!hasPermission) return null;
                }

                return category;
            })
        );

        // Filter out null values and create final array
        const filteredModules = enabledModules.filter((module): module is string => module !== null);

        const moduleSelect = this.createModuleSelect(filteredModules);

        const mainEmbed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle('Help Menu')
            .setDescription(
                'Select a module from the dropdown menu below to view its commands.\n\n' +
                '**Available Modules:**\n' +
                filteredModules.map(module => `> - \`${module}\``).join('\n')
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(moduleSelect);

        const response = await (isSlash ? 
            (interaction as Command.ChatInputCommandInteraction).editReply({ 
                embeds: [mainEmbed], 
                components: [row]
            }) :
            (interaction.channel as TextChannel).send({ embeds: [mainEmbed], components: [row] }));
            
        const collector = response.createMessageComponentCollector({
            filter: (i) => 
                i.user.id === (isSlash ? interaction.user.id : (interaction as Message).author.id),
            time: 300000
        });

        collector.on('collect', async (i: ButtonInteraction | StringSelectMenuInteraction) => {
            if (i.isStringSelectMenu()) {
                await this.handleModuleSelect(i);
            } else if (i.isButton()) {
                await this.handlePaginationButton(i);
            }
        });

        // Update the handleHelp method's collector.on('end') event
        collector.on('end', () => {
            if (response instanceof Message) {
                // Remove all components completely
                response.edit({ components: [] }).catch(() => null);
            } else if (isSlash) {
                // For slash command responses
                (interaction as Command.ChatInputCommandInteraction)
                    .editReply({ components: [] })
                    .catch(() => null);
            }
        });
    }

    // Add this new method to handle DM help requests
    private async handleDMHelp(interaction: Command.ChatInputCommandInteraction | Message) {
        const isSlash = 'options' in interaction;
        const userId = isSlash ? interaction.user.id : (interaction as Message).author.id;
        
        // Get all commands that can be used in DMs
        const commands = Array.from(container.stores.get('commands').values() as IterableIterator<ExtendedCommand>)
            .filter(cmd => !cmd.options?.preconditions?.includes('GuildOnly'));
        
        // Use pagination if we have more than 7 commands
        const COMMANDS_PER_DM_PAGE = 7;
        const needsPagination = commands.length > COMMANDS_PER_DM_PAGE;
        
        // Generate command pages
        const pages: ExtendedCommand[][] = [];
        for (let i = 0; i < commands.length; i += COMMANDS_PER_DM_PAGE) {
            pages.push(commands.slice(i, i + COMMANDS_PER_DM_PAGE));
        }
        
        // Create the initial embed with first page
        const generateEmbed = (pageIndex: number) => {
            const pageCommands = pages[pageIndex];
            return new EmbedBuilder()
                .setColor('Blurple')
                .setTitle('Available Commands')
                .setDescription(
                    'Here are the commands you can use in Direct Messages:\n\n' +
                    pageCommands.map(cmd => {
                        const commandId = this.container.client.application?.commands.cache
                            .find(c => c.name === cmd.name)?.id;
                        
                        const commandMention = commandId 
                            ? `</${cmd.name}:${commandId}>`
                            : `\`/${cmd.name}\``;
                        
                        return `${commandMention}\n↳ ${cmd.description || 'No description available'}\n`;
                    }).join('\n')
                )
                .setFooter({ 
                    text: needsPagination ? `Page ${pageIndex + 1}/${pages.length}` : 'Help Menu' 
                });
        };
        
        // Create initial embed and buttons (if needed)
        const embed = generateEmbed(0);
        
        // Create pagination buttons if needed
        const components = needsPagination 
            ? [new ActionRowBuilder<ButtonBuilder>().addComponents(
                ...this.createPaginationButtons(0, pages.length)
            )] 
            : [];
        
        // Send the response
        const response = await (isSlash ? 
            (interaction as Command.ChatInputCommandInteraction).editReply({ 
                embeds: [embed], 
                components 
            }) :
            (interaction.channel as any).send({ 
                embeds: [embed], 
                components 
            }));
        
        // If we don't need pagination, just return
        if (!needsPagination) return response;
        
        // Set up collector for pagination
        interface DMHelpCollectorFilter {
            (i: ButtonInteraction): boolean;
        }

        interface DMHelpCollectorOptions {
            filter: DMHelpCollectorFilter;
            time: number;
        }

        const collector = response.createMessageComponentCollector({
            filter: (i: ButtonInteraction) => i.user.id === userId,
            time: 300000 // 5 minutes
        } as DMHelpCollectorOptions);
        
        collector.on('collect', async (i: ButtonInteraction) => {
            // Get current page from footer
            const [currentPage] = i.message.embeds[0].footer!.text
                .match(/Page (\d+)\/(\d+)/)!
                .slice(1)
                .map(Number);
            
            let newPage = currentPage - 1; // Convert to 0-based index
            if (i.customId === 'previous') newPage--;
            if (i.customId === 'next') newPage++;
            
            // Update embed with new page
            const newEmbed = generateEmbed(newPage);
            const newButtons = this.createPaginationButtons(newPage, pages.length);
            
            // Update the message
            await i.update({ 
                embeds: [newEmbed], 
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...newButtons)] 
            });
        });
        
        // Update the handleDMHelp method's collector.on('end') event
        collector.on('end', () => {
            if (response instanceof Message) {
                // Remove all components completely
                response.edit({ components: [] }).catch(() => null);
            } else if (isSlash) {
                // For slash command responses
                (interaction as Command.ChatInputCommandInteraction)
                    .editReply({ components: [] })
                    .catch(() => null);
            }
        });
        
        return response;
    }

    private async showCommandHelp(interaction: Command.ChatInputCommandInteraction, commandName: string) {
        // Find the command in the command store
        const commandStore = this.container.client.stores.get('commands');
        const command = Array.from(commandStore.values()).find(
            cmd => cmd.name.toLowerCase() === commandName.toLowerCase()
        ) as ExtendedCommand | undefined;
        
        if (!command) {
            return interaction.editReply({
                content: `Command \`/${commandName}\` was not found.`
            });
        }
        
        // Check if the user has required permissions for this command
        const requiredPerms = command.options?.requiredUserPermissions;
        if (requiredPerms && interaction.member?.permissions instanceof PermissionsBitField && 
            !(interaction.member.permissions as Readonly<PermissionsBitField>).has(requiredPerms)) {
            return interaction.editReply({
                content: `You don't have the required permissions to view this command.`
            });
        }
        
        // Get command ID from application commands for clickable mention
        const commandId = this.container.client.application?.commands.cache
            .find(c => c.name === command.name)?.id;
        
        // Create an embed for this command
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle(`Command: /${command.name}`);
        
        // Base description with command info
        let description = `${command.description || 'No description available'}\n`;
        
        // Check if command is part of a module
        if (command.category) {
            description += `> **Module:** \` ${command.category} \` \n`;
        }
        
        // Check for required permissions
        if (command.options?.requiredUserPermissions) {
            const perms = Array.isArray(command.options.requiredUserPermissions)
                ? command.options.requiredUserPermissions
                : [command.options.requiredUserPermissions];
                
            const permNames = perms.map(perm => {
                if (typeof perm === 'string') return perm;
                // Convert permission flag bits to readable names
                return Object.keys(PermissionFlagsBits).find(
                    key => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] === perm
                ) || String(perm);
            });
            
            description += `\n**Required Permissions:** ${permNames.join(', ')}\n`;
        }
        
        // Check if command has subcommands
        const hasSubcommandOptions = command.options?.options && 
            Array.isArray(command.options.options) && 
            command.options.options.some((opt: any) => opt.type === 1);
            
        if (hasSubcommandOptions) {
            description += '\n**Subcommands:**\n';
            
            // Try to get application command data for clickable mentions
            const appCommand = this.container.client.application?.commands.cache
                .find(c => c.name === command.name);
                
            if (appCommand && commandId) {
                // Get subcommands from application command options
                const subcommands = appCommand.options
                    .filter(opt => opt.type === 1) // Type 1 is subcommand
                    .map(opt => {
                        // Create clickable subcommand mention
                        return `</${command.name} ${opt.name}:${commandId}> - ${opt.description}`;
                    });
                
                if (subcommands.length > 0) {
                    description += subcommands.join('\n');
                } else {
                    description += '*No subcommands found in application command data*';
                }
            } else {
                // Fallback if we can't get application command data
                const cmdOptions = command.options?.options;
                const subcommandOptions = Array.isArray(cmdOptions) 
                    ? cmdOptions.filter((opt: any) => opt.type === 1)
                    : [];
                    
                if (subcommandOptions && subcommandOptions.length > 0) {
                    description += subcommandOptions
                        .map((opt: any) => `\`/${command.name} ${opt.name}\` - ${opt.description || 'No description'}`)
                        .join('\n');
                } else {
                    description += '*Use the command to see available subcommands*';
                }
            }
        } else {
            // Check for regular options
            const cmdOptions = command.options?.options;
            if (cmdOptions && Array.isArray(cmdOptions) && cmdOptions.length > 0) {
                description += '\n**Options:**\n';
                
                description += cmdOptions
                    .map((opt: any) => {
                        const required = opt.required ? ' *(required)*' : '';
                        return `\`${opt.name}\` - ${opt.description || 'No description'}${required}`;
                    })
                    .join('\n');
            }
        }
        
        // Add usage examples section
        description += '> **Usage:** ';
        
        // Basic usage
        if (commandId) {
            description += `</${command.name}:${commandId}>`;
        } else {
            description += `\`/${command.name}\``;
        }
        
        // If has subcommands, add example with first subcommand
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

    private async handleModuleSelect(interaction: StringSelectMenuInteraction) {
        try {
            const selectedModule = interaction.values[0];
            
            // Get commands for the selected module
            const commands = Array.from(container.stores.get('commands').values() as IterableIterator<ExtendedCommand>)
                .filter(cmd => {
                    // Filter commands by module
                    if (cmd.category?.toLowerCase() !== selectedModule) return false;
                    // Check if user has required permissions for the command
                    const requiredPerms = cmd.options?.requiredUserPermissions;
                    if (requiredPerms) {
                        return interaction.member?.permissions instanceof PermissionsBitField;
                    }

                    return true;
                });

            if (!commands.length) {
                // Get all categories (modules)
                const categories = new Set<string>();
                for (const command of container.stores.get('commands').values()) {
                    if (command.category) categories.add(command.category);
                }
                
                // Recreate the module select dropdown
                const moduleSelect = this.createModuleSelect(Array.from(categories));
                
                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(moduleSelect);
                    
                await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor(config.bot.embedColor.default as ColorResolvable)
                        .setTitle(`${selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)} Commands`)
                        .setDescription('No commands available in this module.')],
                    components: [row]
                });
                return;
            }

            // Get all enabled modules to recreate dropdown
            const guildId = interaction.guildId!;
            const guildData = await GuildModel.findOne({ guildId });
            
            // Get all categories (modules) for the dropdown
            const categories = new Set<string>();
            for (const command of container.stores.get('commands').values()) {
                if (command.category) categories.add(command.category);
            }

            // Filter modules based on user permissions and enabled status
            const enabledModules = await Promise.all(
                Array.from(categories).map(async (category: string) => {
                    // Check if module is enabled in guild
                    const moduleStatus = guildData?.[`is${category}Module` as keyof typeof guildData];
                    if (moduleStatus === false) return null;

                    // Check module's IsEnabled status
                    const moduleStore = container.stores.get('modules');
                    const module = moduleStore.get(category.toLowerCase() as keyof Modules) as ExtendedModule | undefined;
                    
                    if (module && typeof module.IsEnabled === 'function') {
                        const moduleCommand = module.container.stores.get('commands').get(module.name);
                        
                        // Check for required module permissions
                        if (module.requiredPermissions) {
                            const hasPermission = module.requiredPermissions.some(perm => {
                                if (!interaction.member?.permissions) return false;
                                return typeof interaction.member.permissions === 'bigint'
                                    ? (interaction.member.permissions & perm) === perm
                                    : (interaction.member.permissions as Readonly<PermissionsBitField>).has(perm);
                            });
                            if (!hasPermission) return null;
                        }

                        const isEnabled = await module.IsEnabled({
                            guild: interaction.guild! as DiscordGuild,
                            interaction: interaction as any,
                            command: moduleCommand as ModuleCommandUnion
                        });
                        if (isEnabled.isErr() || !isEnabled.unwrap()) return null;
                    }

                    // Check if user has required permissions for restricted modules
                    if (this.modulePermissions[category]) {
                        // Allow if user has any of the required permissions
                        const hasPermission = this.modulePermissions[category].some(perm => {
                            if (!interaction.member?.permissions) return false;
                            return typeof interaction.member.permissions === 'bigint' 
                                ? interaction.member.permissions === perm
                                : (interaction.member.permissions as Readonly<PermissionsBitField>).has(perm);
                        });
                        if (!hasPermission) return null;
                    }

                    return category;
                })
            );

            // Filter out null values
            const filteredModules = enabledModules.filter((module): module is string => module !== null);

            const moduleSelect = this.createModuleSelect(filteredModules);
            
            const pages = this.generateCommandPages(commands);
            const embed = this.generateCommandEmbed(pages[0], selectedModule, 1, pages.length);

            // Create navigation buttons for pagination
            const buttons = this.createPaginationButtons(0, pages.length);

            // Set up components with dropdown always in first row
            const components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] = [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(moduleSelect)
            ];
            
            // Only add pagination buttons if needed
            if (pages.length > 1) {
                components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons));
            }

            await interaction.update({ embeds: [embed], components });
        } catch (error) {
            console.error('Error in handleModuleSelect:', error);
            await interaction.update({
                content: 'An error occurred while fetching commands.',
                components: []
            }).catch(() => null);
        }
    }

    private async handlePaginationButton(interaction: ButtonInteraction) {
        // Remove the back-to-main handler since we're keeping the dropdown menu
    
        // Get current page and total pages from footer text
        const [currentPage, totalPages] = interaction.message.embeds[0].footer!.text
            .match(/Page (\d+)\/(\d+)/)!
            .slice(1)
            .map(Number);

        let newPage = currentPage;
        if (interaction.customId === 'previous') newPage--;
        if (interaction.customId === 'next') newPage++;
        
        // Get module name from title
        const selectedModule = interaction.message.embeds[0].title!.split(' ')[0].toLowerCase();
        
        // Get commands for this module
        const commandStore = container.stores.get('commands');
        const commands = Array.from(commandStore.values())
            .filter(cmd => cmd.category?.toLowerCase() === selectedModule) as unknown as ExtendedCommand[];

        // Generate new embed with updated page
        const pages = this.generateCommandPages(commands);
        const embed = this.generateCommandEmbed(pages[newPage - 1], selectedModule, newPage, totalPages);
        
        // Create pagination buttons with proper disabled states
        const buttons = this.createPaginationButtons(newPage - 1, totalPages);

        // Preserve the existing dropdown menu from the first component row
        // This ensures the dropdown stays the same
        
        // Set up components with dropdown always in first row
        const components = [
            // Cast as ActionRowBuilder with correct generic type
            interaction.message.components[0] as unknown as ActionRowBuilder<StringSelectMenuBuilder>,
            new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)
        ];

        await interaction.update({ embeds: [embed], components });
    }

    private generateCommandPages(commands: ExtendedCommand[]) {
        const pages: ExtendedCommand[][] = [];
        for (let i = 0; i < commands.length; i += COMMANDS_PER_PAGE) {
            pages.push(commands.slice(i, i + COMMANDS_PER_PAGE));
        }
        return pages;
    }

    private generateCommandEmbed(
        commands: ExtendedCommand[],
        moduleName: string,
        currentPage: number,
        totalPages: number
    ) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle(`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Commands`)
            .setDescription(
                commands.map(cmd => {
                    // Get command ID from application commands
                    const commandId = this.container.client.application?.commands.cache
                        .find(c => c.name === cmd.name)?.id;

                    // Create clickable command mention
                    const commandMention = commandId 
                        ? `</${cmd.name}:${commandId}>`
                        : `\`/${cmd.name}\``;

                    // Check if the command has subcommands
                    const hasSubcommandOptions = cmd.options?.options && 
                        Array.isArray(cmd.options.options) && 
                        cmd.options.options.some((opt: any) => opt.type === 1); // Type 1 is subcommand

                    const hasSubcommands = !!hasSubcommandOptions;

                    if (hasSubcommands) {
                        // Get the application command from the cache to retrieve subcommands
                        const appCommand = this.container.client.application?.commands.cache
                            .find(c => c.name === cmd.name);

                        // Start with the main command description
                        let description = `${cmd.description || 'No description available'}\n`;
                        description += '\n**Subcommands:**\n';

                        // If we have access to the application command data (preferred method)
                        if (appCommand && commandId) {
                            // Get subcommands from application command options
                            const subcommands = appCommand.options
                                .filter(opt => opt.type === 1) // Type 1 is subcommand
                                .map(opt => {
                                    // Create clickable subcommand mention format
                                    return `</${cmd.name} ${opt.name}:${commandId}> - ${opt.description}`;
                            });
                        
                        if (subcommands.length > 0) {
                            description += subcommands.join('\n');
                        } else {
                            description += '*No subcommands found in application command data*';
                        }
                        } else {
                            // Fallback if we can't get application command data
                            const cmdOptions = cmd.options?.options;
                            const subcommandOptions = Array.isArray(cmdOptions) 
                                ? cmdOptions.filter((opt: any) => opt.type === 1)
                                : [];
                                
                            if (subcommandOptions && subcommandOptions.length > 0) {
                                description += subcommandOptions
                                    .map((opt: any) => `\`/${cmd.name} ${opt.name}\` - ${opt.description || 'No description'}`)
                                    .join('\n');
                            } else {
                                description += '*Use the command to see available subcommands*';
                            }
                        }

                        return `${commandMention}\n↳ ${description}\n`;
                    } else {
                        // Handle regular commands (no subcommands) like before
                        const cmdOptions = cmd.options?.options;
                        const options = Array.isArray(cmdOptions)
                            ? cmdOptions
                                .filter((opt: any) => opt.type !== 1) // Filter out subcommands
                                .map((opt: any) => `\`${opt.name}\``)
                                .join(', ')
                            : undefined;

                        return `${commandMention}\n↳ ${cmd.description || 'No description available'}${
                            options ? `\nOptions: ${options}` : ''
                        }\n`;
                    }
                }).join('\n')
            )
            .setFooter({ text: `Page ${currentPage}/${totalPages}` });

        return embed;
    }

    private createModuleSelect(modules: string[]) {
        return new StringSelectMenuBuilder()
            .setCustomId('module-select')
            .setPlaceholder('Select a module')
            .addOptions(
                modules.map(moduleName => {
                    // Get module config from our modules config file
                    const moduleConfig = getModuleConfig(moduleName);
                    
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(moduleConfig?.name || moduleName)
                        .setDescription(moduleConfig?.description || `View ${moduleName} commands`)
                        .setValue(moduleName.toLowerCase())
                        .setEmoji(
                            typeof moduleConfig?.emoji === 'object'
                                ? (moduleConfig.emoji.id
                                    ? `${moduleConfig.emoji.animated ? '<a:' : '<:'}${moduleConfig.emoji.name}:${moduleConfig.emoji.id}>`
                                    : moduleConfig.emoji.name || '📦')
                                : moduleConfig?.emoji || '📦'
                        );
                })
            );
    }

    private createPaginationButtons(currentPage: number, totalPages: number) {
        const previousButton = new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === totalPages - 1);

        return [previousButton, nextButton];
    }

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const commandStore = this.container.client.stores.get('commands');
        const commands = Array.from(commandStore.values()) as ExtendedCommand[];
        
        // Filter commands based on user's input
        let filtered = commands;
        
        if (focusedValue) {
            filtered = commands.filter(cmd => 
                cmd.name.toLowerCase().includes(focusedValue) ||
                (cmd.description && cmd.description.toLowerCase().includes(focusedValue)) ||
                (cmd.category && cmd.category.toLowerCase().includes(focusedValue))
            );
        }
        
        // Limit to 25 choices (Discord maximum)
        filtered = filtered.slice(0, 25);
        
        // Format the responses
        const choices = filtered.map(cmd => ({
            name: cmd.category 
                ? `${cmd.name} (${cmd.category})` 
                : cmd.name,
            value: cmd.name
        }));
        
        return interaction.respond(choices);
    }
}