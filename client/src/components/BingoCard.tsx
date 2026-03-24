import { useEffect, useRef } from 'react';
import { BingoCard as BingoCardType } from '../types';

interface Props {
  card: BingoCardType;
  calledWords: string[];
  onBingo: () => void;
  hasBingo: boolean;
}

function checkBingo(marked: boolean[][]): boolean {
  // Rows
  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) return true;
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    if (marked.every(row => row[c])) return true;
  }
  // Diagonals
  if ([0,1,2,3,4].every(i => marked[i][i])) return true;
  if ([0,1,2,3,4].every(i => marked[i][4 - i])) return true;
  return false;
}

export default function BingoCard({ card, calledWords, onBingo, hasBingo }: Props) {
  const prevBingoRef = useRef(false);

  const marked: boolean[][] = card.grid.map((row, r) =>
    row.map((word, c) => {
      if (word === 'FREE') return true;
      return card.markedCells[r][c] || calledWords.includes(word);
    })
  );

  const bingo = checkBingo(marked);

  useEffect(() => {
    if (bingo && !prevBingoRef.current) {
      onBingo();
    }
    prevBingoRef.current = bingo;
  }, [bingo, onBingo]);

  const headers = ['B', 'I', 'N', 'G', 'O'];

  return (
    <div className={`w-full max-w-sm mx-auto ${hasBingo ? 'bingo-celebrate' : ''}`}>
      {/* Header row */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        {headers.map(h => (
          <div
            key={h}
            className="flex items-center justify-center h-10 rounded-md font-bold text-xl text-white bg-raya-green shadow"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-5 gap-1">
        {card.grid.map((row, r) =>
          row.map((word, c) => {
            const isMarked = marked[r][c];
            const isFree = word === 'FREE';
            return (
              <div
                key={`${r}-${c}`}
                className={`
                  relative flex items-center justify-center rounded-md text-center
                  text-xs font-semibold leading-tight p-1 min-h-[3.5rem] select-none
                  transition-all duration-300
                  ${isFree
                    ? 'bg-raya-gold text-white shadow-inner'
                    : isMarked
                    ? 'bg-raya-green text-white shadow-md cell-marked scale-[0.97]'
                    : 'bg-white text-raya-dark border border-raya-green/30 shadow-sm'
                  }
                `}
              >
                <span className="break-words hyphens-auto">{word}</span>
                {isMarked && !isFree && (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl opacity-30">
                    ✓
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
