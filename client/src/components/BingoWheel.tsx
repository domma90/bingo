import { useEffect, useRef, useState } from 'react';

interface Props {
  words: string[];
  calledWords: string[];
  currentWord: string | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
}

const COLORS = [
  '#1a6b3c', '#c9960c', '#2d8a52', '#e8b422', '#0d3d22',
  '#f0c842', '#155e33', '#d4a017', '#1e7a42', '#b8860b',
];

export default function BingoWheel({ words, calledWords, currentWord, isSpinning, onSpinComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [displayWord, setDisplayWord] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const spinStartRef = useRef<number | null>(null);
  const targetRotRef = useRef<number>(0);
  const spinDurationRef = useRef<number>(3000);

  const available = words.filter(w => !calledWords.includes(w));
  const wheelWords = available.length > 0 ? available : words;
  const count = wheelWords.length;
  const sliceAngle = (2 * Math.PI) / Math.max(count, 1);

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || count === 0) return;
    const ctx = canvas.getContext('2d')!;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;

    ctx.clearRect(0, 0, size, size);

    wheelWords.forEach((word, i) => {
      const start = rotation + i * sliceAngle - Math.PI / 2;
      const end = start + sliceAngle;

      // Slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fdf6e3';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(8, Math.min(13, 220 / count))}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 3;
      // Truncate long words
      const maxLen = 14;
      const label = word.length > maxLen ? word.slice(0, maxLen) + '…' : word;
      ctx.fillText(label, radius - 10, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#fdf6e3';
    ctx.fill();
    ctx.strokeStyle = '#1a6b3c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer (triangle at top)
    const pSize = 18;
    ctx.beginPath();
    ctx.moveTo(cx - pSize / 2, 2);
    ctx.lineTo(cx + pSize / 2, 2);
    ctx.lineTo(cx, pSize + 6);
    ctx.closePath();
    ctx.fillStyle = '#c9960c';
    ctx.fill();
  }, [rotation, wheelWords, sliceAngle, count]);

  // Animate spin
  useEffect(() => {
    if (!isSpinning || !currentWord) return;

    const wordIdx = wheelWords.indexOf(currentWord);
    const targetAngle = wordIdx >= 0
      ? -(wordIdx * sliceAngle + sliceAngle / 2) // align word to top
      : 0;

    const extraSpins = (5 + Math.random() * 5) * 2 * Math.PI;
    const normalizedCurrent = rotation % (2 * Math.PI);
    targetRotRef.current = rotation + extraSpins + (targetAngle - normalizedCurrent + 4 * Math.PI) % (2 * Math.PI);
    spinDurationRef.current = 3000 + Math.random() * 1000;
    spinStartRef.current = null;

    const startRot = rotation;

    function easeOut(t: number): number {
      return 1 - Math.pow(1 - t, 4);
    }

    function frame(ts: number) {
      if (spinStartRef.current === null) spinStartRef.current = ts;
      const elapsed = ts - spinStartRef.current;
      const progress = Math.min(elapsed / spinDurationRef.current, 1);
      const eased = easeOut(progress);
      const newRot = startRot + (targetRotRef.current - startRot) * eased;
      setRotation(newRot);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        setDisplayWord(currentWord);
        onSpinComplete?.();
      }
    }

    animFrameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isSpinning, currentWord]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSpinning) setDisplayWord(currentWord);
  }, [currentWord, isSpinning]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="rounded-full shadow-2xl border-4 border-raya-gold"
        />
      </div>

      {/* Current word display */}
      <div className="w-full max-w-xs">
        <div className={`
          text-center rounded-xl px-6 py-4 shadow-lg border-2 border-raya-gold min-h-[72px]
          flex items-center justify-center
          ${displayWord ? 'bg-raya-green text-white' : 'bg-white text-raya-dark/40'}
        `}>
          {displayWord
            ? <span className="text-2xl font-bold">{displayWord}</span>
            : <span className="text-lg">Spin the wheel!</span>
          }
        </div>
      </div>

      <div className="text-sm text-raya-dark/60">
        {available.length} words remaining · {calledWords.length} called
      </div>
    </div>
  );
}
