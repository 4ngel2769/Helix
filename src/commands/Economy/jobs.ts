/**
 * `/jobs` — the job market: browse, apply (RNG acceptance), resign, view careers.
 *
 * Slash: `/jobs board`, `/jobs apply <job>`, `/jobs resign`, `/jobs career`.
 * Text: `xjobs`, `xjobs apply courier`, `xjobs resign`, `xjobs career`.
 */
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { EconomyModule } from '../../modules/Economy';
import { EmbedBuilder, Message } from 'discord.js';
import config from '../../config';
import { UserService } from '../../lib/services/economy/UserService';
import { JobService } from '../../lib/services/economy/JobService';
import { JOBS, PROMOTION_TIERS, acceptChanceFor, tierForXp, type JobDefinition } from '../../lib/economy/jobs';

type JobsAction = 'board' | 'apply' | 'resign' | 'career';

@ApplyOptions<Command.Options>({
    name: 'jobs',
    description: 'Browse the job market and manage your career',
    aliases: ['jobmarket', 'careers', 'career']
})
export class JobsCommand extends ModuleCommand<EconomyModule> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: 'Economy',
            description: 'Browse the job market and manage your career',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('jobs')
                .setDescription('Browse the job market and manage your career')
                .addSubcommand((sub) => sub.setName('board').setDescription('Browse all open jobs'))
                .addSubcommand((sub) =>
                    sub
                        .setName('apply')
                        .setDescription('Apply for a job (acceptance is not guaranteed)')
                        .addStringOption((option) =>
                            option
                                .setName('job')
                                .setDescription('Which job to apply for')
                                .setRequired(true)
                                .addChoices(...JOBS.map((job) => ({ name: `${job.emoji} ${job.title}`, value: job.id })))
                        )
                )
                .addSubcommand((sub) => sub.setName('resign').setDescription('Quit your current job'))
                .addSubcommand((sub) => sub.setName('career').setDescription('View your job status and streaks'))
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const action = interaction.options.getSubcommand() as JobsAction;
        const reply = (payload: { content?: string; embeds?: EmbedBuilder[] }) => interaction.reply({ ...payload });
        return this.dispatch(action, interaction.user.id, interaction.user.username, interaction, reply);
    }

    public override async messageRun(message: Message) {
        const args = message.content.split(/\s+/).slice(1);
        const action = this.parseAction(args[0]);
        const reply = (payload: { content?: string; embeds?: EmbedBuilder[] }) => message.reply(payload);
        return this.dispatch(action, message.author.id, message.author.username, message, reply, args.slice(1));
    }

    private parseAction(input: string | undefined): JobsAction {
        switch ((input ?? 'board').toLowerCase()) {
            case 'apply':
            case 'join':
                return 'apply';
            case 'resign':
            case 'quit':
                return 'resign';
            case 'career':
            case 'me':
            case 'status':
                return 'career';
            case 'board':
            case 'list':
            case 'jobs':
            default:
                return 'board';
        }
    }

    private async dispatch(
        action: JobsAction,
        userId: string,
        username: string,
        source: Command.ChatInputCommandInteraction | Message,
        reply: (payload: { content?: string; embeds?: EmbedBuilder[] }) => Promise<unknown>,
        textArgs: string[] = []
    ) {
        const jobInput = action === 'apply' ? this.readJobInput(source, textArgs) : null;

        if (action === 'board') return reply({ embeds: [await this.buildBoard(userId, username)] });
        if (action === 'career') return reply({ embeds: [await this.buildCareer(userId, username)] });
        if (action === 'resign') {
            try {
                return reply({ content: await JobService.resign(userId, username) });
            } catch (error) {
                return reply({ content: error instanceof Error ? error.message : 'Could not resign right now.' });
            }
        }

        if (!jobInput) return reply({ content: 'Which job? Usage: `/jobs apply <job>` or `xjobs apply <job>`.' });
        try {
            const result = await JobService.apply(userId, username, jobInput);
            return reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(result.accepted ? config.bot.embedColor.success : config.bot.embedColor.err)
                        .setTitle(result.accepted ? `✅ Hired — ${result.job.title}` : '❌ Application rejected')
                        .setDescription(result.message)
                        .addFields({ name: 'Accept chance', value: `~${Math.round(result.chance * 100)}%`, inline: true })
                        .setTimestamp()
                ]
            });
        } catch (error) {
            return reply({ content: error instanceof Error ? error.message : 'Could not apply right now.' });
        }
    }

    private readJobInput(source: Command.ChatInputCommandInteraction | Message, textArgs: string[]): string | null {
        if (source instanceof Message) return textArgs[0] ?? null;
        return source.options.getString('job', true);
    }

    private async buildBoard(userId: string, username: string): Promise<EmbedBuilder> {
        const user = await UserService.getUser(userId, username);
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('💼 Job Market')
            .setDescription(
                'Apply with `/jobs apply <job>` or `xjobs apply <job>`. Acceptance is a roll of the dice — higher economy levels get hired more.\n\n' +
                    JOBS.map((job) => this.formatJobListing(job, user.economy.level)).join('\n')
            )
            .setFooter({ text: 'Work every day to keep your streak and climb to Director.' })
            .setTimestamp();
        if (user.economy.jobId) {
            const current = JobService.currentJob(user);
            embed.addFields({ name: 'Current job', value: current ? `${current.emoji} ${current.title}` : user.economy.jobId, inline: true });
        }
        return embed;
    }

    private formatJobListing(job: JobDefinition, level: number): string {
        const chance = Math.round(acceptChanceFor(job, level) * 100);
        const locked = level < job.requiredLevel ? ' 🔒' : '';
        return `${job.emoji} **${job.title}**${locked}\n↳ \`${job.id}\` • pays ~${job.payMin}–${job.payMax}/shift • accept ~${chance}%${level < job.requiredLevel ? ` • needs level ${job.requiredLevel}` : ''}`;
    }

    private async buildCareer(userId: string, username: string): Promise<EmbedBuilder> {
        const user = await UserService.getUser(userId, username);
        const current = JobService.currentJob(user);
        if (!current) {
            return new EmbedBuilder()
                .setColor(config.bot.embedColor.warn)
                .setTitle('💼 Your career')
                .setDescription('You are unemployed. Browse the market with `/jobs board` and apply!')
                .setTimestamp();
        }
        const tier = tierForXp(user.economy.jobXp ?? 0);
        const next = PROMOTION_TIERS[Math.min(PROMOTION_TIERS.length - 1, (user.economy.jobGrade ?? 0) + 1)];
        const progress =
            next.xp > 0
                ? `Next: **${next.title}** at ${next.xp} XP (${Math.max(0, next.xp - (user.economy.jobXp ?? 0))} to go)`
                : 'Max grade reached 🏆';
        return new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle(`💼 Your career — ${tier.title} ${current.title}`)
            .setDescription(`${current.emoji} ${current.description}`)
            .addFields(
                { name: 'Job XP', value: `**${user.economy.jobXp ?? 0}** XP\n${progress}`, inline: true },
                { name: 'Work streak', value: `**${user.economy.jobStreak ?? 0}** shifts`, inline: true },
                { name: 'Strikes', value: `**${user.economy.jobStrikes ?? 0}**/3 (missed shifts)`, inline: true },
                { name: 'Shifts worked', value: `**${user.economy.jobsWorked ?? 0}** total`, inline: true }
            )
            .setTimestamp();
    }
}

