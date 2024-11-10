import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder,
    ButtonStyle,
    StringSelectMenuInteraction,
    ButtonInteraction,
    ColorResolvable,
    Message,
    TextChannel
} from 'discord.js';
import { Guild } from '../../models/Guild';
import config from '../../config';

const COMMANDS_PER_PAGE = 5;

@ApplyOptions<Command.Options>({
    name: 'help',
    description: 'Shows all available commands',
    enabled: true
})
export class HelpCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('help')
                .setDescription('Shows all available commands')
                .addStringOption((option) =>
                    option
                        .setName('module')
                        .setDescription('Specific module to show commands for')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await this.handleHelp(interaction);
    }

    public override async messageRun(message: Message) {
        await this.handleHelp(message);
    }

    private async handleHelp(interaction: Command.ChatInputCommandInteraction | Message) {
        const isSlash = 'options' in interaction;
        const guildId = isSlash ? interaction.guildId! : interaction.guild!.id;
        
        // Get guild settings
        const guildData = await Guild.findOne({ guildId });
        if (!guildData) return;

        // Get all categories (modules)
        const categories = new Set<string>();
        for (const command of container.stores.get('commands').values()) {
            if (command.category) categories.add(command.category);
        }

        // Filter enabled modules
        const enabledModules = Array.from(categories).filter(category => {
            const moduleStatus = guildData[`is${category}Module` as keyof typeof guildData];
            return moduleStatus === undefined || moduleStatus === true;
        });

        // Create module selection menu
        const moduleSelect = new StringSelectMenuBuilder()
            .setCustomId('module-select')
            .setPlaceholder('Select a module')
            .addOptions(
                enabledModules.map(module => ({
                    label: module,
                    description: `View ${module} commands`,
                    value: module.toLowerCase()
                }))
            );

        const mainEmbed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle('Help Menu')
            .setDescription('Select a module from the dropdown menu below to view its commands.')
            .addFields(
                enabledModules.map(module => ({
                    name: module,
                    value: `Use the dropdown to view ${module} commands`,
                    inline: true
                }))
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(moduleSelect);

        const response = await (isSlash ? 
            interaction.reply({ embeds: [mainEmbed], components: [row], fetchReply: true }) :
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

        collector.on('end', () => {
            if (response instanceof Message) {
                response.edit({ components: [] }).catch(() => null);
            }
        });
    }

    private async handleModuleSelect(interaction: StringSelectMenuInteraction) {
        try {
            const selectedModule = interaction.values[0];
            const commands = Array.from(container.stores.get('commands').values())
                .filter(cmd => cmd.category?.toLowerCase() === selectedModule);

            if (!commands.length) {
                await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor(config.bot.embedColor.default as ColorResolvable)
                        .setTitle(`${selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)} Commands`)
                        .setDescription('No commands available in this module.')],
                    components: [new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(new ButtonBuilder()
                            .setCustomId('back-to-main')
                            .setLabel('Back to Modules')
                            .setStyle(ButtonStyle.Secondary))]
                });
                return;
            }

            const pages = this.generateCommandPages(commands);
            const embed = this.generateCommandEmbed(pages[0], selectedModule, 1, pages.length);

            const buttons = this.createPaginationButtons(0, pages.length);
            const backButton = new ButtonBuilder()
                .setCustomId('back-to-main')
                .setLabel('Back to Modules')
                .setStyle(ButtonStyle.Secondary);

            const components = [
                new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons),
                new ActionRowBuilder<ButtonBuilder>().addComponents(backButton)
            ];

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
        if (interaction.customId === 'back-to-main') {
            await this.handleHelp(interaction.message as Message);
            return;
        }

        const [currentPage] = interaction.message.embeds[0].footer!.text
            .match(/Page (\d+)\/(\d+)/)!
            .slice(1)
            .map(Number);

        let newPage = currentPage;
        if (interaction.customId === 'previous') newPage--;
        if (interaction.customId === 'next') newPage++;

        const selectedModule = interaction.message.embeds[0].title!.split(' ')[0].toLowerCase();
        const commands = Array.from(container.stores.get('commands').values())
            .filter(cmd => cmd.category?.toLowerCase() === selectedModule);

        const pages = this.generateCommandPages(commands);
        const embed = this.generateCommandEmbed(pages[newPage - 1], selectedModule, newPage, pages.length);
        const buttons = this.createPaginationButtons(newPage - 1, pages.length);

        const backButton = new ButtonBuilder()
            .setCustomId('back-to-main')
            .setLabel('Back to Modules')
            .setStyle(ButtonStyle.Secondary);

        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons),
            new ActionRowBuilder<ButtonBuilder>().addComponents(backButton)
        ];

        await interaction.update({ embeds: [embed], components });
    }

    private generateCommandPages(commands: Command[]) {
        const pages: Command[][] = [];
        for (let i = 0; i < commands.length; i += COMMANDS_PER_PAGE) {
            pages.push(commands.slice(i, i + COMMANDS_PER_PAGE));
        }
        return pages;
    }

    private generateCommandEmbed(
        commands: Command[],
        moduleName: string,
        currentPage: number,
        totalPages: number
    ) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle(`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Commands`)
            .setFooter({ text: `Page ${currentPage}/${totalPages}` });
        commands.forEach(cmd => {
            const options = cmd.options && Array.isArray(cmd.options)
                ? `\nOptions: ${cmd.options.map(opt => `\`${opt.name}\``).join(', ')}`
                : '';
            
            embed.addFields({
                name: `/${cmd.name}`,
                value: (cmd.description || 'No description available') + options,
                inline: false
            });
        });

        return embed;
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
} 