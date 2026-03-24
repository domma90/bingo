export interface BingoCard {
  id: string;
  playerName: string;
  grid: string[][];
  markedCells: boolean[][];
}

export interface BingoClaim {
  socketId: string;
  playerName: string;
  timestamp: number;
}

export interface GameSnapshot {
  eventName: string;
  eventSlug: string;
  calledWords: string[];
  playerCount: number;
  bingoClaims: BingoClaim[];
  status: 'waiting' | 'active' | 'ended';
  wordPool: string[];
}
