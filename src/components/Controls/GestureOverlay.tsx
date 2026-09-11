import React from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

export interface GestureFeedbackState {
  side: 'left' | 'right' | null;
  count: number;
}

interface GestureOverlayProps {
  feedback: GestureFeedbackState;
}

export const GestureOverlay: React.FC<GestureOverlayProps> = ({ feedback }) => {
  if (!feedback.side) return null;

  return (
    <div
      id="video-gesture-overlay"
      className="pointer-events-none absolute inset-0 z-25 flex items-center justify-between px-8 select-none"
    >
      {/* Left side feedback */}
      <div
        className={`flex flex-col items-center justify-center w-28 h-28 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white transition-all duration-300 ${
          feedback.side === 'left' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <RotateCcw className="w-8 h-8 mb-1 animate-spin-reverse" />
        <span className="text-xs font-semibold tracking-wide">-10s</span>
      </div>

      <div className="flex-1" />

      {/* Right side feedback */}
      <div
        className={`flex flex-col items-center justify-center w-28 h-28 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white transition-all duration-300 ${
          feedback.side === 'right' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <RotateCw className="w-8 h-8 mb-1 animate-spin-forward" />
        <span className="text-xs font-semibold tracking-wide">+10s</span>
      </div>
    </div>
  );
};
