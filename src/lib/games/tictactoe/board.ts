export type Board = string[][];

export const EMPTY_CELL = '⬜';
export const PLAYER_MARK = '❌';
export const BOT_MARK = '⭕';

export function createBoard(): Board {
  return Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => EMPTY_CELL));
}

export function checkWinner(board: Board): string | null {
  for (let i = 0; i < 3; i++) {
    if (board[i][0] !== EMPTY_CELL && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
      return board[i][0];
    }
    if (board[0][i] !== EMPTY_CELL && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
      return board[0][i];
    }
  }

  if (board[0][0] !== EMPTY_CELL && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  if (board[0][2] !== EMPTY_CELL && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }

  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== EMPTY_CELL));
}

export function getEmptyCells(board: Board): [number, number][] {
  const cells: [number, number][] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === EMPTY_CELL) cells.push([row, col]);
    }
  }
  return cells;
}

function playRandomBotMove(board: Board): void {
  const cells = getEmptyCells(board);
  if (cells.length === 0) return;
  const [row, col] = cells[Math.floor(Math.random() * cells.length)];
  board[row][col] = BOT_MARK;
}

function tryPlaceWinningOrBlockingMove(board: Board, targetSymbol: '⭕' | '❌'): boolean {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] !== EMPTY_CELL) continue;
      board[row][col] = targetSymbol;
      const isWinningSpot = checkWinner(board) === targetSymbol;
      board[row][col] = EMPTY_CELL;
      if (!isWinningSpot) continue;
      board[row][col] = BOT_MARK;
      return true;
    }
  }
  return false;
}

export function botMove(board: Board): void {
  if (Math.random() < 0.15) {
    playRandomBotMove(board);
    return;
  }
  if (tryPlaceWinningOrBlockingMove(board, BOT_MARK)) return;
  if (tryPlaceWinningOrBlockingMove(board, PLAYER_MARK)) return;
  playRandomBotMove(board);
}
