import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
	MessageFlags,
    User
} from 'discord.js';
import { getGameStatsModel } from '../../models/GameStats';
import { getGameControlRow, getReplayRow } from '../../components/GameControls';
import { ModuleCommand } from '@kbotdev/plugin-modules';

function isBotProperlyInGuild(interaction: ModuleCommand.ChatInputCommandInteraction | ButtonInteraction): boolean {
    // If it's a DM, we can't check guild membership
    if (!interaction.guild) return true;
    
    // Check if the bot is a member of the guild
    const botMember = interaction.guild.members.cache.get(interaction.client.user!.id);
    return !!botMember;
}

function createBotNotInServerEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle('⚠️ Bot Not Properly Added')
        .setDescription(
            'This bot appears to be added as a user app instead of being properly invited to the server.\n\n' +
            '**For multiplayer games to work properly, the bot needs to be invited to the server.**\n\n' +
            '**How to fix:**\n' +
            '1. Ask a server admin to invite the bot properly\n' +
            '2. Use this invite link: [Invite Bot](https://discord.com/oauth2/authorize?client_id=' + 
            `${this.client.user!.id}&permissions=2048&scope=bot)\n` +
            '3. Grant the bot "Send Messages" permissions\n\n' +
            '*Singleplayer games will still work, but messages will be ephemeral.*'
        )
        .setColor(0xFF6B35);
}

