import React, { useState } from 'react';
import { Settings, Eye, EyeOff, RotateCcw, ShieldCheck, HelpCircle } from 'lucide-react';
import { ApiLectureParams } from '../types/player';
import { clearPlaybackCache } from '../services/playbackApi';

interface ApiConfigPanelProps {
  endpointUrl: string;
  onUpdateEndpoint: (url: string) => void;
  activeParams: ApiLectureParams;
  onUpdateParams: (params: ApiLectureParams) => void;
  onResetToDefault: () => void;
}

export const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({
  endpointUrl,
  onUpdateEndpoint,
  activeParams,
  onUpdateParams,
  onResetToDefault,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Form local state
  const [formData, setFormData] = useState({
    endpoint: endpointUrl,
    batchId: activeParams.batchId,
    subjectId: activeParams.subjectId,
    lectureId: activeParams.lectureId,
    key: activeParams.key,
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    clearPlaybackCache();
    onUpdateEndpoint(formData.endpoint.trim());
    onUpdateParams({
      ...activeParams,
      batchId: formData.batchId.trim(),
      subjectId: formData.subjectId.trim(),
      lectureId: formData.lectureId.trim(),
      key: formData.key.trim(),
    });
    setIsOpen(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-4 px-3 sm:px-0">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-300">Backend Stream Service</span>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">•</span>
          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline truncate max-w-xs">
            {endpointUrl}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/80 transition-colors"
            title="Keyboard shortcuts & gestures"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure Endpoint</span>
          </button>
        </div>
      </div>

      {/* Shortcuts Guide Dropdown */}
      {showShortcuts && (
        <div className="mt-3 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Player Controls & Gestures
            </h4>
            <button
              type="button"
              onClick={() => setShowShortcuts(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-300">Space / K</span>
              <span className="text-zinc-500">Play / Pause toggle</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-300">Left / Right Arrows</span>
              <span className="text-zinc-500">Seek -5s / +5s</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-300">J / L</span>
              <span className="text-zinc-500">Rewind / Forward 10s</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-300">Up / Down Arrows</span>
              <span className="text-zinc-500">Volume +/- 5%</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-300">M</span>
              <span className="text-zinc-500">Mute / Unmute</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-300">F</span>
              <span className="text-zinc-500">Fullscreen toggle</span>
            </div>
            <div className="flex flex-col gap-1 col-span-2 sm:col-span-3 pt-2 border-t border-zinc-800/60 text-amber-400/90">
              <span className="font-semibold">Mobile Gestures:</span>
              <span className="text-zinc-400">
                Double tap on the left side to rewind 10s. Double tap on the right side to fast-forward 10s. Single tap to show/hide controls.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Backend Endpoint Configuration Form */}
      {isOpen && (
        <form
          onSubmit={handleApply}
          className="mt-3 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Authorized Backend API Configuration
              </h3>
            </div>
            <button
              type="button"
              onClick={onResetToDefault}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Configure your authorized backend endpoint and query parameters. Responses are validated and handled entirely in memory; credentials and signed tokens are kept protected.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                API Base URL
              </label>
              <input
                type="url"
                required
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                placeholder="https://examcrushers.in/api/play"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Batch ID (<code className="text-zinc-400">batchId</code>)
                </label>
                <input
                  type="text"
                  required
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Subject ID (<code className="text-zinc-400">subjectId</code>)
                </label>
                <input
                  type="text"
                  required
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Lecture ID (<code className="text-zinc-400">lectureId</code>)
                </label>
                <input
                  type="text"
                  required
                  value={formData.lectureId}
                  onChange={(e) => setFormData({ ...formData, lectureId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Auth Key (<code className="text-zinc-400">key</code>)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    className="w-full px-3 py-2 pr-9 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-md active:scale-95 transition-all"
            >
              Apply & Reload Stream
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
