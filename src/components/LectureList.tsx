import React from 'react';
import { PlayCircle, Clock, BookOpen, Check } from 'lucide-react';
import { ApiLectureParams } from '../types/player';
import { DEFAULT_LECTURES } from '../data/lectures';
import { getPlaybackPosition } from '../services/playbackPersistence';
import { formatTime } from '../utils/formatTime';

interface LectureListProps {
  currentLectureId: string;
  onSelectLecture: (lecture: ApiLectureParams & { title?: string }) => void;
}

export const LectureList: React.FC<LectureListProps> = ({ currentLectureId, onSelectLecture }) => {
  return (
    <div className="w-full max-w-5xl mx-auto mt-6 px-3 sm:px-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-zinc-100">Lectures & Course Content</h3>
        </div>
        <span className="text-xs text-zinc-500">
          Switch lectures to verify teardown & position recovery
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DEFAULT_LECTURES.map((lecture, idx) => {
          const isSelected = currentLectureId === lecture.lectureId;
          const savedPos = getPlaybackPosition(lecture.lectureId);

          return (
            <div
              key={lecture.id}
              onClick={() => onSelectLecture(lecture)}
              className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'bg-zinc-900/90 border-amber-500/50 shadow-lg shadow-amber-500/5'
                  : 'bg-zinc-900/40 hover:bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-2.5 rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 shadow-md'
                        : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-700'
                    }`}
                  >
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500/90">
                        {lecture.topic}
                      </span>
                      {savedPos && savedPos.currentTime > 5 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          Resume @ {formatTime(savedPos.currentTime)}
                        </span>
                      )}
                    </div>
                    <h4
                      className={`text-xs font-semibold leading-snug line-clamp-1 ${
                        isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                      }`}
                    >
                      {lecture.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {lecture.description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <span className="shrink-0 p-1 rounded-full bg-amber-500/20 text-amber-400">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
