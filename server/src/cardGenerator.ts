import { BingoCard } from './types';
import { v4 as uuidv4 } from 'uuid';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateCard(playerName: string, wordPool: string[]): BingoCard {
  if (wordPool.length < 24) {
    throw new Error('Word pool must have at least 24 words for a 5x5 bingo card with FREE center');
  }

  const selected = shuffle(wordPool).slice(0, 24);
  const grid: string[][] = [];
  const markedCells: boolean[][] = [];

  let wordIndex = 0;
  for (let row = 0; row < 5; row++) {
    grid.push([]);
    markedCells.push([]);
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        grid[row].push('FREE');
        markedCells[row].push(true);
      } else {
        grid[row].push(selected[wordIndex++]);
        markedCells[row].push(false);
      }
    }
  }

  return {
    id: uuidv4(),
    playerName,
    grid,
    markedCells,
  };
}
