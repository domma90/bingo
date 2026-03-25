import { GameState, BingoCard, BingoClaim } from './types';
import { getWordPool } from './wordPool';
import { generateCard } from './cardGenerator';

function createInitialState(eventSlug = 'hari-raya'): GameState {
  const pool = getWordPool(eventSlug);
  return {
    eventName: pool.name,
    eventSlug,
    wordPool: pool.words,
    calledWords: [],
    players: new Map(),
    bingoClaims: [],
    status: 'waiting',
  };
}

let state: GameState = createInitialState();

export function getState(): GameState {
  return state;
}

export function resetGame(eventSlug?: string, eventName?: string): void {
  const slug = eventSlug ?? state.eventSlug;
  state = createInitialState(slug);
  if (eventName) {
    state.eventName = eventName;
  }
}

export function addPlayer(socketId: string, playerName: string): BingoCard {
  const card = generateCard(playerName, state.wordPool);
  state.players.set(socketId, card);
  if (state.status === 'waiting') {
    state.status = 'active';
  }
  return card;
}

export function removePlayer(socketId: string): void {
  state.players.delete(socketId);
}

export function getRandomUncalledWord(): string | null {
  const uncalled = state.wordPool.filter(w => !state.calledWords.includes(w));
  if (uncalled.length === 0) return null;

  const word = uncalled[Math.floor(Math.random() * uncalled.length)];
  return word;
}

export function callWord(word: string): void {
  if (!state.calledWords.includes(word) && state.wordPool.includes(word)) {
    state.calledWords.push(word);
  }
}

export function recordBingoClaim(socketId: string, playerName: string): BingoClaim {
  const claim: BingoClaim = { socketId, playerName, timestamp: Date.now() };
  state.bingoClaims.push(claim);
  return claim;
}

export function getSnapshot() {
  return {
    eventName: state.eventName,
    eventSlug: state.eventSlug,
    calledWords: state.calledWords,
    playerCount: state.players.size,
    bingoClaims: state.bingoClaims,
    status: state.status,
    wordPool: state.wordPool,
  };
}
