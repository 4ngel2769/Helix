export interface TemplateContext {
	/** `<@userId>` ping string */
	userMention: string;
	/** Server display name (nickname if present, else username) */
	userName: string;
	/** Account username */
	userTag: string;
	/** Guild command prefix */
	prefix: string;
	/** Guild name */
	serverName: string;
	/** Current member count */
	serverMembers: number;
}

export const PLACEHOLDER_DOC = [
	{ token: '{{user.mention}}', description: "Pings the user (e.g. <@123>)" },
	{ token: '{{user.name}}', description: "User's server display name" },
	{ token: '{{user.tag}}', description: "User's account username" },
	{ token: '{{prefix}}', description: 'This server’s command prefix' },
	{ token: '{{server.name}}', description: 'This server’s name' },
	{ token: '{{server.members}}', description: 'Current member count' }
] as const;

export const DEFAULT_WELCOME_MESSAGE = 'Welcome {{user.mention}} to **{{server.name}}**! You are member #{{server.members}}.';
export const DEFAULT_FAREWELL_MESSAGE = '**{{user.name}}** has left {{server.name}}.';

/**
 * Render an automated-message template. Supports the documented {{...}}
 * placeholders plus legacy {user} (= mention), {server} (= name) and
 * {memberCount} tokens used by older configs.
 */
export function renderMessageTemplate(template: string, ctx: TemplateContext): string {
	return template
		.replaceAll('{{user.mention}}', ctx.userMention)
		.replaceAll('{{user.name}}', ctx.userName)
		.replaceAll('{{user.tag}}', ctx.userTag)
		.replaceAll('{{prefix}}', ctx.prefix)
		.replaceAll('{{server.name}}', ctx.serverName)
		.replaceAll('{{server.members}}', String(ctx.serverMembers))
		.replaceAll('{user}', ctx.userMention)
		.replaceAll('{server}', ctx.serverName)
		.replaceAll('{memberCount}', String(ctx.serverMembers));
}
