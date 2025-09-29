import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class HelpButtonHandler extends InteractionHandler {
    public override parse(interaction: ButtonInteraction) {
        const helpButtons = ['previous', 'next'];
        
        if (!helpButtons.includes(interaction.customId)) return this.none();
        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        // Check if this is from a help command message by looking at the embed title
        const embed = interaction.message.embeds[0];
        if (!embed || (!embed.title?.includes('Commands') && !embed.title?.includes('Help Menu') && !embed.title?.includes('Available Commands'))) {
            await interaction.reply({
                content: 'This button can only be used with help commands.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Get the help command instance and delegate to it
        const helpCommand = this.container.stores.get('commands').get('help');
        if (helpCommand && 'handlePaginationButton' in helpCommand) {
            try {
                await (helpCommand as any).handlePaginationButton(interaction);
            } catch (error) {
                console.error('Error in help pagination:', error);
                
                if (error.code === 10062) {
                    // Interaction expired - send a new message instead
                    await interaction.reply({
                        content: 'This interaction has expired. Please use the help command again.',
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: 'An error occurred while navigating pages.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } else {
            await interaction.reply({
                content: 'Help command not found.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
