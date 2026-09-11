import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Video,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Sparkles,
  Layers,
  Key,
  Folder,
  FileText,
  Sliders,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ApiLectureParams } from '../types/player';
import { getPlaybackPosition } from '../services/playbackPersistence';
import { formatTime } from '../utils/formatTime';

interface PresetLecture extends ApiLectureParams {
  id: string;
  description: string;
  topic: string;
  title: string;
}

interface HomeScreenProps {
  onPlay: (params: ApiLectureParams & { title?: string }, endpoint: string) => void;
  initialParams: ApiLectureParams & { title?: string };
  initialEndpoint: string;
  presets: PresetLecture[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlay,
  initialParams,
  initialEndpoint,
  presets,
}) => {
  const [batchId, setBatchId] = useState(initialParams.batchId);
  const [subjectId, setSubjectId] = useState(initialParams.subjectId);
  const [lectureId, setLectureId] = useState(initialParams.lectureId);
  const [key, setKey] = useState(initialParams.key);
  const [title, setTitle] = useState(initialParams.title || '');
  const [endpoint, setEndpoint] = useState(initialEndpoint);

  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleSelectPreset = (preset: PresetLecture, autoPlay = false) => {
    setBatchId(preset.batchId);
    setSubjectId(preset.subjectId);
    setLectureId(preset.lectureId);
    setKey(preset.key);
    setTitle(preset.title);
    setErrorMessage(null);

    if (autoPlay) {
      onPlay(
        {
          batchId: preset.batchId,
          subjectId: preset.subjectId,
          lectureId: preset.lectureId,
          key: preset.key,
          title: preset.title,
        },
        endpoint.trim()
      );
    }
  };

  const handleReset = () => {
    if (presets.length > 0) {
      handleSelectPreset(presets[0]);
    } else {
      setBatchId('');
      setSubjectId('');
      setLectureId('');
      setKey('');
      setTitle('');
    }
    setEndpoint(initialEndpoint);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBatch = batchId.trim();
    const cleanSubject = subjectId.trim();
    const cleanLecture = lectureId.trim();
    const cleanKey = key.trim();

    if (!cleanBatch || !cleanSubject || !cleanLecture || !cleanKey) {
      setErrorMessage('Please fill in Batch ID, Subject ID, Lecture ID, and Decryption Key.');
      return;
    }

    setErrorMessage(null);
    onPlay(
      {
        batchId: cleanBatch,
        subjectId: cleanSubject,
        lectureId: cleanLecture,
        key: cleanKey,
        title: title.trim() || `Lecture: ${cleanLecture.slice(0, 8)}...`,
      },
      endpoint.trim()
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-amber-500/30 selection:text-amber-200 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 shadow-md">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                <span>Lecture Stream Player</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  MPEG-DASH
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              id="home-open-newtab-btn"
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              target="_blank"
              rel="noopener noreferrer"
              title="Open player in new browser tab for full DRM support"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-xs font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>New Tab</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
        {/* Hero Section */}
        <section className="text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
              <span>Stream Configuration</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                Full Screen
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Enter your Batch ID, Subject ID, Lecture ID and Decryption Key to open and stream the authorized lecture in full screen.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-xl">
            <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
            <span>Gesture Seek (+/-10s) Enabled</span>
          </div>
        </section>

        {/* Input Form Card */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-xl backdrop-blur-sm flex flex-col gap-4"
        >
          {errorMessage && (
            <div
              id="home-form-error"
              className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between"
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-200 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batch ID */}
            <div className="space-y-1.5">
              <label htmlFor="input-batch-id" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Batch ID</span>
                <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-batch-id"
                  type="text"
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="e.g. 698ad3519549b300a5e1cc6a"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all pr-9"
                />
                {batchId && (
                  <button
                    type="button"
                    onClick={() => handleCopy(batchId, 'batchId')}
                    title="Copy Batch ID"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    {copiedField === 'batchId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Subject ID */}
            <div className="space-y-1.5">
              <label htmlFor="input-subject-id" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Subject ID</span>
                <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-subject-id"
                  type="text"
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  placeholder="e.g. hehe"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all pr-9"
                />
                {subjectId && (
                  <button
                    type="button"
                    onClick={() => handleCopy(subjectId, 'subjectId')}
                    title="Copy Subject ID"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    {copiedField === 'subjectId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Lecture ID */}
            <div className="space-y-1.5">
              <label htmlFor="input-lecture-id" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Lecture ID</span>
                <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-lecture-id"
                  type="text"
                  required
                  value={lectureId}
                  onChange={(e) => setLectureId(e.target.value)}
                  placeholder="e.g. 6a7ecfc310002885ba91700c"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all pr-9"
                />
                {lectureId && (
                  <button
                    type="button"
                    onClick={() => handleCopy(lectureId, 'lectureId')}
                    title="Copy Lecture ID"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    {copiedField === 'lectureId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Decryption Key */}
            <div className="space-y-1.5">
              <label htmlFor="input-key" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Decryption Key</span>
                <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-key"
                  type={showKey ? 'text' : 'password'}
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Optional Title */}
          <div className="space-y-1.5">
            <label htmlFor="input-title" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>Lecture Name (Optional)</span>
            </label>
            <input
              id="input-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lecture 1: Core Fundamentals & Concept Breakdown"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>

          {/* Advanced Collapsible Settings */}
          <div className="border-t border-zinc-800/80 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-medium text-zinc-400 hover:text-zinc-200 py-1"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                <span>Advanced Endpoint Configuration</span>
              </span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <label htmlFor="input-endpoint" className="text-[11px] font-semibold text-zinc-400 block">
                  Backend API Endpoint URL
                </label>
                <input
                  id="input-endpoint"
                  type="url"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://examcrushers.in/api/play"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEndpoint(initialEndpoint)}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Reset to default endpoint
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              id="home-play-fullscreen-btn"
              type="submit"
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>PLAY IN FULL SCREEN</span>
            </button>

            <button
              id="home-reset-form-btn"
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-700/60 transition-colors"
              title="Reset fields to default sample"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </form>

        {/* Preset Lectures Selection */}
        {presets && presets.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Preset Lectures</span>
              </h3>
              <span className="text-[11px] text-zinc-500">Tap to load or play</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const isSelected = preset.lectureId === lectureId;
                const savedPos = getPlaybackPosition(preset.lectureId);

                return (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                        : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300 border border-zinc-700/60">
                          {preset.topic}
                        </span>
                        {savedPos && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Resumes at {formatTime(savedPos.currentTime)}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-100 line-clamp-1 mt-1">
                        {preset.title}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
                      <button
                        type="button"
                        onClick={() => handleSelectPreset(preset, false)}
                        className="text-xs font-medium text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        Load IDs
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset(preset, true)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Now</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Feature Highlights */}
        <section className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-xs text-zinc-400 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">Full Screen Immersion</span>
            <p className="text-[11px] leading-relaxed">
              Launches into complete full viewport playback with responsive touch controls and custom seek gestures.
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">W3C ClearKey DRM</span>
            <p className="text-[11px] leading-relaxed">
              Negotiates encrypted media extensions seamlessly with MPEG-DASH manifest stream adapters.
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">Isolated Memory</span>
            <p className="text-[11px] leading-relaxed">
              Decryption keys are handled strictly in-memory and never exposed in DOM or console logs.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
