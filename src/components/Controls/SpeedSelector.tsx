import React, { useState, useRef, useEffect } from 'react';
import { Gauge } from 'lucide-react';

interface SpeedSelectorProps {
  currentRate: number;
  onRateChange: (rate: number) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const SpeedSelector: React.FC<SpeedSelectorProps> = ({ currentRate, onRateChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div id="video-speed-selector" ref={menuRef} className="relative">
      <button
        id="video-speed-menu-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white rounded-md hover:bg-white/10 transition-colors focus:outline-none"
        title="Playback Speed"
        aria-label="Playback Speed"
        aria-expanded={isOpen}
      >
        <Gauge className="w-4 h-4" />
        <span>{currentRate === 1 ? '1x' : `${currentRate}x`}</span>
      </button>

      {isOpen && (
        <div
          id="video-speed-dropdown"
          className="absolute bottom-full right-0 mb-2 w-32 py-1.5 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-2xl z-40 text-xs flex flex-col"
        >
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-white/5">
            Speed
          </div>
          {SPEEDS.map((speed) => {
            const isSelected = currentRate === speed;
            return (
              <button
                key={speed}
                type="button"
                onClick={() => {
                  onRateChange(speed);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 transition-colors ${
                  isSelected ? 'text-amber-400 font-bold' : 'text-zinc-200'
                }`}
              >
                <span>{speed === 1 ? 'Normal (1x)' : `${speed}x`}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
