import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'topics',
  description: 'Get a random conversation topic',
  
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class TopicsCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Get a random conversation topic', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    const topicsList = ['What would you do if you won the lottery?', "What's the best advice you've ever received?", 'If you could visit any place in the world, where would you go?', "What's your favorite movie and why?", 'What hobby would you get into if time and money weren\'t an issue?', "What's the most interesting fact you know?", 'If you could have dinner with any historical figure, who would it be?', "What's the best book you've ever read?", 'What skill would you like to learn?', "What's your favorite food?"];
    return message.reply('💬 ' + topicsList[Math.floor(Math.random() * topicsList.length)]);
  }
}