export async function startSinglePlayerGame(interaction: ModuleCommand.ChatInputCommandInteraction | ButtonInteraction, player: User, bot: User) {
    const gameStatsModel = getGameStatsModel('userdb');
    const playerId = player.id;

    // Check if bot is properly in guild for multiplayer functionality
    if (interaction.guild && !isBotProperlyInGuild(interaction)) {
        await interaction.reply({
            embeds: [createBotNotInServerEmbed()],
            ephemeral: true
        });
        
        // Ask if they want to continue with singleplayer anyway
        const confirmButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('continue_singleplayer')
                .setLabel('Continue Anyway')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('cancel_game')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.editReply({
            embeds: [createBotNotInServerEmbed()],
            components: [confirmButtons]
        });

        const confirmCollector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000,
            filter: (i) => i.user.id === player.id
        });

        confirmCollector.on('collect', async (btn) => {
            if (btn.customId === 'continue_singleplayer') {
                confirmCollector.stop('continue');
                await btn.update({ 
                    content: 'Starting singleplayer game (ephemeral mode)...', 
                    embeds: [], 
                    components: [] 
                });
                // Continue with the game setup below
            } else {
                confirmCollector.stop('cancel');
                await btn.update({ 
                    content: 'Game cancelled.', 
                    embeds: [], 
                    components: [] 
                });
                return;
            }
        });

        confirmCollector.on('end', async (_, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: 'Game setup timed out.',
                    embeds: [],
                    components: []
                });
                return;
            }
            if (reason !== 'continue') return;
        });

        // Wait for the collector to finish
        await new Promise<void>((resolve) => {
            confirmCollector.on('end', (_, reason) => {
                if (reason === 'continue') resolve();
            });
        });
    }

	const board: string[][] = [
		['⬜', '⬜', '⬜'],
		['⬜', '⬜', '⬜'],
		['⬜', '⬜', '⬜']
	];
	let currentPlayer = player;

	const createGameEmbed = (status = `It's ${currentPlayer.username}'s turn!`): EmbedBuilder => {
		return new EmbedBuilder()
			.setTitle('Tic Tac Toe')
			.setDescription(board.map((row) => row.join(' ')).join('\n'))
			.setFooter({ text: status });
	};

	const createGameButtons = (): ActionRowBuilder<ButtonBuilder>[] => {
		const rows = board.map((row, rowIndex) =>
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				row.map((cell, colIndex) =>
					new ButtonBuilder()
						.setCustomId(`${rowIndex}-${colIndex}`)
						.setLabel(cell)
						.setStyle(cell === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
						.setDisabled(cell !== '⬜')
				)
			)
		);
		// Only add the withdraw row ONCE, not every time you call this function
		return [
			...rows,
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId('withdraw').setLabel('Withdraw').setStyle(ButtonStyle.Danger)
			)
		];
	};

	const checkWinner = (): string | null => {
		// Check rows and columns
		for (let i = 0; i < 3; i++) {
			if (board[i][0] !== '⬜' && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
				return board[i][0];
			}
			if (board[0][i] !== '⬜' && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
				return board[0][i];
			}
		}

		// Check diagonals
		if (board[0][0] !== '⬜' && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
			return board[0][0];
		}
		if (board[0][2] !== '⬜' && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
			return board[0][2];
		}

		return null;
	};

	const isBoardFull = (): boolean => {
		return board.every((row) => row.every((cell) => cell !== '⬜'));
	};

	const botMove = (): void => {
		const luck = Math.random();
		if (luck < 0.15) {
			// 15% chance: bot plays easy (random move)
			const emptyCells: [number, number][] = [];
			for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (board[i][j] === '⬜') emptyCells.push([i, j]);
			const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
			board[row][col] = '⭕';
			return;
		}
		if (luck > 0.95) {
			// 5% chance: bot plays perfectly (always blocks/wins)
			// (current logic, but run both win and block in one pass)
			for (let i = 0; i < 3; i++)
				for (let j = 0; j < 3; j++) {
					if (board[i][j] === '⬜') {
						board[i][j] = '⭕';
						if (checkWinner() === '⭕') return;
						board[i][j] = '⬜';
					}
				}
			for (let i = 0; i < 3; i++)
				for (let j = 0; j < 3; j++) {
					if (board[i][j] === '⬜') {
						board[i][j] = '❌';
						if (checkWinner() === '❌') {
							board[i][j] = '⭕';
							return;
						}
						board[i][j] = '⬜';
					}
				}
			// If no win/block, random move
			const emptyCells: [number, number][] = [];
			for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (board[i][j] === '⬜') emptyCells.push([i, j]);
			const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
			board[row][col] = '⭕';
			return;
		}
		// 80% chance: normal logic (your current logic)
		// Check if bot can win
		for (let i = 0; i < 3; i++)
			for (let j = 0; j < 3; j++) {
				if (board[i][j] === '⬜') {
					board[i][j] = '⭕';
					if (checkWinner() === '⭕') return;
					board[i][j] = '⬜';
				}
			}
		// Check if bot needs to block player
		for (let i = 0; i < 3; i++)
			for (let j = 0; j < 3; j++) {
				if (board[i][j] === '⬜') {
					board[i][j] = '❌';
					if (checkWinner() === '❌') {
						board[i][j] = '⭕';
						return;
					}
					board[i][j] = '⬜';
				}
			}
		// Random move
		const emptyCells: [number, number][] = [];
		for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (board[i][j] === '⬜') emptyCells.push([i, j]);
		const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
		board[row][col] = '⭕';
	};

	const embed = createGameEmbed();
	const components = createGameButtons();

	await interaction.reply({ embeds: [embed], components });
	const message = await interaction.fetchReply();

	let timeout: NodeJS.Timeout;

	const resetTimer = () => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(async () => {
			collector.stop('timeout');
		}, 300000);
	};

	resetTimer();

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button
	});

	collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
		if (buttonInteraction.customId === 'withdraw') {
			if (![player.id, bot.id].includes(buttonInteraction.user.id)) {
				return buttonInteraction.reply({ content: 'Only the players can resign this game.', flags: MessageFlags.Ephemeral });
			}
			collector.stop(`resign_${buttonInteraction.user.id}`);
			return;
		}

		if (buttonInteraction.user.id !== player.id) {
			return buttonInteraction.reply({ content: 'This is not your game!', flags: MessageFlags.Ephemeral });
		}

		const [row, col] = buttonInteraction.customId.split('-').map(Number);

		if (board[row][col] !== '⬜') {
			return buttonInteraction.reply({ content: 'This spot is already taken!', flags: MessageFlags.Ephemeral });
		}

		board[row][col] = '❌';

		const winner = checkWinner();
		if (winner) {
			collector.stop('win');
			return;
		}

		if (isBoardFull()) {
			collector.stop('draw');
			return;
		}

		botMove();

		const botWinner = checkWinner();
		if (botWinner) {
			collector.stop('loss');
			return;
		}

		if (isBoardFull()) {
			collector.stop('draw');
			return;
		}

		resetTimer();

		await buttonInteraction.update({
			embeds: [createGameEmbed()],
			components: createGameButtons() // do NOT add the withdraw row again here
		});
	});

	collector.on('end', async (_, reason) => {
		if (reason === 'timeout') {
			await interaction.editReply({
				embeds: [createGameEmbed('The game ended in a draw due to inactivity.')],
				components: []
			});
		} else if (reason === 'withdraw') {
			await gameStatsModel.updateOne(
				{ userId: player.id },
				{ $inc: { 'gameStats.singleplayer.tictactoe.losses': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 } }
			);
			await interaction.editReply({
				embeds: [createGameEmbed('You withdrew from the game. The bot wins!')],
				components: []
			});
		} else if (reason === 'win') {
			await gameStatsModel.updateOne(
				{ userId: player.id },
				{ $inc: { 'gameStats.singleplayer.tictactoe.wins': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 } }
			);
			await interaction.editReply({
				embeds: [createGameEmbed(`${player.username} wins!`)],
				components: []
			});
		} else if (reason === 'loss') {
			await gameStatsModel.updateOne(
				{ userId: player.id },
				{ $inc: { 'gameStats.singleplayer.tictactoe.losses': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 } }
			);
			await interaction.editReply({
				embeds: [createGameEmbed('The bot wins!')],
				components: []
			});
		} else if (reason === 'draw') {
			await gameStatsModel.updateOne(
				{ userId: player.id },
				{ $inc: { 'gameStats.singleplayer.tictactoe.draws': 1, 'gameStats.singleplayer.tictactoe.gamesPlayed': 1 } }
			);
			await interaction.editReply({
				embeds: [createGameEmbed("It's a draw!")],
				components: []
			});
		}

		// Show replay button after stats update
		await interaction.editReply({
			embeds: [createGameEmbed('Game over!')],
			components: [getReplayRow()]
		});
		
		const replayMsg = await interaction.fetchReply();
		const replayCollector = replayMsg.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 15000
		});
		
		replayCollector.on('collect', async (btn) => {
			if (btn.customId !== 'replay') return;
			
			if (btn.user.id !== player.id) {
				return btn.reply({ content: 'Only you can replay this game.', flags: MessageFlags.Ephemeral });
			}
			
			replayCollector.stop('accepted');
			await btn.update({ content: 'Starting a new game...', components: [] });
			
			// Start new singleplayer game using the button interaction
			await startSinglePlayerGame(btn, player, bot);
		});
		
		replayCollector.on('end', async (_, reason) => {
			if (reason !== 'accepted') {
				await interaction.editReply({
					embeds: [createGameEmbed('Game over!')],
					components: []
				});
			}
		});
	});
}

