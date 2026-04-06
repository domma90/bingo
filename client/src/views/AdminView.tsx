import { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import BingoWheel from '../components/BingoWheel';
import { GameSnapshot } from '../types';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? 'admin';

export default function AdminView() {
  const [authenticated, setAuthenticated] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [gameState, setGameState] = useState<GameSnapshot | null>(null);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [displayWord, setDisplayWord] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [eventSlugInput, setEventSlugInput] = useState('hari-raya');
  const [eventNameInput, setEventNameInput] = useState('');
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    if (!authenticated) return;

    socket.connect();
    socket.emit('join-admin', { adminSecret: ADMIN_SECRET });
    socket.emit('get-qr');

    socket.on('state-update', (data: Partial<GameSnapshot>) => {
      setGameState(prev => prev ? { ...prev, ...data } : (data as GameSnapshot));
    });

    socket.on('spin-started', ({ word }: { word: string }) => {
      setCurrentWord(word);
      setIsSpinning(true);
    });

    socket.on('word-called', ({ word, calledWords }: { word: string; calledWords: string[] }) => {
      setGameState(prev => prev ? { ...prev, calledWords } : null);
      setDisplayWord(word);
    });

    socket.on('game-reset', (data: GameSnapshot) => {
      setGameState(data);
      setCurrentWord(null);
      setDisplayWord(null);
      setIsSpinning(false);
    });

    socket.on('error', ({ message }: { message: string }) => {
      alert(`Server error: ${message}`);
    });

    return () => {
      socket.off('state-update');
      socket.off('spin-started');
      socket.off('word-called');
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
    if (currentWord) {
      socket.emit('spin-complete', { adminSecret: ADMIN_SECRET, word: currentWord });
    }
  };

  const handleReset = () => {
    if (!confirm('Reset the game? All players will need to rejoin.')) return;
    socket.emit('reset-game', {
      adminSecret: ADMIN_SECRET,
      eventSlug: eventSlugInput || 'hari-raya',
      eventName: eventNameInput || undefined,
    });
    setShowReset(false);
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-raya-green p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-7">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-2xl font-black text-raya-green">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-1">Bingo Game Controller</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={secretInput}
              onChange={e => setSecretInput(e.target.value)}
              placeholder="Admin password"
              autoFocus
              className="px-4 py-3 rounded-xl border-2 border-raya-green/30 focus:border-raya-green outline-none text-center tracking-widest text-gray-800"
            />
            {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
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

  // ── Derived state ──────────────────────────────────────────────────────────
  const wordPool = gameState?.wordPool ?? [];
  const calledWords = gameState?.calledWords ?? [];
  const allCalled = wordPool.length > 0 && wordPool.length === calledWords.length;
  const spinDisabled = isSpinning || allCalled;
  const progress = wordPool.length > 0 ? (calledWords.length / wordPool.length) * 100 : 0;

  // ── Admin UI ───────────────────────────────────────────────────────────────
  return (
    <div className="h-dvh flex flex-col bg-[#0d1117] text-white overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#111827] border-b border-white/5 shadow-lg shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-black tracking-wide">🎯 Bingo Admin</h1>
          <p className="text-white/40 text-xs truncate">{gameState?.eventName ?? 'Loading…'}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <p className="text-2xl font-black text-raya-gold leading-none">{gameState?.playerCount ?? 0}</p>
            <p className="text-white/40 text-[10px] uppercase tracking-wide">Players</p>
          </div>

          <button
            onClick={() => setShowReset(v => !v)}
            title="Settings / Reset"
            className={`p-2 rounded-lg transition-colors text-lg leading-none
              ${showReset ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ── Reset drawer ── */}
      {showReset && (
        <div className="bg-[#1a1f2e] border-b border-white/10 px-5 py-4 flex flex-col gap-2 shrink-0">
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-1">Reset / Change Event</p>
          <input
            type="text"
            value={eventSlugInput}
            onChange={e => setEventSlugInput(e.target.value)}
            placeholder="Event slug  (hari-raya, christmas, diwali, generic)"
            className="px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/30 text-sm outline-none border border-white/20 focus:border-raya-gold transition-colors"
          />
          <input
            type="text"
            value={eventNameInput}
            onChange={e => setEventNameInput(e.target.value)}
            placeholder="Custom event name (optional)"
            className="px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/30 text-sm outline-none border border-white/20 focus:border-raya-gold transition-colors"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleReset}
              className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
            >
              Reset Game
            </button>
            <button
              onClick={() => setShowReset(false)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Two-column body ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* ── Left column: wheel & current word ── */}
        <div className="flex flex-col items-center justify-center p-6 lg:flex-1 border-b border-white/5 lg:border-b-0 lg:border-r lg:border-white/5 overflow-hidden gap-6">
          
          {/* Current word banner */}
          <div className={`
            w-full max-w-lg rounded-2xl border-2 px-6 py-5 text-center transition-all duration-300 min-h-[90px] flex items-center justify-center
            ${displayWord
              ? 'bg-raya-green border-raya-gold shadow-[0_0_32px_rgba(201,150,12,0.25)]'
              : 'bg-white/5 border-white/10'
            }
          `}>
            {isSpinning ? (
              <span className="text-white/40 text-lg animate-pulse">Spinning…</span>
            ) : displayWord ? (
              <span className="text-4xl font-black tracking-wide text-white">{displayWord}</span>
            ) : (
              <span className="text-white/30 text-lg">Spin the wheel!</span>
            )}
          </div>

          <div className="w-full max-w-[75vh] aspect-square flex items-center justify-center shrink-0">
            <div className="w-full h-full">
              <BingoWheel
                words={wordPool}
                calledWords={calledWords}
                currentWord={currentWord}
                isSpinning={isSpinning}
                onSpinComplete={handleSpinComplete}
              />
            </div>
          </div>
        </div>

        {/* ── Right column: controls ── */}
        <div className="flex flex-col gap-4 p-5 min-w-[320px] lg:w-96 xl:w-[32rem] overflow-y-auto shrink-0">

          {/* Spin button */}
          <button
            onClick={handleSpin}
            disabled={spinDisabled}
            className={`
              w-full py-6 rounded-3xl text-3xl font-black tracking-wide shadow-2xl
              transition-all duration-150 select-none
              ${spinDisabled
                ? 'bg-white/10 text-white/25 cursor-not-allowed'
                : 'bg-raya-gold text-raya-dark hover:brightness-110 active:scale-95 active:brightness-90'
              }
            `}
            style={!spinDisabled ? { boxShadow: '0 0 48px rgba(201,150,12,0.35)' } : undefined}
          >
            {isSpinning ? '⏳ Spinning…' : allCalled ? '✅ All Called!' : '🎡 SPIN!'}
          </button>

          {/* Progress bar */}
          {wordPool.length > 0 && (
            <div>
              <div className="flex justify-between text-xs text-white/40 mb-1.5">
                <span>{calledWords.length} called</span>
                <span>{wordPool.length - calledWords.length} remaining</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-raya-gold rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="bg-[#111827] rounded-xl border border-white/10 p-4 flex-1 min-h-[120px]">
            {calledWords.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-6">No words called yet</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {[...calledWords].reverse().map((w, reverseIdx) => {
                  const originalCallIdx = calledWords.length - 1 - reverseIdx;
                  // Reconstruct exactly what the wheel looked like when this word was spun
                  const previousCalled = calledWords.slice(0, originalCallIdx);
                  const available = wordPool.filter(poolWord => !previousCalled.includes(poolWord));
                  const wheelWords = available.length > 0 ? available : wordPool;
                  const wheelIdx = wheelWords.indexOf(w);
                  
                  const WHEEL_COLORS = [
                    '#1a6b3c', '#c9960c', '#2d8a52', '#e8b422', '#0d3d22',
                    '#f0c842', '#155e33', '#d4a017', '#1e7a42', '#b8860b',
                  ];
                  const bgColor = wheelIdx !== -1 ? WHEEL_COLORS[wheelIdx % WHEEL_COLORS.length] : '#1a6b3c';

                  const isLatest = reverseIdx === 0;

                  return (
                    <span
                      key={w}
                      className={`px-4 py-2 rounded-xl text-lg font-bold shadow-sm transition-colors ${
                        isLatest ? 'text-white ring-2 ring-white/50' : 'text-white/80 hover:brightness-110'
                      }`}
                      style={{ backgroundColor: bgColor }}
                    >
                      {w}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
