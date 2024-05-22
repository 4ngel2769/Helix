// import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
// import { send } from '@sapphire/plugin-editable-commands';
import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { bot } from '../../../config.json';
import { emojis } from '../../emojimap.json'

@ApplyOptions<Command.Options>({
	description: 'Information about a given user',
	name: 'userinfo',
	cooldownDelay: 5000
})
// export class UserCommand extends Command {
export class UserinfoCommand extends Command<GeneralModule> {
	// Register slash and context menu command
	public override registerApplicationCommands(registry: Command.Registry) {

		registry.registerChatInputCommand((builder) =>
		builder //
			.setName(this.name)
			.setDescription(this.description)
			.addUserOption((option) => 
				option //
					.setName('user')
					.setDescription('User to fetch information about')
					.setRequired(false)
			)
		)

		// Register context menu command available from any message
		registry.registerContextMenuCommand({
			name: this.name,
			type: ApplicationCommandType.Message
		},{
			idHints: ['1235654649911054388']
		});

		// Register context menu command available from any user
		registry.registerContextMenuCommand({
			name: this.name,
			type: ApplicationCommandType.User
		},{
			idHints: ['1239874327713939507']
		});
	}
	
	// slash command
	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {

		const userToGet = interaction.options.getUser('user') || interaction.member?.user;
		const memberToGet = interaction.guild?.members.cache.get(userToGet!.id);
		const joinDate = memberToGet?.joinedAt;
		const createDate = memberToGet?.user.createdAt;
		const highestRole = memberToGet?.roles.highest.id;
	
		// const client = this.container;
		// const topRoleId = interaction.guild?.members.me?.roles.cache.sort((a, b) => b.position - a.position).first()?.id;
		// const topRole = interaction.guild?.roles.cache.get(`${topRoleId}`);
		// const embedColor = topRole?.color;

		const userProfileUrlButton = new ButtonBuilder()
			.setLabel('Profile picture')
			.setURL(`${memberToGet?.displayAvatarURL()}?size=1024`)
			.setStyle(ButtonStyle.Link);

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(userProfileUrlButton);

		const embed = new EmbedBuilder()
			.setColor('Blurple')
			.setTitle(`${memberToGet?.displayName}`)
			.setThumbnail(`${memberToGet?.displayAvatarURL()}?size=1024`)
			// .setImage(`https://raw.githubusercontent.com/4ngel2769/Helix/main/src/db/assets/branding/helix-banner-2023.png`)
			.addFields({
				name: `General`,
				value: `
				> **Username :** \`${userToGet?.username}\`
				> **ID :** \`${userToGet?.id}\`
				> **Joined Discord :** <t:${Math.floor(joinDate!.getTime() / 1000)}:f>
				> **Joined server :** <t:${Math.floor(createDate!.getTime() / 1000 )}:f>
				`
			},{
				name:`Guild`,
				value: `
				> **Top role :** **<@&${highestRole}>**
				`
			},{
				name: `Roles`,
				value: `> ${memberToGet?.roles.cache
					.filter((role) => role.id !== interaction.guild?.id)
					.map((role) => role.toString()).join(', ') || '**No roles**'}
				`
			})
		
			if (memberToGet?.user.flags && memberToGet.user.flags.toArray().length > 0) {
				embed.addFields({
					name: 'Badges', 
					value: `${memberToGet.user.flags.toArray().map((flag) => flag).join(' ')}`
				});
			}

			if (memberToGet && bot.ownerIDs.includes(memberToGet.id)) {
				embed.addFields({
					name: 'Notables',
					value: `${emojis.badgesBlurple.developer} \` This user is the Bot developer \``
				})
			};

		return interaction.reply({
			embeds: [embed],
			components: [row]
		});
	}

	// context menu command
	public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		const msg = await interaction.reply({ content: 'Ping?', ephemeral: true, fetchReply: true });

		const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${
			msg.createdTimestamp - interaction.createdTimestamp
		}ms.`;

		return interaction.editReply({ content });
	}
}
