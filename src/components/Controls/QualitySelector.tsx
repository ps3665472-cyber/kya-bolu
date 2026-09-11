import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { VideoQuality } from '../../types/player';

interface QualitySelectorProps {
  qualities: VideoQuality[];
  currentQualityId: number | 'auto';
  activeQualityLabel?: string;
  onSelectQuality: (qualityId: number | 'auto') => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  qualities,
  currentQualityId,
  activeQualityLabel,
  onSelectQuality,
}) => {
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

  if (!qualities || qualities.length === 0) {
    return null;
  }

  // Display label on button
  let displayLabel = 'Auto';
  if (currentQualityId !== 'auto') {
    const found = qualities.find((q) => q.id === currentQualityId);
    if (found) displayLabel = found.label;
  } else if (activeQualityLabel) {
    displayLabel = `Auto (${activeQualityLabel})`;
  }

  return (
    <div id="video-quality-selector" ref={menuRef} className="relative">
      <button
        id="video-quality-menu-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white rounded-md hover:bg-white/10 transition-colors focus:outline-none"
        title="Video Quality"
        aria-label="Video Quality"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
        <span className="truncate max-w-[80px]">{displayLabel}</span>
      </button>

      {isOpen && (
        <div
          id="video-quality-dropdown"
          className="absolute bottom-full right-0 mb-2 w-36 py-1.5 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-2xl z-40 text-xs flex flex-col max-h-60 overflow-y-auto"
        >
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-white/5">
            Quality
          </div>
          {/* Auto (ABR) option */}
          <button
            type="button"
            onClick={() => {
              onSelectQuality('auto');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 transition-colors ${
              currentQualityId === 'auto' ? 'text-amber-400 font-bold' : 'text-zinc-200'
            }`}
          >
            <span>Auto {activeQualityLabel ? `(${activeQualityLabel})` : ''}</span>
            {currentQualityId === 'auto' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>

          {/* Explicit bitrates / resolutions */}
          {qualities.map((q) => {
            const isSelected = currentQualityId === q.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  onSelectQuality(q.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 transition-colors ${
                  isSelected ? 'text-amber-400 font-bold' : 'text-zinc-200'
                }`}
              >
                <span>{q.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
