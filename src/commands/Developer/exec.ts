import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { execSync } from 'node:child_process';

@ApplyOptions<Command.Options>({
  name: 'exec',
  description: 'Execute shell commands',
  preconditions: ['OwnerOnly'],
  enabled: true
})
export class ExecCommand extends Command {
  public override async messageRun(message: import('discord.js').Message) {
    const code = message.content.split(/\s+/).slice(1).join(' ');
    if (!code) return message.reply('Provide a command to execute.');
    try {
      const out = execSync(code, { timeout: 5000 }).toString();
      return message.reply('```\n' + out.slice(0, 1900) + '\n```');
    } catch (e) {
      return message.reply('```\n' + String(e).slice(0, 1900) + '\n```');
    }
  }
}
