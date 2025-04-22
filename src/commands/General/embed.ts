import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: 'embed',
    description: 'Create a custom embed'
})
export class EmbedCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('embed')
                .setDescription('Create a custom embed')
                .addStringOption((option) =>
                    option
                        .setName('title')
                        .setDescription('The title of the embed')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('description')
                        .setDescription('The description of the embed')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('color')
                        .setDescription('The color of the embed (hex code or basic color name)')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('footer')
                        .setDescription('The footer text of the embed')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('image')
                        .setDescription('The image URL to display in the embed')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('thumbnail')
                        .setDescription('The thumbnail URL to display in the embed')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);
        const color = interaction.options.getString('color') || config.bot.embedColor.default;
        const footer = interaction.options.getString('footer');
        const image = interaction.options.getString('image');
        const thumbnail = interaction.options.getString('thumbnail');

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color as `#${string}`)
            .setTimestamp();

        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);
        if (thumbnail) embed.setThumbnail(thumbnail);

        try {
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({
                content: 'Failed to create embed. Please check your inputs, especially URLs for images.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
