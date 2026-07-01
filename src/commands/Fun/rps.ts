import { ModuleCommand } from '@kbotdev/plugin-modules';
import { FunModule } from '../../modules/Fun';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  name: 'rps',
  description: 'Play rock paper scissors',
  
  fullCategory: ['Fun'],
  enabled: true,
  flags: true
})
export class RpsCommand extends ModuleCommand<FunModule> {
  public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
    super(context, { ...options, module: 'Fun', description: 'Play rock paper scissors', enabled: true });
  }

  public override async messageRun(message: import('discord.js').Message) {
    const choices = ['rock', 'paper', 'scissors'];
    const userChoice = message.content.split(/\s+/).slice(1)[0]?.toLowerCase();
    if (!userChoice || !choices.includes(userChoice)) return message.reply('Choose rock, paper, or scissors!');
    const botChoice = choices[Math.floor(Math.random() * 3)];
    let result;
    if (userChoice === botChoice) result = "It's a tie!";
    else if ((userChoice === 'rock' && botChoice === 'scissors') || (userChoice === 'paper' && botChoice === 'rock') || (userChoice === 'scissors' && botChoice === 'paper')) result = 'You win!';
    else result = 'You lose!';
    return message.reply('You chose ' + userChoice + ', I chose ' + botChoice + '. ' + result);
  }
}
