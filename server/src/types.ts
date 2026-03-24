export interface BingoCard {
  id: string;
  playerName: string;
  grid: string[][];       // 5x5; center cell = 'FREE'
  markedCells: boolean[][]; // center starts true
}

export interface BingoClaim {
  socketId: string;
  playerName: string;
  timestamp: number;
}

export interface GameState {
  eventName: string;
  eventSlug: string;
  wordPool: string[];
  calledWords: string[];
  players: Map<string, BingoCard>;
  bingoClaims: BingoClaim[];
  status: 'waiting' | 'active' | 'ended';
}

// Socket event payloads
export interface JoinGamePayload {
  playerName: string;
}

export interface SpinWordPayload {
  adminSecret: string;
}

export interface ClaimBingoPayload {
  playerName: string;
}

export interface ResetGamePayload {
  adminSecret: string;
  eventSlug?: string;
  eventName?: string;
}

export interface WordCalledEvent {
  word: string;
  calledWords: string[];
}

export interface BingoClaimedEvent {
  playerName: string;
  socketId: string;
  timestamp: number;
}

export interface GameStateSnapshot {
  eventName: string;
  calledWords: string[];
  playerCount: number;
  bingoClaims: BingoClaim[];
  status: GameState['status'];
  wordPool: string[];
}
