import { Server, Socket } from 'socket.io';
import QRCode from 'qrcode';
import {
  addPlayer,
  removePlayer,
  getRandomUncalledWord,
  callWord,
  recordBingoClaim,
  resetGame,
  getSnapshot,
} from './gameState';
import {
  JoinGamePayload,
  SpinWordPayload,
  SpinCompletePayload,
  ClaimBingoPayload,
  ResetGamePayload,
} from './types';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'admin';

export function registerHandlers(io: Server, socket: Socket, serverUrl: string): void {
  // Player joins and receives their unique card
  socket.on('join-game', (payload: JoinGamePayload) => {
    const name = (payload?.playerName ?? '').trim() || 'Player';
    const card = addPlayer(socket.id, name);
    socket.emit('card-assigned', card);

    // Notify admin of updated player count
    const snap = getSnapshot();
    io.to('admin').emit('state-update', { playerCount: snap.playerCount });
  });

  // Admin: request QR code
  socket.on('get-qr', async () => {
    try {
      const playerUrl = serverUrl;
      const dataUrl = await QRCode.toDataURL(playerUrl, { width: 400 });
      socket.emit('qr-code', { dataUrl, url: playerUrl });
    } catch (err) {
      socket.emit('error', { message: 'Failed to generate QR code' });
    }
  });

  // Admin: spin the wheel → get word but don't call it yet
  socket.on('spin-word', (payload: SpinWordPayload) => {
    if (payload?.adminSecret !== ADMIN_SECRET) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    const word = getRandomUncalledWord();
    if (!word) {
      socket.emit('error', { message: 'All words have been called!' });
      return;
    }
    // Only notify admin(s) to start their local spin animations
    io.to('admin').emit('spin-started', { word });
  });

  // Admin: wheel spin animation finished → officially call the word
  socket.on('spin-complete', (payload: SpinCompletePayload) => {
    if (payload?.adminSecret !== ADMIN_SECRET) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (payload.word) {
      const snapBefore = getSnapshot();
      if (snapBefore.calledWords.includes(payload.word)) {
        // already handled by another admin instance
        return;
      }
      callWord(payload.word);
    }
    const snap = getSnapshot();
    io.emit('word-called', { word: payload.word, calledWords: snap.calledWords });
    io.to('admin').emit('state-update', { playerCount: snap.playerCount });
  });

  // Player: claim bingo
  socket.on('claim-bingo', (payload: ClaimBingoPayload) => {
    const name = (payload?.playerName ?? '').trim() || 'Player';
    const claim = recordBingoClaim(socket.id, name);
    io.to('admin').emit('bingo-claimed', {
      playerName: claim.playerName,
      socketId: claim.socketId,
      timestamp: claim.timestamp,
    });
    // Notify all so they can celebrate too
    io.emit('bingo-announced', { playerName: claim.playerName });
  });

  // Admin: join admin room + request current state
  socket.on('join-admin', (payload: { adminSecret: string }) => {
    if (payload?.adminSecret !== ADMIN_SECRET) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    socket.join('admin');
    socket.emit('state-update', getSnapshot());
  });

  // Admin: reset game
  socket.on('reset-game', (payload: ResetGamePayload) => {
    if (payload?.adminSecret !== ADMIN_SECRET) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    resetGame(payload.eventSlug, payload.eventName);
    io.emit('game-reset', getSnapshot());
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    removePlayer(socket.id);
    const snap = getSnapshot();
    io.to('admin').emit('state-update', { playerCount: snap.playerCount });
  });
}
