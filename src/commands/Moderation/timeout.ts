import { ModuleCommand } from '@kbotdev/plugin-modules';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { ModerationModule } from '../../modules/Moderation';
import { GuildMember, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { helixEmbed, brandColor } from '../../lib/embeds/build';
import { getGuildStrings } from '../../lib/i18n/guildStrings';
import { t } from '../../lib/i18n';
import { sendLog, suppressNext } from '../../lib/logging/logService';

import { HybridModuleCommand } from '../../lib/structures/HybridCommand';

@ApplyOptions<ModuleCommand.Options>({
    name: 'timeout',
    module: 'Moderation',
    description: 'Timeout a member in the server',
    requiredUserPermissions: ['ModerateMembers'],
    requiredClientPermissions: ['ModerateMembers'],
    enabled: true
})
export class TimeoutCommand extends HybridModuleCommand<ModerationModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Moderation',
            description: 'Timeout a member in the server',
            requiredUserPermissions: ['ModerateMembers'],
            requiredClientPermissions: ['ModerateMembers'],
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('timeout')
                .setDescription('Timeout a member')
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption((option) =>
                    option
                        .setName('target')
                        .setDescription('The member to timeout')
                        .setRequired(true)
                )
                .addNumberOption((option) =>
                    option
                        .setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(40320) // 28 days
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('The reason for the timeout')
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName('message')
                        .setDescription('Custom message to send on timeout')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('target') as GuildMember;
        const strings = await getGuildStrings(interaction.guildId);
        const duration = interaction.options.getNumber('duration', true);
        const reason = interaction.options.getString('reason') || t('common.noReason', strings);

        if (!target) {
            return interaction.reply({ content: t('error.user.notFound', strings), flags: MessageFlags.Ephemeral });
        }

        if (!target.moderatable) {
            return interaction.reply({ content: t('error.bot.cannotTimeout', strings), flags: MessageFlags.Ephemeral });
        }

        // A per-invocation custom message still wins verbatim (legacy `$user` /
        // `$mod` / `$duration` syntax); otherwise the localized catalog speaks.
        const customMessage = interaction.options.getString('message');
        const customText = customMessage
            ? customMessage
                .replace(/\$user/g, target.user.tag)
                .replace(/\$mod/g, interaction.user.tag)
                .replace(/\$duration/g, duration.toString())
            : undefined;

        const vars = {
            'user.id': target.id,
            'user.mention': `<@${target.id}>`,
            'user.name': target.displayName,
            'user.tag': target.user.username,
            'target.id': target.id,
            'target.mention': `<@${target.id}>`,
            'target.name': target.displayName,
            'target.tag': target.user.username,
            'mod.id': interaction.user.id,
            'mod.mention': `<@${interaction.user.id}>`,
            'mod.name': interaction.user.username,
            'mod.tag': interaction.user.username,
            reason,
            duration: `${duration}m`
        };

        try {
            await target.timeout(duration * 60 * 1000, reason);

            if (interaction.guild) {
                suppressNext(interaction.guild.id, 'mod.timeout', target.id);
                void sendLog(interaction.guild, 'mod.timeout', {
                    description: t('mod.timeout.description', strings, vars),
                    fields: [{ name: t('mod.timeout.field.reason', strings), value: reason.slice(0, 1024) }],
                    actorId: interaction.user.id,
                    targetId: target.id,
                    isBot: target.user.bot
                });
            }

            return interaction.reply({
                embeds: [
                    await helixEmbed(interaction.guildId, {
                        key: 'mod.timeout',
                        color: brandColor(interaction.guildId, 'warn'),
                        description: customText,
                        vars,
                        fields: [{ nameKey: 'mod.timeout.field.reason', value: reason }]
                    })
                ]
            });
		} catch (error) {
			container.logger.error('timeout failed:', error);
			return interaction.reply({ content: t('mod.timeout.failed', strings), flags: MessageFlags.Ephemeral });
        }
    }
}