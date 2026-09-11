import React from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

interface CenterPlayOverlayProps {
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  showIconFeedback: 'play' | 'pause' | null;
  onTogglePlay: () => void;
}

export const CenterPlayOverlay: React.FC<CenterPlayOverlayProps> = ({
  isPlaying,
  isLoading,
  isBuffering,
  showIconFeedback,
  onTogglePlay,
}) => {
  if (isLoading || isBuffering) {
    return (
      <div
        id="video-buffering-indicator"
        className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20"
      >
        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-zinc-950/70 backdrop-blur-md border border-white/10 shadow-xl">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <span className="text-xs font-medium text-zinc-300 tracking-wide">
            {isLoading ? 'Authorizing & Loading Stream...' : 'Buffering...'}
          </span>
        </div>
      </div>
    );
  }

  // Quick feedback icon animation when toggling play/pause
  if (showIconFeedback) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div className="p-5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white animate-ping-once shadow-2xl">
          {showIconFeedback === 'play' ? (
            <Play className="w-10 h-10 fill-white" />
          ) : (
            <Pause className="w-10 h-10 fill-white" />
          )}
        </div>
      </div>
    );
  }

  // Center big play button when paused and controls are visible
  if (!isPlaying) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <button
          id="video-center-play-btn"
          type="button"
          onClick={onTogglePlay}
          className="p-5 rounded-full bg-amber-500/90 hover:bg-amber-500 hover:scale-110 active:scale-95 text-zinc-950 transition-all duration-200 shadow-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/40"
          aria-label="Play video"
        >
          <Play className="w-9 h-9 fill-current translate-x-0.5" />
        </button>
      </div>
    );
  }

  return null;
};
