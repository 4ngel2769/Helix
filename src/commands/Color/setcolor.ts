import { ModuleCommand } from '@kbotdev/plugin-modules';
import { AdministrationModule } from '../../modules/Administration';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, type Message, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'setcolor',
  description: 'Set your own name color via a role',
  preconditions: ['GuildOnly']
})
export class SetcolorCommand extends ModuleCommand<AdministrationModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Administration', description: 'Set your own name color via a role' });
  }

  public override async messageRun(message: Message) {
    const hex = message.content.split(/\s+/).slice(1)[0];
    if (!hex) return message.reply('Provide a hex color (e.g. #ff0000)');
    const color = parseInt(hex.replace('#', ''), 16);
    if (isNaN(color)) return message.reply('Invalid color.');
    const member = message.member;
    if (!member || !('roles' in member)) return message.reply('Could not find you in this server.');
    try {
      const existing = message.guild?.roles.cache.find(r => r.name === '#' + hex);
      if (existing && (member as any).roles.cache.has(existing.id)) {
        return message.reply('You already have this color!');
      }
      const role = existing || await message.guild?.roles.create({ name: '#' + hex, color, reason: 'User color role' });
      if (role) {
        await member.roles.add(role);
        return message.reply('Color set to ' + hex + '!');
      }
    } catch (e) {
      return message.reply('Failed to set color.');
    }
    return;
  }
}
