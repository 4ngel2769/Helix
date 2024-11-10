import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { 
    ActionRowBuilder, 
    ButtonBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuInteraction,
    ButtonInteraction,
    ColorResolvable,
    Message
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
        // Get all available modules
        const modules = this.container.stores.get('modules');
        const enabledModules = [...modules.values()].filter((module: { name: string }) => {
            const moduleStatus = guildData[`is${module.name}Module` as keyof typeof guildData];
            return moduleStatus === undefined || moduleStatus === true;
        });

        // Create module selection menu
        const moduleSelect = new StringSelectMenuBuilder()
            .setCustomId('module-select')
            .setPlaceholder('Select a module')
            .addOptions(
                enabledModules.map(module => ({
                    label: module.name,
                    description: `View ${module.name} commands`,
                    value: module.name.toLowerCase()
                }))
            );

        const mainEmbed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default as ColorResolvable)
            .setTitle('Help Menu')
            .setDescription('Select a module from the dropdown menu below to view its commands.')
            .addFields(
                enabledModules.map(module => ({
                    name: module.name,
                    value: `Use the dropdown to view ${module.name} commands`,
                    inline: true
                }))
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(moduleSelect);

        const response = await (isSlash ? 
            interaction.reply({ embeds: [mainEmbed], components: [row], fetchReply: true }) :
            interaction.channel!.send({ embeds: [mainEmbed], components: [row] }));

        const collector = (response as Message).createMessageComponentCollector({
            filter: i => i.user.id === (isSlash ? interaction.user.id : interaction.author.id),
            time: 300000,
            componentType: ComponentType.StringSelect | ComponentType.Button
        });

        collector.on('collect', async (i) => {
            if (i.isStringSelectMenu()) {
                await this.handleModuleSelect(i, guildData);
            } else if (i.isButton()) {
                await this.handlePaginationButton(i, guildData);
            }
        });

        collector.on('end', () => {
            if (response instanceof Message) {
                response.edit({ components: [] }).catch(() => null);
            }
        });
    }

    private async handleModuleSelect(
        interaction: StringSelectMenuInteraction,
        guildData: IGuild
    ) {
        try {
            const selectedModule = interaction.values[0];
            const commands = Array.from(this.container.stores.get('commands')
                .filter(cmd => cmd.category?.toLowerCase() === selectedModule));

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
            let currentPage = 0;

            const embed = this.generateCommandEmbed(pages[currentPage], selectedModule, currentPage + 1, pages.length);

            const buttons = this.createPaginationButtons(currentPage, pages.length);
            const backButton = new ButtonBuilder()
                .setCustomId('back-to-main')
                .setLabel('Back to Modules')
                .setStyle(ButtonStyle.Secondary);

            const components = [
                new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons),
                new ActionRowBuilder<ButtonBuilder>().addComponents(backButton)
            ] as ActionRowBuilder<ButtonBuilder>[];

            await interaction.update({ embeds: [embed], components });
        } catch (error) {
            console.error('Error in handleModuleSelect:', error);
            await interaction.update({
                content: 'An error occurred while fetching commands.',
                components: []
            }).catch(() => null);
        }
    }

    private async handlePaginationButton(
        interaction: ButtonInteraction,
        guildData: IGuild
    ) {
        if (interaction.customId === 'back-to-main') {
            await this.handleHelp(interaction);
            return;
        }

        // Handle pagination logic here
        const [currentPage, totalPages] = interaction.message.embeds[0].footer!.text
            .match(/Page (\d+)\/(\d+)/)!
            .slice(1)
            .map(Number);

        let newPage = currentPage;
        if (interaction.customId === 'previous') newPage--;
        if (interaction.customId === 'next') newPage++;

        // Update embed and buttons
        const selectedModule = interaction.message.embeds[0].title!.split(' ')[0].toLowerCase();
        const commands = this.container.stores.get('commands')
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
        ] as ActionRowBuilder<ButtonBuilder>[];

        await interaction.update({ embeds: [embed], components });
    }

    private generateCommandPages(commands: Command[]) {
        if (!commands.length) {
            return [[]] as Command[][];
        }
        const pages: Command[][] = [];
        for (let i = 0; i < commands.length; i += COMMANDS_PER_PAGE) {
            pages.push(Array.from(commands).slice(i, i + COMMANDS_PER_PAGE));
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

        if (commands.length === 0) {
            embed.setDescription('No commands available in this module.');
            return embed;
        }

        commands.forEach(cmd => {
            embed.addFields({
                name: `/${cmd.name}`,
                value: cmd.description || 'No description available',
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