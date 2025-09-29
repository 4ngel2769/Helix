// import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { GeneralModule } from '../../modules/General';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
// import { send } from '@sapphire/plugin-editable-commands';
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageFlags
} from 'discord.js';
import config from '../../config';
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
			name: 'User Information', // Custom display name for context menu
			type: ApplicationCommandType.Message
		},{
			idHints: ['1235654649911054388']
		});

		// Register context menu command available from any user
		registry.registerContextMenuCommand({
			name: 'User Information', // Custom display name for context menu
			type: ApplicationCommandType.User
		},{
			idHints: ['1239874327713939507']
		});
	}

	// Map Discord user flags to emojis
	private readonly badgeEmojis = {
		BotHTTPInteractions: emojis.badges.botSlashCommands, // Bot using HTTP interactions
		BugHunterLevel1: emojis.badges.bugHunter1, // Bug Hunter Level 1
		BugHunterLevel2: emojis.badges.bugHunter2, // Bug Hunter Level 2
		CertifiedModerator: emojis.badges.certifiedModerator, // Discord Certified Moderator
		HypeSquadOnlineHouse1: emojis.badges.hype.bravery, // HypeSquad Bravery
		HypeSquadOnlineHouse2: emojis.badges.hype.brilliance, // HypeSquad Brilliance
		HypeSquadOnlineHouse3: emojis.badges.hype.balance, // HypeSquad Balance
		Hypesquad: emojis.badges.hype.hypesquad, // HypeSquad Events
		Partner: emojis.special.partner, // Partnered Server Owner
		PremiumEarlySupporter: emojis.badges.earlySupporter, // Early Supporter
		Staff: emojis.badges.staff, // Discord Staff
		VerifiedBot: emojis.badges.verifiedApp, // Verified Bot
		VerifiedDeveloper: emojis.badges.earlyVerifiedBotDeveloper, // Early Verified Bot Developer
		ActiveDeveloper: emojis.badges.activeDeveloper, // Active Developer
		Spammer: '⚠️', // Spammer
		TeamPseudoUser: '👥', // Team User
		BotHTTPInteractionsOnly: '🔌', // Bot that only uses HTTP interactions
		Quarantined: '🔒', // Quarantined Account
		Collaborator: emojis.special.contributor, // Collaborator
		RestrictedCollaborator: '🔐' // Restricted Collaborator
		// ... add more badges as needed
	};

	// Map technical badge names to user-friendly names
	private readonly badgeNames = {
		BotHTTPInteractions: 'Bot with Slash Commands',
		BugHunterLevel1: 'Bug Hunter',
		BugHunterLevel2: 'Bug Hunter Gold',
		CertifiedModerator: 'Discord Certified Moderator',
		HypeSquadOnlineHouse1: 'House of Bravery',
		HypeSquadOnlineHouse2: 'House of Brilliance',
		HypeSquadOnlineHouse3: 'House of Balance',
		Hypesquad: 'HypeSquad Events',
		Partner: 'Discord Partner',
		PremiumEarlySupporter: 'Early Nitro Supporter',
		Staff: 'Discord Staff',
		VerifiedBot: 'Verified Bot',
		VerifiedDeveloper: 'Early Verified Bot Developer',
		ActiveDeveloper: 'Active Developer',
		Spammer: 'Flagged as Spammer',
		TeamPseudoUser: 'Team User',
		BotHTTPInteractionsOnly: 'HTTP Interactions Only Bot',
		Quarantined: 'Quarantined Account',
		Collaborator: 'Discord Collaborator',
		RestrictedCollaborator: 'Restricted Collaborator',
		BoostLevel1: 'Server Booster (Level 1)',
		BoostLevel2: 'Server Booster (Level 2)',
		BoostLevel3: 'Server Booster (Level 3)',
		BoostLevel4: 'Server Booster (Level 4)',
		BoostLevel5: 'Server Booster (Level 5)',
		BoostLevel6: 'Server Booster (Level 6)',
		BoostLevel7: 'Server Booster (Level 7)',
		BoostLevel8: 'Server Booster (Level 8)',
		BoostLevel9: 'Server Booster (Level 9)',
		Nitro: 'Nitro Subscriber',
		NitroClassic: 'Nitro Classic Subscriber',
		DiscordEmployee: 'Discord Employee',
		DiscordPartner: 'Discord Partner',
		DiscordCertifiedModerator: 'Discord Certified Moderator',
		BotVerified: 'Verified Bot',
		BotPremium: 'Premium Bot',
		System: 'System User',
		ApplicationCommandBadge: 'Has Application Commands',
		DiscordNitro: 'Discord Nitro',
		DiscordNitroClassic: 'Discord Nitro Classic',
		DiscordNitroBasic: 'Discord Nitro Basic',
		VerifiedServer: 'Verified Server',
		EarlyVerifiedBotDeveloper: 'Early Verified Bot Developer',
		ModeratedServer: 'Moderated Server',
		BotSupport: 'Bot Support Server',
		DiscordOfficial: 'Official Discord Server',
		DiscordTeamUser: 'Discord Team User',
		DiscordBug1: 'Bug Hunter (Level 1)',
		DiscordBug2: 'Bug Hunter (Level 2)',
		DiscordStaff: 'Discord Staff',
		DiscordPartnerOwner: 'Discord Partner Owner',
		DiscordVerifiedBot: 'Verified Bot',
		DiscordVerifiedBotDev: 'Verified Bot Developer'
	};

	// Helper method to convert user flags to emoji badges with friendly names
	private formatBadges(flags: readonly string[]): string {
		return flags.map(flag => {
			const emoji = this.badgeEmojis[flag as keyof typeof this.badgeEmojis] || '🏷️';
			const friendlyName = this.badgeNames[flag as keyof typeof this.badgeNames] || flag;
			return `${emoji} \`${friendlyName}\``;
		}).join(' ');
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
					value: this.formatBadges(memberToGet.user.flags.toArray())
				});
			}

			if (memberToGet && config.bot.ownerIDs.includes(memberToGet.id as string)) {
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
		// Get the target user based on the context type
		let userToGet;
		
		if (interaction.isUserContextMenuCommand()) {
			// If used on a user directly
			userToGet = interaction.targetUser;
		} else if (interaction.isMessageContextMenuCommand()) {
			// If used on a message, get the message author
			userToGet = interaction.targetMessage.author;
		} else {
			return interaction.reply({ 
				content: 'This command can only be used on users or messages.', 
				flags: MessageFlags.Ephemeral 
			});
		}
		
		const memberToGet = interaction.guild?.members.cache.get(userToGet.id);
		
		// If the user is not in the guild
		if (!memberToGet && interaction.guild) {
			return interaction.reply({ 
				content: 'This user is not a member of this server.', 
				flags: MessageFlags.Ephemeral 
			});
		}
		
		const joinDate = memberToGet?.joinedAt;
		const createDate = userToGet.createdAt;
		const highestRole = memberToGet?.roles.highest.id;
		
		const userProfileUrlButton = new ButtonBuilder()
			.setLabel('Profile picture')
			.setURL(`${memberToGet?.displayAvatarURL() || userToGet.displayAvatarURL()}?size=1024`)
			.setStyle(ButtonStyle.Link);

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(userProfileUrlButton);

		const embed = new EmbedBuilder()
			.setColor('Blurple')
			.setTitle(`${memberToGet?.displayName || userToGet.username}`)
			.setThumbnail(`${memberToGet?.displayAvatarURL() || userToGet.displayAvatarURL()}?size=1024`)
			.addFields({
				name: `General`,
				value: `
				> **Username :** \`${userToGet.username}\`
				> **ID :** \`${userToGet.id}\`
				> **Joined Discord :** <t:${Math.floor(createDate.getTime() / 1000)}:f>
				${joinDate ? `> **Joined server :** <t:${Math.floor(joinDate.getTime() / 1000)}:f>` : ''}
				`
			});
			
		// Only add guild-specific fields if the user is in the guild
		if (memberToGet) {
			embed.addFields({
				name: `Guild`,
				value: `
				> **Top role :** **<@&${highestRole}>**
				`
			},{
				name: `Roles`,
				value: `> ${memberToGet.roles.cache
					.filter((role) => role.id !== interaction.guild?.id)
					.map((role) => role.toString()).join(', ') || '**No roles**'}
				`
			});
			
			if (memberToGet.user.flags && memberToGet.user.flags.toArray().length > 0) {
				embed.addFields({
					name: 'Badges', 
					value: this.formatBadges(memberToGet.user.flags.toArray())
				});
			}

			if (config.bot.ownerIDs.includes(memberToGet.id as string)) {
				embed.addFields({
					name: 'Notables',
					value: `${emojis.badgesBlurple.developer} \` This user is the Bot developer \``
				});
			}
		} else {
			// If user is not in the guild, still show badges if available
			if (userToGet.flags && userToGet.flags.toArray().length > 0) {
				embed.addFields({
					name: 'Badges', 
					value: this.formatBadges(userToGet.flags.toArray())
				});
			}
			
			if (config.bot.ownerIDs.includes(userToGet.id as string)) {
				embed.addFields({
					name: 'Notables',
					value: `${emojis.badgesBlurple.developer} \` This user is the Bot developer \``
				});
			}
		}

		return interaction.reply({
			embeds: [embed],
			components: [row]
		});
	}
}