export async function startMultiplayerGame(interaction: ModuleCommand.ChatInputCommandInteraction, player1: User, player2: User) {
    // Check if bot is properly in guild for multiplayer functionality
    if (interaction.guild && !isBotProperlyInGuild(interaction)) {
        return interaction.reply({
            embeds: [
                createBotNotInServerEmbed()
                    .setDescription(
                        createBotNotInServerEmbed().data.description + 
                        '\n\n**Multiplayer games require the bot to be properly invited to the server.**'
                    )
            ],
            ephemeral: true
        });
    }

    const gameStatsModel = getGameStatsModel('userdb');
    const player1Id = player1.id;
    const player2Id = player2.id;

    const defaultStats = {
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0
    };
    await gameStatsModel.updateOne({ userId: player1Id }, { $setOnInsert: { 'gameStats.multiplayer.tictactoe': defaultStats } }, { upsert: true });
    await gameStatsModel.updateOne({ userId: player2Id }, { $setOnInsert: { 'gameStats.multiplayer.tictactoe': defaultStats } }, { upsert: true });

    // Multiplayer game logic
    const board: string[][] = [
        ['⬜', '⬜', '⬜'],
        ['⬜', '⬜', '⬜'],
        ['⬜', '⬜', '⬜']
    ];
    let currentPlayer = Math.random() < 0.5 ? player1 : player2;
    let movesMade = 0;

    const createGameEmbed = (status = `It's ${currentPlayer.username}'s turn!`): EmbedBuilder => {
        return new EmbedBuilder().setTitle('Tic Tac Toe').setDescription(status).setFooter({ text: status });
    };

    const createGameButtons = (): ActionRowBuilder<ButtonBuilder>[] => {
        return board.map((row, rowIndex) =>
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                row.map((cell, colIndex) =>
                    new ButtonBuilder()
                        .setCustomId(`${rowIndex}-${colIndex}`)
                        .setLabel(cell)
                        .setStyle(cell === '⬜' ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(cell !== '⬜')
                )
            )
        );
    };

    const checkWinner = (): string | null => {
        // Check rows and columns
        for (let i = 0; i < 3; i++) {
            if (board[i][0] !== '⬜' && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
                return board[i][0];
            }
            if (board[0][i] !== '⬜' && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
                return board[0][i];
            }
        }

        // Check diagonals
        if (board[0][0] !== '⬜' && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
            return board[0][0];
        }
        if (board[0][2] !== '⬜' && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
            return board[0][2];
        }

        return null;
    };

    const isBoardFull = (): boolean => {
        return board.every((row) => row.every((cell) => cell !== '⬜'));
    };

    const embed = createGameEmbed();
    const components = [...createGameButtons(), getGameControlRow({ multiplayer: true })];

    await interaction.reply({
        content: `<@${player2.id}>`,
        embeds: [embed],
        components
    });
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 1 minute
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        // Handle resign button (any of the two players can click)
        if (buttonInteraction.customId === 'withdraw') {
            if (![player1.id, player2.id].includes(buttonInteraction.user.id)) {
                return buttonInteraction.reply({
                    content: 'Only the players can resign this game.',
                    flags: MessageFlags.Ephemeral
                });
            }
            collector.stop('resign');
            const resignedPlayer = buttonInteraction.user.id === player1Id ? player1 : player2;
            const winnerPlayer = buttonInteraction.user.id === player1Id ? player2 : player1;
            
            // Update stats
            await gameStatsModel.updateOne(
                { userId: buttonInteraction.user.id },
                { $inc: { 'gameStats.multiplayer.tictactoe.losses': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
            );
            await gameStatsModel.updateOne(
                { userId: winnerPlayer.id },
                { $inc: { 'gameStats.multiplayer.tictactoe.wins': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
            );

            await buttonInteraction.update({
                embeds: [createGameEmbed(`${resignedPlayer.username} resigned. ${winnerPlayer.username} wins!`)],
                components: [getReplayRow()]
            });
            return;
        }

        // Handle offer draw button (any of the two players can click)
        if (buttonInteraction.customId === 'offer_draw') {
            if (![player1.id, player2.id].includes(buttonInteraction.user.id)) {
                return buttonInteraction.reply({
                    content: 'Only the players can offer a draw.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const offeringPlayer = buttonInteraction.user.id === player1Id ? player1 : player2;
            const otherPlayer = buttonInteraction.user.id === player1Id ? player2 : player1;
            
            const drawButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_draw_${otherPlayer.id}`)
                    .setLabel('Accept Draw')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`decline_draw_${otherPlayer.id}`)
                    .setLabel('Decline Draw')
                    .setStyle(ButtonStyle.Danger)
            );

            await buttonInteraction.update({
                embeds: [createGameEmbed(`${offeringPlayer.username} offers a draw. ${otherPlayer.username}, do you accept?`)],
                components: [...createGameButtons(), drawButtons]
            });
            return;
        }

        // Handle draw response buttons
        if (buttonInteraction.customId.startsWith('accept_draw_') || buttonInteraction.customId.startsWith('decline_draw_')) {
            const expectedUserId = buttonInteraction.customId.split('_')[2];
            if (buttonInteraction.user.id !== expectedUserId) {
                return buttonInteraction.reply({
                    content: 'Only the player being asked can respond to the draw offer.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (buttonInteraction.customId.startsWith('accept_draw_')) {
                collector.stop('draw');
                await gameStatsModel.updateOne(
                    { userId: player1Id },
                    { $inc: { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
                );
                await gameStatsModel.updateOne(
                    { userId: player2Id },
                    { $inc: { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
                );

                await buttonInteraction.update({
                    embeds: [createGameEmbed("Draw accepted! It's a draw!")],
                    components: [getReplayRow()]
                });
                return;
            } else {
                await buttonInteraction.update({
                    embeds: [createGameEmbed()],
                    components: [...createGameButtons(), getGameControlRow({ multiplayer: true })]
                });
                return;
            }
        }

        // Regular game move logic (must be player's turn)
        if (![player1.id, player2.id].includes(buttonInteraction.user.id)) {
            return buttonInteraction.reply({
                content: 'This is not your game! Start a new game with `/game tictactoe`.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (buttonInteraction.user.id !== currentPlayer.id) {
            return buttonInteraction.reply({
                content: "It's not your turn! Please wait for your turn.",
                flags: MessageFlags.Ephemeral
            });
        }

        const [row, col] = buttonInteraction.customId.split('-').map(Number);
        if (isNaN(row) || isNaN(col)) return; // Not a game move button

        if (board[row][col] !== '⬜') {
            return buttonInteraction.reply({ content: 'This spot is already taken!', flags: MessageFlags.Ephemeral });
        }

        board[row][col] = currentPlayer === player1 ? '❌' : '⭕';
        currentPlayer = currentPlayer === player1 ? player2 : player1;
        movesMade++;

        const winner = checkWinner();
        if (winner) {
            collector.stop('win');
            const winnerId = winner === '❌' ? player1Id : player2Id;
            const loserId = winner === '❌' ? player2Id : player1Id;

            // Update stats in the db
            await gameStatsModel.updateOne(
                { userId: winnerId },
                { $inc: { 'gameStats.multiplayer.tictactoe.wins': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
            );
            await gameStatsModel.updateOne(
                { userId: loserId },
                { $inc: { 'gameStats.multiplayer.tictactoe.losses': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
            );

            await buttonInteraction.update({
                embeds: [createGameEmbed(`${winner === '❌' ? player1.username : player2.username} wins!`)],
                components: [getReplayRow()]
            });
            return;
        }

        if (isBoardFull()) {
            collector.stop('draw');
            await gameStatsModel.updateOne(
                { userId: player1Id },
                { $inc: { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
            );
            await gameStatsModel.updateOne(
                { userId: player2Id },
                { $inc: { 'gameStats.multiplayer.tictactoe.draws': 1, 'gameStats.multiplayer.tictactoe.gamesPlayed': 1 } }
            );

            await buttonInteraction.update({
                embeds: [createGameEmbed("It's a draw!")],
                components: [getReplayRow()]
            });
            return;
        }

        await buttonInteraction.update({
            embeds: [createGameEmbed()],
            components: [...createGameButtons(), getGameControlRow({ multiplayer: true })]
        });
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'win' || reason === 'draw' || reason === 'resign') {
            // Add replay functionality
            const replayMsg = await interaction.fetchReply();
            const replayCollector = replayMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 15000
            });
            let replayInitiator: string | null = null;
            
            replayCollector.on('collect', async (btn) => {
                if (btn.customId !== 'replay') return;
                
                const allowedIds = [player1.id, player2.id];
                if (!allowedIds.includes(btn.user.id)) {
                    return btn.reply({ content: 'Only the players can replay this game.', flags: MessageFlags.Ephemeral });
                }
                
                if (!replayInitiator) {
                    // First click: set initiator, update button to "Accept Replay"
                    replayInitiator = btn.user.id;
                    await btn.update({
                        embeds: [createGameEmbed(`${btn.user.username} wants a rematch! Waiting for the other player to accept...`)],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('replay')
                                    .setLabel('Accept Replay')
                                    .setEmoji('🔄')
                                    .setStyle(ButtonStyle.Success)
                            )
                        ]
                    });
                    return;
                }
                
                if (btn.user.id === replayInitiator) {
                    return btn.reply({ content: 'Waiting for the other player to accept.', flags: MessageFlags.Ephemeral });
                }
                
                // Second player accepts
                replayCollector.stop('accepted');
                await btn.update({ content: 'Starting a new game...', components: [] });
                await startMultiplayerGame(interaction, player1, player2);
            });
            
            replayCollector.on('end', async (_, reason) => {
                if (reason !== 'accepted') {
                    await interaction.editReply({
                        embeds: [createGameEmbed('Game over!')],
                        components: []
                    });
                }
            });
            return;
        }
        
        if (reason === 'time' || reason === 'idle' || reason === 'timeout') {
            // If no moves were made, auto abort
            if (movesMade === 0) {
                await interaction.editReply({
                    content: `<@${player2.id}> did not join the game, auto aborting.`,
                    embeds: [],
                    components: []
                });
            } else {
                await interaction.editReply({
                    embeds: [createGameEmbed('Game over!')],
                    components: []
                });
            }
        }
    });
}
