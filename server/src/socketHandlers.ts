import { Server, Socket } from 'socket.io';
import QRCode from 'qrcode';
import {
  addPlayer,
  removePlayer,
  callNextWord,
  recordBingoClaim,
  resetGame,
  getSnapshot,
} from './gameState';
import {
  JoinGamePayload,
  SpinWordPayload,
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

  // Admin: spin the wheel → call next word
  socket.on('spin-word', (payload: SpinWordPayload) => {
    if (payload?.adminSecret !== ADMIN_SECRET) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    const word = callNextWord();
    if (!word) {
      socket.emit('error', { message: 'All words have been called!' });
      return;
    }
    const snap = getSnapshot();
    io.emit('word-called', { word, calledWords: snap.calledWords });
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
