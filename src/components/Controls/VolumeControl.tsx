import React, { useState } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  volume: number; // 0 to 1
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) => {
  const [showSlider, setShowSlider] = useState(false);

  const effectiveVolume = isMuted ? 0 : volume;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onVolumeChange(val);
    if (val > 0 && isMuted) {
      onToggleMute();
    }
  };

  return (
    <div
      id="video-volume-control"
      className="relative flex items-center"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        id="video-volume-toggle-btn"
        type="button"
        onClick={onToggleMute}
        className="p-1.5 text-zinc-200 hover:text-white transition-colors rounded-lg hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="w-5 h-5 text-red-400" />
        ) : volume < 0.5 ? (
          <Volume1 className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      {/* Volume slider container: expands on hover or focus */}
      <div
        className={`flex items-center transition-all duration-200 overflow-hidden ${
          showSlider ? 'w-20 md:w-24 opacity-100 ml-1.5' : 'w-0 opacity-0'
        }`}
      >
        <input
          id="video-volume-slider"
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={effectiveVolume}
          onChange={handleSliderChange}
          aria-label="Volume slider"
          className="w-full h-1.5 rounded-lg appearance-none bg-white/20 accent-amber-500 cursor-pointer focus:outline-none"
        />
      </div>
    </div>
  );
};
