import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';
import BingoCard from '../components/BingoCard';
import { BingoCard as BingoCardType } from '../types';

type Phase = 'join' | 'waiting' | 'playing' | 'bingo';

export default function PlayerView() {
  const [phase, setPhase] = useState<Phase>('join');
  const [playerName, setPlayerName] = useState('');
  const [card, setCard] = useState<BingoCardType | null>(null);
  const [calledWords, setCalledWords] = useState<string[]>([]);
  const [lastCalled, setLastCalled] = useState<string | null>(null);
  const [bingoAnnouncement, setBingoAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    socket.connect();

    const savedId = localStorage.getItem('bingo-player-id');
    const savedName = localStorage.getItem('bingo-player-name');
    if (savedId && savedName) {
      setPlayerName(savedName);
      setPhase('waiting');
      socket.emit('join-game', { playerName: savedName, playerId: savedId });
    }

    socket.on('card-assigned', (data: BingoCardType) => {
      setCard(data);
      setPhase('playing');
      localStorage.setItem('bingo-player-id', data.id);
      localStorage.setItem('bingo-player-name', data.playerName);
    });

    socket.on('word-called', ({ word, calledWords: cw }: { word: string; calledWords: string[] }) => {
      setCalledWords(cw);
      setLastCalled(word);
    });

    socket.on('game-reset', () => {
      setCard(null);
      setCalledWords([]);
      setLastCalled(null);
      setPhase('join');
      setBingoAnnouncement(null);
      localStorage.removeItem('bingo-player-id');
      localStorage.removeItem('bingo-player-name');
    });

    socket.on('bingo-announced', ({ playerName: name }: { playerName: string }) => {
      setBingoAnnouncement(name);
      setTimeout(() => setBingoAnnouncement(null), 5000);
    });

    return () => {
      socket.off('card-assigned');
      socket.off('word-called');
      socket.off('game-reset');
      socket.off('bingo-announced');
      socket.disconnect();
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = playerName.trim() || 'Player';
    setPhase('waiting');
    socket.emit('join-game', { playerName: name });
  };

  const handleBingo = useCallback(() => {
    if (!card || phase === 'bingo') return;
    setPhase('bingo');
    socket.emit('claim-bingo', { playerName: card.playerName });
  }, [card, phase]);

  return (
    <div className="min-h-dvh flex flex-col bg-raya-cream">
      {/* Header */}
      <header className="bg-raya-green text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-xl font-bold tracking-wide">🎯 Bingo!</h1>
          <p className="text-xs text-white/70">Selamat Hari Raya</p>
        </div>
        {card && (
          <div className="text-right">
            <p className="text-xs text-white/70">Playing as</p>
            <p className="text-sm font-semibold">{card.playerName}</p>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        {/* Join form */}
        {phase === 'join' && (
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-raya-gold/30">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">🌙</div>
                <h2 className="text-2xl font-bold text-raya-green">Join the Game</h2>
                <p className="text-sm text-raya-dark/60 mt-1">Enter your name to get your bingo card</p>
              </div>
              <form onSubmit={handleJoin} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Your name"
                  maxLength={30}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border-2 border-raya-green/30 focus:border-raya-green outline-none text-raya-dark text-base"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-raya-green text-white font-bold rounded-xl text-lg shadow hover:bg-raya-dark transition-colors active:scale-95"
                >
                  Get My Card!
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Waiting for card */}
        {phase === 'waiting' && (
          <div className="text-center">
            <div className="text-5xl animate-spin-slow mb-4">🎯</div>
            <p className="text-raya-green font-semibold text-lg">Generating your card…</p>
          </div>
        )}

        {/* Playing */}
        {(phase === 'playing' || phase === 'bingo') && card && (
          <div className="w-full max-w-sm flex flex-col gap-4">
            {/* Last called word */}
            {lastCalled && (
              <div className="text-center bg-raya-gold/20 border border-raya-gold rounded-xl px-4 py-2">
                <p className="text-xs text-raya-dark/60 uppercase tracking-wide">Last called</p>
                <p className="text-xl font-bold text-raya-dark">{lastCalled}</p>
              </div>
            )}

            <BingoCard
              card={card}
              calledWords={calledWords}
              onBingo={handleBingo}
              hasBingo={phase === 'bingo'}
            />

            {/* Bingo button */}
            {phase === 'bingo' ? (
              <div className="text-center py-4 bg-raya-gold rounded-2xl shadow-lg animate-bounce-in">
                <div className="text-4xl mb-1">🎉</div>
                <p className="text-2xl font-black text-raya-dark">BINGO!</p>
                <p className="text-sm text-raya-dark/70">Claim submitted to host</p>
              </div>
            ) : (
              <p className="text-center text-sm text-raya-dark/50">
                {calledWords.length === 0
                  ? 'Waiting for the game to start…'
                  : 'Mark words automatically as they are called!'}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Bingo announcement overlay */}
      {bingoAnnouncement && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-raya-gold text-raya-dark rounded-2xl px-4 py-3 shadow-xl text-center animate-bounce-in">
          <p className="font-black text-xl">🎊 BINGO!</p>
          <p className="text-sm font-semibold">{bingoAnnouncement} got a bingo!</p>
        </div>
      )}
    </div>
  );
}
