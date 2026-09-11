import React, { useRef, useState, useCallback, useEffect } from 'react';
import { formatTime } from '../../utils/formatTime';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

export const SeekBar: React.FC<SeekBarProps> = ({
  currentTime,
  duration,
  buffered,
  onSeek,
  onScrubStart,
  onScrubEnd,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; time: number; visible: boolean }>({
    x: 0,
    time: 0,
    visible: false,
  });
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const calculateTimeFromEvent = useCallback(
    (clientX: number): number => {
      if (!barRef.current || duration <= 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const clampedX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = clampedX / rect.width;
      return percentage * duration;
    },
    [duration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    onScrubStart?.();
    const time = calculateTimeFromEvent(e.clientX);
    setScrubTime(time);
    onSeek(time);

    // Capture pointer to ensure smooth drag even if finger/mouse leaves element
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current || duration <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clampedX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const time = (clampedX / rect.width) * duration;

    setHoverPosition({
      x: clampedX,
      time,
      visible: true,
    });

    if (isScrubbing) {
      setScrubTime(time);
      onSeek(time);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      setScrubTime(null);
      onScrubEnd?.();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe catch
      }
    }
  };

  const handlePointerLeave = () => {
    if (!isScrubbing) {
      setHoverPosition((prev) => ({ ...prev, visible: false }));
    }
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const step = 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + step));
    }
  };

  const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const playedPercent = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, Math.max(0, (buffered / duration) * 100)) : 0;

  return (
    <div
      id="video-seek-bar-container"
      ref={barRef}
      role="slider"
      aria-label="Video Seek Bar"
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration)}
      aria-valuenow={Math.floor(displayTime)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="group relative w-full h-7 flex items-center cursor-pointer select-none touch-none outline-none"
    >
      {/* Time tooltip on hover/drag */}
      {hoverPosition.visible && duration > 0 && (
        <div
          className="pointer-events-none absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900/90 backdrop-blur-md text-white text-xs font-mono font-medium shadow-md border border-white/10 z-30 transition-opacity"
          style={{ left: `${hoverPosition.x}px` }}
        >
          {formatTime(hoverPosition.time)}
        </div>
      )}

      {/* Track Base */}
      <div className="relative w-full h-1.5 group-hover:h-2.5 transition-all duration-150 rounded-full bg-white/20 overflow-hidden">
        {/* Buffer Bar */}
        <div
          className="absolute top-0 left-0 h-full bg-white/35 rounded-full transition-all duration-200"
          style={{ width: `${bufferedPercent}%` }}
        />

        {/* Played Bar */}
        <div
          className="absolute top-0 left-0 h-full bg-amber-500 rounded-full"
          style={{ width: `${playedPercent}%` }}
        />
      </div>

      {/* Scrubber Thumb */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-amber-500 transition-transform ${
          isScrubbing ? 'scale-125' : 'group-hover:scale-110 scale-0'
        }`}
        style={{ left: `${playedPercent}%` }}
      />
    </div>
  );
};
