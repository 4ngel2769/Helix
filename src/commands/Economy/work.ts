/**
 * `/work` — do a shift at your current job.
 *
 * Text: `xwork`. Unemployed users are pointed at `/jobs`.
 */
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, Message } from 'discord.js';
import config from '../../config';
import { JobService } from '../../lib/services/economy/JobService';

@ApplyOptions<Command.Options>({
    name: 'work',
    description: 'Work a shift at your job to earn coins and XP',
    aliases: ['job', 'shift']
})
export class WorkCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Work a shift at your job to earn coins and XP',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder.setName('work').setDescription('Work a shift at your job to earn coins and XP')
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        try {
            const result = await JobService.shift(interaction.user.id, interaction.user.username);
            const embed = new EmbedBuilder()
                .setColor(result.fired ? config.bot.embedColor.err : config.bot.embedColor.success)
                .setTitle(result.fired ? '🚫 Fired!' : '💼 Shift Complete')
                .setDescription(result.message)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                content: error instanceof Error ? error.message : 'Could not work right now. Try again later.'
                            });
        }
    }

    public override async messageRun(message: Message) {
        try {
            const result = await JobService.shift(message.author.id, message.author.username);
            const embed = new EmbedBuilder()
                .setColor(result.fired ? config.bot.embedColor.err : config.bot.embedColor.success)
                .setTitle(result.fired ? '🚫 Fired!' : '💼 Shift Complete')
                .setDescription(result.message)
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(error instanceof Error ? error.message : 'Could not work right now. Try again later.');
        }
    }
}
