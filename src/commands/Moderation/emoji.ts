import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ModerationModule } from '../../modules/Moderation';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, EmbedBuilder, ColorResolvable } from 'discord.js';
import { ErrorHandler } from '../../lib/structures/ErrorHandler';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'emoji',
    description: 'Add an emoji to the server',
    preconditions: ['GuildOnly', 'ModeratorOnly']
})
export class EmojiCommand extends ModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Moderation',
            description: 'Add an emoji to the server',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('emoji')
                .setDescription('Add an emoji to the server')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a new emoji to the server')
                        .addStringOption((option) =>
                            option
                                .setName('url')
                                .setDescription('The URL of the emoji image')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('The name for the emoji (no spaces)')
                                .setRequired(true)
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            // Check bot permissions
            if (!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
                return ErrorHandler.sendPermissionError(interaction, 'ManageEmojisAndStickers');
            }

            const url = interaction.options.getString('url', true);
            let name = interaction.options.getString('name', true);

            // Clean the emoji name
            name = name.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

            if (name.length < 2 || name.length > 32) {
                return ErrorHandler.sendEmojiError(interaction, 'name');
            }

            try {
                // Validate URL
                const urlRegex = /^https?:\/\/.+\.(png|jpg|jpeg|gif)$/i;
                if (!urlRegex.test(url)) {
                    return ErrorHandler.sendEmojiError(interaction, 'url');
                }

                // Defer reply as emoji creation might take a moment
                await interaction.deferReply({ ephemeral: true });

                // Create the emoji
                const emoji = await interaction.guild.emojis.create({
                    attachment: url,
                    name: name
                });

                // Success embed
                const successEmbed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.success as ColorResolvable)
                    .setTitle('✅ Emoji Created')
                    .setDescription(`Successfully created emoji ${emoji} with name \`:${name}:\``)
                    .setThumbnail(url);

                return interaction.editReply({
                    embeds: [successEmbed]
                });

            } catch (error) {
                console.error('Failed to create emoji:', error);
                
                // Handle specific error cases
                if ((error as { code: number }).code === 50035) {
                    return interaction.editReply({
                        embeds: [await ErrorHandler.sendEmojiError(interaction, 'size')]
                    });
                } else if ((error as { code: number }).code === 30008) {
                    return interaction.editReply({
                        embeds: [await ErrorHandler.sendEmojiError(interaction, 'limit')]
                    });
                }

                return ErrorHandler.sendCommandError(
                    interaction,
                    'Failed to create emoji. Please check the image URL and try again.'
                );
            }
        }
    }
} 