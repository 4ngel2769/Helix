import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    User
} from 'discord.js';
import { getGameStatsModel } from '../../../models/GameStats';
import { getGameControlRow, getReplayRow } from '../../../components/GameControls';
import { ModuleCommand } from '@kbotdev/plugin-modules';

export async function startSinglePlayerGame(interaction: ModuleCommand.ChatInputCommandInteraction | ButtonInteraction, player: User, bot: User) {
	const gameStatsModel = getGameStatsModel('userdb');
	const playerId = player.id;

	// Initialize stats if not already present
	await gameStatsModel.updateOne(
		{ userId: playerId },
		{ $setOnInsert: { gameStats: { singleplayer: { tictactoe: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 } } } } },
		{ upsert: true }
	);

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
				return buttonInteraction.reply({ content: 'Only the players can resign this game.', ephemeral: true });
			}
			collector.stop(`resign_${buttonInteraction.user.id}`);
			return;
		}

		if (buttonInteraction.user.id !== player.id) {
			return buttonInteraction.reply({ content: 'This is not your game!', ephemeral: true });
		}

		const [row, col] = buttonInteraction.customId.split('-').map(Number);

		if (board[row][col] !== '⬜') {
			return buttonInteraction.reply({ content: 'This spot is already taken!', ephemeral: true });
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

		await interaction.editReply({
			embeds: [createGameEmbed(`Game over!`)],
			components: [getReplayRow()]
		});
		const replayMsg = await interaction.fetchReply();
		const replayCollector = replayMsg.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 15000
		});
		replayCollector.on('collect', async (btn) => {
			if (btn.user.id !== player.id) {
				return btn.reply({ content: 'Only you can replay this game.', ephemeral: true });
			}
			replayCollector.stop('accepted');
			await btn.update({ content: 'Starting a new game...', components: [] });
			try {
				// Only call reply if not already replied/deferred
				if (!btn.replied && !btn.deferred) {
					await startSinglePlayerGame(btn, player, bot);
				}
			} catch (err: any) {
				if (err.code === 'InteractionAlreadyReplied') {
					// Optionally log or ignore
				} else {
					throw err;
				}
			}
		});
		replayCollector.on('end', async (_, reason) => {
			if (reason !== 'accepted') {
				await interaction.editReply({
					embeds: [createGameEmbed('Game over!')],
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId('replay')
								.setLabel('Replay')
								.setEmoji('🔄')
								.setStyle(ButtonStyle.Success)
								.setDisabled(true)
						)
					]
				});
			}
		});
	});
}

export async function startMultiplayerGame(interaction: ModuleCommand.ChatInputCommandInteraction, player1: User, player2: User) {
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
		if (![player1.id, player2.id].includes(buttonInteraction.user.id)) {
			return buttonInteraction.reply({
				content: 'This is not your game! Start a new game with `/game tictactoe`.',
				ephemeral: true
			});
		}

		if (buttonInteraction.user.id !== currentPlayer.id) {
			return buttonInteraction.reply({
				content: "It's not your turn! Please wait for your turn.",
				ephemeral: true
			});
		}

		const [row, col] = buttonInteraction.customId.split('-').map(Number);

		if (board[row][col] !== '⬜') {
			return buttonInteraction.reply({ content: 'This spot is already taken!', ephemeral: true });
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

			return interaction.editReply({
				embeds: [createGameEmbed(`${winner === '❌' ? player1.username : player2.username} wins!`)],
				components: []
			});
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

			return interaction.editReply({
				embeds: [createGameEmbed("It's a draw!")],
				components: []
			});
		}

		await buttonInteraction.update({
			embeds: [createGameEmbed()],
			components: [...createGameButtons(), getGameControlRow({ multiplayer: true })]
		});
	});

	collector.on('end', async (_, reason) => {
		if (reason === 'win' || reason === 'draw') {
			// Already handled above
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
					components: [getGameControlRow({ multiplayer: true }), getReplayRow()]
				});
			}
		} else {
			await interaction.editReply({
				embeds: [createGameEmbed('Game over!')],
				components: [getGameControlRow({ multiplayer: true }), getReplayRow()]
			});
		}
	});
}
