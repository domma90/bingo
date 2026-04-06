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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(320);
  const [rotation, setRotation] = useState(0);
  const animFrameRef = useRef<number>(0);

  // Always-current refs — avoids stale closures in the animation callback
  const wheelWordsRef = useRef<string[]>([]);
  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;

  // Fill container responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = Math.floor(entries[0].contentRect.width);
      if (w > 0) setSize(w);
    });
    ro.observe(el);
    const w = Math.floor(el.getBoundingClientRect().width);
    if (w > 0) setSize(w);
    return () => ro.disconnect();
  }, []);

  // Keep currentWord on the wheel during spin even if calledWords was already
  // updated to include it (belt-and-suspenders alongside the AdminView delay fix)
  const available = words.filter(w => !calledWords.includes(w) || w === currentWord);
  const wheelWords = available.length > 0 ? available : words;
  wheelWordsRef.current = wheelWords; // always fresh for animation callback

  const count = wheelWords.length;
  const sliceAngle = (2 * Math.PI) / Math.max(count, 1);
  const s = size / 320;

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || count === 0 || size === 0) return;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4 * s;

    ctx.clearRect(0, 0, size, size);

    wheelWords.forEach((word, i) => {
      const start = rotation + i * sliceAngle - Math.PI / 2;
      const end = start + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#fdf6e3';
      ctx.lineWidth = 2 * s;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      const fontSize = Math.max(10, Math.min(28 * s, (400 * s) / count));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;
      const label = word.length > 14 ? word.slice(0, 14) + '…' : word;
      ctx.fillText(label, radius - 10 * s, 5 * s);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 22 * s, 0, 2 * Math.PI);
    ctx.fillStyle = '#fdf6e3';
    ctx.fill();
    ctx.strokeStyle = '#1a6b3c';
    ctx.lineWidth = 3 * s;
    ctx.stroke();

    // Sleek golden rim-peg pointer
    const pWidth = 14 * s;
    const pHeight = 12 * s;
    ctx.beginPath();
    ctx.moveTo(cx - pWidth / 2, 0); // Start at very top edge
    ctx.lineTo(cx + pWidth / 2, 0);
    ctx.lineTo(cx, pHeight); // Point down just to the rim edge
    ctx.closePath();
    ctx.fillStyle = '#c9960c'; // Match the raya-gold theme
    ctx.fill();
    ctx.strokeStyle = '#fdf6e3'; // White/cream stroke to make it pop
    ctx.lineWidth = 2 * s;
    ctx.stroke();
  }, [rotation, size, words, calledWords, currentWord]);

  // Spin animation
  useEffect(() => {
    if (!isSpinning || !currentWord) return;

    // Use the ref so we always read the freshest wheelWords,
    // even if a render happened between effect setup and frame execution.
    const ww = wheelWordsRef.current;
    const n = ww.length;
    const sa = (2 * Math.PI) / Math.max(n, 1);
    const wordIdx = ww.indexOf(currentWord);

    if (wordIdx === -1) {
      // Word not found — just complete without animating
      onSpinCompleteRef.current?.();
      return;
    }

    // Target rotation: slice `wordIdx` center sits at the pointer (top = -π/2)
    // rotation_final ≡ -((wordIdx + 0.5) * sa)  (mod 2π)
    const targetBase = -((wordIdx + 0.5) * sa);
    const targetNorm = ((targetBase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const currentNorm = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Forward delta to reach target (always in [0, 2π))
    const delta = (targetNorm - currentNorm + 2 * Math.PI) % (2 * Math.PI);

    // Extra full rotations for drama — MUST be integer multiples of 2π
    // so the fractional part doesn't offset the landing position.
    const extraSpins = (4 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
    const finalRotation = rotation + extraSpins + delta;
    const duration = 3000 + Math.random() * 800;

    let startTime: number | null = null;
    const startRot = rotation;

    function easeOut(t: number) { return 1 - Math.pow(1 - t, 4); }

    function frame(ts: number) {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setRotation(startRot + (finalRotation - startRot) * easeOut(progress));
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        // Use the ref so we get the latest callback (never stale)
        onSpinCompleteRef.current?.();
      }
    }

    animFrameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isSpinning, currentWord]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} className="w-full aspect-square">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full rounded-full shadow-2xl border-4 border-raya-gold"
      />
    </div>
  );
}
