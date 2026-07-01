import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { EconomyItem } from '../../../models/EconomyItem';
import config from '../../../config';
import { handleMoneyAdd, handleMoneyRemove, handleMoneySet } from './_money';
import { handleDiamondsAdd, handleDiamondsRemove, handleDiamondsSet } from './_diamonds';
import { handleItemGive, handleItemTake, handleItemClear } from './_items';
import { handleProfileReset, handleProfileView } from './_profile';

@ApplyOptions<Command.Options>({
    name: 'user-manage',
    description: 'Manage user economy data (Developer Only)',
    aliases: ['usermanage', 'manageuser', 'eco-admin'],
    preconditions: ['OwnerOnly']
})
export class UserManageCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommandGroup((group) =>
                    group
                        .setName('money')
                        .setDescription('Manage user money')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('add')
                                .setDescription('Add money to a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Amount to add')
                                        .setRequired(true)
                                        .setMinValue(1)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('location')
                                        .setDescription('Where to add the money')
                                        .setRequired(false)
                                        .addChoices(
                                            { name: 'Wallet', value: 'wallet' },
                                            { name: 'Bank', value: 'bank' }
                                        )
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for this transaction')
                                        .setRequired(false)
                                        .setMaxLength(200)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('remove')
                                .setDescription('Remove money from a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Amount to remove')
                                        .setRequired(true)
                                        .setMinValue(1)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('location')
                                        .setDescription('Where to remove the money from')
                                        .setRequired(false)
                                        .addChoices(
                                            { name: 'Wallet', value: 'wallet' },
                                            { name: 'Bank', value: 'bank' }
                                        )
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for this transaction')
                                        .setRequired(false)
                                        .setMaxLength(200)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('set')
                                .setDescription('Set exact money values for a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('wallet')
                                        .setDescription('Wallet amount to set')
                                        .setRequired(false)
                                        .setMinValue(0)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('bank')
                                        .setDescription('Bank amount to set')
                                        .setRequired(false)
                                        .setMinValue(0)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('bank-limit')
                                        .setDescription('Bank limit to set')
                                        .setRequired(false)
                                        .setMinValue(1000)
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('diamonds')
                        .setDescription('Manage user diamonds')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('add')
                                .setDescription('Add diamonds to a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Amount to add')
                                        .setRequired(true)
                                        .setMinValue(1)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for this transaction')
                                        .setRequired(false)
                                        .setMaxLength(200)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('remove')
                                .setDescription('Remove diamonds from a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Amount to remove')
                                        .setRequired(true)
                                        .setMinValue(1)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for this transaction')
                                        .setRequired(false)
                                        .setMaxLength(200)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('set')
                                .setDescription('Set exact diamond count for a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('amount')
                                        .setDescription('Diamond count to set')
                                        .setRequired(true)
                                        .setMinValue(0)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('reason')
                                        .setDescription('Reason for this transaction')
                                        .setRequired(false)
                                        .setMaxLength(200)
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('items')
                        .setDescription('Manage user inventory items')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('give')
                                .setDescription('Give an item to a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('item-id')
                                        .setDescription('Item ID to give')
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('quantity')
                                        .setDescription('Quantity to give')
                                        .setRequired(false)
                                        .setMinValue(1)
                                        .setMaxValue(1000)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('take')
                                .setDescription('Take an item from a user')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('item-id')
                                        .setDescription('Item ID to take')
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                                .addIntegerOption((option) =>
                                    option
                                        .setName('quantity')
                                        .setDescription('Quantity to take')
                                        .setRequired(false)
                                        .setMinValue(1)
                                        .setMaxValue(1000)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('clear')
                                .setDescription('Clear a user\'s inventory')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addStringOption((option) =>
                                    option
                                        .setName('category')
                                        .setDescription('Category to clear (leave empty to clear all)')
                                        .setRequired(false)
                                        .addChoices(
                                            { name: 'Tools', value: 'tools' },
                                            { name: 'Weapons', value: 'weapons' },
                                            { name: 'Consumables', value: 'consumables' },
                                            { name: 'Materials', value: 'materials' },
                                            { name: 'Collectibles', value: 'collectibles' },
                                            { name: 'Misc', value: 'misc' }
                                        )
                                )
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('profile')
                        .setDescription('Manage user profile')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('reset')
                                .setDescription('Reset a user\'s economy profile')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                                .addBooleanOption((option) =>
                                    option
                                        .setName('confirm')
                                        .setDescription('Confirm you want to reset this user\'s profile')
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('view')
                                .setDescription('View detailed user economy data')
                                .addUserOption((option) =>
                                    option
                                        .setName('user')
                                        .setDescription('Target user')
                                        .setRequired(true)
                                )
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (group === 'money') {
            switch (subcommand) {
                case 'add': return handleMoneyAdd(interaction);
                case 'remove': return handleMoneyRemove(interaction);
                case 'set': return handleMoneySet(interaction);
            }
        } else if (group === 'diamonds') {
            switch (subcommand) {
                case 'add': return handleDiamondsAdd(interaction);
                case 'remove': return handleDiamondsRemove(interaction);
                case 'set': return handleDiamondsSet(interaction);
            }
        } else if (group === 'items') {
            switch (subcommand) {
                case 'give': return handleItemGive(interaction);
                case 'take': return handleItemTake(interaction);
                case 'clear': return handleItemClear(interaction);
            }
        } else if (group === 'profile') {
            switch (subcommand) {
                case 'reset': return handleProfileReset(interaction);
                case 'view': return handleProfileView(interaction);
            }
        }

        return interaction.reply({ content: 'Invalid command usage', ephemeral: true });
    }

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'item-id') {
            try {
                const searchTerm = focusedOption.value.toLowerCase();
                const items = await EconomyItem.find({
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { itemId: { $regex: searchTerm, $options: 'i' } }
                    ]
                }).limit(25);

                const choices = items.map(item => ({
                    name: `${item.emoji} ${item.name} (${item.itemId})`,
                    value: item.itemId
                }));

                return interaction.respond(choices);
            } catch (error) {
                this.container.logger.error('Error in autocomplete:', error);
                return interaction.respond([]);
            }
        }

        return interaction.respond([]);
    }
}
