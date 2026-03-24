import { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import BingoWheel from '../components/BingoWheel';
import QRDisplay from '../components/QRDisplay';
import { BingoClaim, GameSnapshot } from '../types';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? 'bingo-admin-2026';

type Tab = 'wheel' | 'qr' | 'claims';

export default function AdminView() {
  const [authenticated, setAuthenticated] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [gameState, setGameState] = useState<GameSnapshot | null>(null);
  const [qrData, setQrData] = useState<{ dataUrl: string; url: string } | null>(null);
  const [claims, setClaims] = useState<BingoClaim[]>([]);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [tab, setTab] = useState<Tab>('wheel');
  const [eventSlugInput, setEventSlugInput] = useState('hari-raya');
  const [eventNameInput, setEventNameInput] = useState('');

  const spinQueueRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;

    socket.connect();
    socket.emit('join-admin', { adminSecret: ADMIN_SECRET });
    socket.emit('get-qr');

    socket.on('state-update', (data: Partial<GameSnapshot>) => {
      setGameState(prev => prev ? { ...prev, ...data } : (data as GameSnapshot));
    });

    socket.on('qr-code', (data: { dataUrl: string; url: string }) => {
      setQrData(data);
    });

    socket.on('word-called', ({ word, calledWords }: { word: string; calledWords: string[] }) => {
      spinQueueRef.current = word;
      setCurrentWord(word);
      setIsSpinning(true);
      setGameState(prev => prev ? { ...prev, calledWords } : null);
    });

    socket.on('bingo-claimed', (claim: BingoClaim) => {
      setClaims(prev => [claim, ...prev]);
    });

    socket.on('game-reset', (data: GameSnapshot) => {
      setGameState(data);
      setClaims([]);
      setCurrentWord(null);
      setIsSpinning(false);
    });

    socket.on('error', ({ message }: { message: string }) => {
      alert(`Server error: ${message}`);
    });

    return () => {
      socket.off('state-update');
      socket.off('qr-code');
      socket.off('word-called');
      socket.off('bingo-claimed');
      socket.off('game-reset');
      socket.off('error');
      socket.disconnect();
    };
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretInput === ADMIN_SECRET) {
      setAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect admin password');
    }
  };

  const handleSpin = () => {
    if (isSpinning) return;
    socket.emit('spin-word', { adminSecret: ADMIN_SECRET });
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
  };

  const handleReset = () => {
    if (!confirm('Reset the game? All players will need to rejoin.')) return;
    socket.emit('reset-game', {
      adminSecret: ADMIN_SECRET,
      eventSlug: eventSlugInput || 'hari-raya',
      eventName: eventNameInput || undefined,
    });
  };

  if (!authenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-raya-green p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-raya-green text-center mb-6">Admin Panel</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={secretInput}
              onChange={e => setSecretInput(e.target.value)}
              placeholder="Admin password"
              autoFocus
              className="px-4 py-3 rounded-xl border-2 border-raya-green/30 focus:border-raya-green outline-none"
            />
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button
              type="submit"
              className="py-3 bg-raya-green text-white font-bold rounded-xl hover:bg-raya-dark transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  const wordPool = gameState?.wordPool ?? [];
  const calledWords = gameState?.calledWords ?? [];

  return (
    <div className="min-h-dvh flex flex-col bg-raya-dark text-white">
      {/* Header */}
      <header className="bg-raya-green px-6 py-4 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-2xl font-black tracking-wide">🎯 Bingo Admin</h1>
          <p className="text-white/70 text-sm">{gameState?.eventName ?? 'Loading…'}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black">{gameState?.playerCount ?? 0}</p>
          <p className="text-white/70 text-xs">Players</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex bg-raya-dark border-b border-white/10">
        {(['wheel', 'qr', 'claims'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
              tab === t ? 'text-raya-gold border-b-2 border-raya-gold' : 'text-white/50 hover:text-white'
            }`}
          >
            {t === 'wheel' ? '🎡 Wheel' : t === 'qr' ? '📱 QR Code' : `🏆 Claims (${claims.length})`}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Wheel tab */}
        {tab === 'wheel' && (
          <div className="flex flex-col items-center gap-6 pt-2">
            <BingoWheel
              words={wordPool}
              calledWords={calledWords}
              currentWord={currentWord}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
            />

            <button
              onClick={handleSpin}
              disabled={isSpinning || wordPool.length === calledWords.length}
              className={`
                w-full max-w-xs py-5 rounded-2xl text-2xl font-black shadow-xl transition-all
                ${isSpinning || wordPool.length === calledWords.length
                  ? 'bg-white/20 text-white/40 cursor-not-allowed'
                  : 'bg-raya-gold text-raya-dark hover:scale-105 active:scale-95 animate-pulse-gold'
                }
              `}
            >
              {isSpinning ? 'Spinning…' : wordPool.length === calledWords.length ? 'All words called!' : '🎡 SPIN!'}
            </button>

            {/* Called words list */}
            {calledWords.length > 0 && (
              <div className="w-full max-w-xs">
                <p className="text-white/60 text-xs uppercase tracking-wide mb-2">Called words ({calledWords.length})</p>
                <div className="flex flex-wrap gap-2">
                  {[...calledWords].reverse().map((w, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        i === 0 ? 'bg-raya-gold text-raya-dark' : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* QR tab */}
        {tab === 'qr' && (
          <div className="flex flex-col items-center gap-6 pt-4">
            {qrData ? (
              <QRDisplay dataUrl={qrData.dataUrl} url={qrData.url} />
            ) : (
              <div className="text-white/50 text-center py-10">
                <div className="text-4xl mb-2 animate-spin-slow">⏳</div>
                <p>Generating QR code…</p>
              </div>
            )}
            <p className="text-white/60 text-sm text-center max-w-xs">
              Show this on the projector so players can scan and join
            </p>
          </div>
        )}

        {/* Claims tab */}
        {tab === 'claims' && (
          <div className="flex flex-col gap-3 pt-2">
            {claims.length === 0 ? (
              <p className="text-white/40 text-center py-10">No bingo claims yet</p>
            ) : (
              claims.map((c, i) => (
                <div key={i} className="bg-raya-gold/20 border border-raya-gold rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-raya-gold text-lg">{c.playerName}</p>
                    <p className="text-white/50 text-xs">
                      {new Date(c.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="text-3xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Reset footer */}
      <footer className="border-t border-white/10 p-4">
        <details className="text-sm">
          <summary className="text-white/40 cursor-pointer hover:text-white/60 select-none">
            Reset / Change Event
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <input
              type="text"
              value={eventSlugInput}
              onChange={e => setEventSlugInput(e.target.value)}
              placeholder="Event slug (e.g. hari-raya, christmas)"
              className="px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/30 text-sm outline-none border border-white/20"
            />
            <input
              type="text"
              value={eventNameInput}
              onChange={e => setEventNameInput(e.target.value)}
              placeholder="Custom event name (optional)"
              className="px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/30 text-sm outline-none border border-white/20"
            />
            <button
              onClick={handleReset}
              className="py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
            >
              Reset Game
            </button>
          </div>
        </details>
      </footer>
    </div>
  );
}
