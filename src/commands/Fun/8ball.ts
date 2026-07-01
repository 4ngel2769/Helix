import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: '8ball',
  description: 'Ask the magic 8-ball a question',
  aliases: ['eightball'],
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class EightballCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Ask the magic 8-ball a question', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    const question = message.content.split(/\s+/).slice(1).join(' ');
    if (!question) return message.reply('Ask a yes/no question!');
    const answers = ['It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes definitely.', 'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.', "Don't count on it.", 'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.'];
    return message.reply('🎱 ' + answers[Math.floor(Math.random() * answers.length)]);
  }
}
