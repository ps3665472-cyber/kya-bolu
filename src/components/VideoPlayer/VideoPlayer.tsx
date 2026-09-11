import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  AlertCircle,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  Lock,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import * as dashjs from 'dashjs';

import { ApiLectureParams, VideoQuality } from '../../types/player';
import {
  fetchPlaybackData,
  ValidatedPlaybackData,
  PlaybackApiError,
  clearPlaybackCache,
} from '../../services/playbackApi';
import {
  savePlaybackPosition,
  getPlaybackPosition,
  clearPlaybackPosition,
  getSavedSettings,
  saveSettings,
} from '../../services/playbackPersistence';
import { formatTime } from '../../utils/formatTime';

import { SeekBar } from '../Controls/SeekBar';
import { VolumeControl } from '../Controls/VolumeControl';
import { SpeedSelector } from '../Controls/SpeedSelector';
import { QualitySelector } from '../Controls/QualitySelector';
import { GestureOverlay, GestureFeedbackState } from '../Controls/GestureOverlay';
import { CenterPlayOverlay } from '../Controls/CenterPlayOverlay';

// Base64URL converter without padding (strictly required by W3C ClearKey EME specification)
function toBase64Url(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // If already a valid 22-character base64url string without padding
  if (/^[A-Za-z0-9_-]{22}$/.test(trimmed)) {
    return trimmed;
  }
  // If 32-character hexadecimal key (with or without hyphens)
  const cleanHex = trimmed.replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length === 32) {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
    }
    let binary = '';
    for (let i = 0; i < 16; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  // If standard base64 string
  try {
    const standardB64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(standardB64);
    if (binary.length === 16) {
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  } catch {
    // fallback
  }
  return trimmed;
}

interface VideoPlayerProps {
  params: ApiLectureParams;
  endpointBaseUrl?: string;
  lectureTitle?: string;
  onLectureComplete?: () => void;
  onNextLecture?: () => void;
  hasNextLecture?: boolean;
  onBack?: () => void;
  isFullScreenMode?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  params,
  endpointBaseUrl,
  lectureTitle,
  onLectureComplete,
  onNextLecture,
  hasNextLecture,
  onBack,
  isFullScreenMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dashPlayerRef = useRef<dashjs.MediaPlayerClass | null>(null);

  // Persistence & Settings
  const initialSettings = getSavedSettings();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(initialSettings.volume);
  const [isMuted, setIsMuted] = useState(initialSettings.muted);
  const [playbackRate, setPlaybackRate] = useState(initialSettings.playbackRate);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Quality options
  const [qualities, setQualities] = useState<VideoQuality[]>([]);
  const [currentQualityId, setCurrentQualityId] = useState<number | 'auto'>('auto');
  const [activeQualityLabel, setActiveQualityLabel] = useState<string>('');

  // UI / Overlay States
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [errorState, setErrorState] = useState<{ message: string; code?: string; canOpenInNewTab?: boolean } | null>(null);

  // Visual gesture & center feedback
  const [gestureFeedback, setGestureFeedback] = useState<GestureFeedbackState>({ side: null, count: 0 });
  const [iconFeedback, setIconFeedback] = useState<'play' | 'pause' | null>(null);
  const [resumeNotice, setResumeNotice] = useState<{ time: number; visible: boolean } | null>(null);

  // Timers & tracking refs
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | 'center' } | null>(null);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const resumeSeekAttemptedRef = useRef(false);

  // Reset controls hide timer
  const resetControlsTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Only auto-hide if playing
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3500);
    }
  }, [isPlaying]);

  // Keep controls visible when paused
  useEffect(() => {
    if (!isPlaying) {
      setIsControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      resetControlsTimer();
    }
  }, [isPlaying, resetControlsTimer]);

  // Network offline / online handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto retry if in error state
      if (errorState) {
        handleRetry();
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [errorState]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      setIsFullscreen(Boolean(fsElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Main stream initialization and lecture teardown
  const initializePlayback = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setErrorState(null);
    setIsBuffering(false);
    setQualities([]);
    resumeSeekAttemptedRef.current = false;

    // Destroy existing dash player if any
    if (dashPlayerRef.current) {
      try {
        dashPlayerRef.current.reset();
      } catch {
        // Safe catch
      }
      dashPlayerRef.current = null;
    }

    // Reset video element and cleanly detach any existing MediaKeys
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if ('setMediaKeys' in video && typeof (video as any).setMediaKeys === 'function') {
          await (video as any).setMediaKeys(null).catch(() => {});
        }
      } catch {
        // Safe catch
      }
    }

    try {
      // 1. Fetch authorized playback information (API -> validate -> stream)
      const data: ValidatedPlaybackData = await fetchPlaybackData(params, endpointBaseUrl, forceRefresh);
      retryCountRef.current = 0;

      if (!video) return;

      // 2. MPEG-DASH Playback Handling
      if (data.isDash && data.dashUrl) {
        const dash = (dashjs as any).MediaPlayer ? dashjs : ((dashjs as any).default || dashjs);
        const player: dashjs.MediaPlayerClass = dash.MediaPlayer().create();
        dashPlayerRef.current = player;

        // Player configuration: suppress internal debug logs to protect sensitive data
        player.updateSettings({
          debug: {
            logLevel: 0,
          },
          streaming: {
            buffer: {
              fastSwitchEnabled: true,
              bufferTimeAtTopQuality: 20,
              bufferTimeAtTopQualityLongForm: 30,
            },
            retryIntervals: {
              MPD: 1000,
              MediaSegment: 1000,
            },
            retryAttempts: {
              MPD: 3,
              MediaSegment: 3,
            },
          },
        });

        // ClearKey DRM configuration if keys exist
        if (data.keys && Object.keys(data.keys).length > 0) {
          const clearkeys: Record<string, string> = {};
          for (const [rawKid, rawKey] of Object.entries(data.keys)) {
            const kidB64Url = toBase64Url(rawKid);
            const keyB64Url = toBase64Url(rawKey);
            if (kidB64Url && keyB64Url) {
              clearkeys[kidB64Url] = keyB64Url;
            }
          }

          player.setProtectionData({
            'org.w3.clearkey': {
              clearkeys,
              initDataTypes: ['cenc', 'keyids'],
            },
          });
        }

        // Resolve manifest URL against current document origin
        const fullDashUrl = data.dashUrl.startsWith('http')
          ? data.dashUrl
          : new URL(data.dashUrl, window.location.href).href;

        // Initialize dash player with video element
        player.initialize(video, fullDashUrl, false);

        // Quality extraction once stream initializes
        player.on((dashjs as any).MediaPlayer.events.STREAM_INITIALIZED, () => {
          try {
            const dur = player.duration();
            if (dur && dur > 0) {
              setDuration(dur);
            }

            const reps = player.getRepresentationsByType('video');
            if (reps && reps.length > 0) {
              const qualityList: VideoQuality[] = reps.map((r, idx) => ({
                id: r.absoluteIndex !== undefined ? r.absoluteIndex : idx,
                label: r.height ? `${r.height}p` : `${Math.round((r.bitrateInKbit || r.bandwidth / 1000) || 0)}kbps`,
                height: r.height,
                width: r.width,
                bitrate: r.bandwidth || (r.bitrateInKbit ? r.bitrateInKbit * 1000 : 0),
              }));

              // Sort highest resolution first
              qualityList.sort((a, b) => (b.height || b.bitrate || 0) - (a.height || a.bitrate || 0));
              setQualities(qualityList);

              const currentRep = player.getCurrentRepresentationForType('video');
              if (currentRep && currentRep.height) {
                setActiveQualityLabel(`${currentRep.height}p`);
              }
            }
          } catch {
            // Non-fatal
          }
          setIsLoading(false);
        });

        // Listen for quality switches
        player.on((dashjs as any).MediaPlayer.events.QUALITY_CHANGE_RENDERED, (e: any) => {
          try {
            if (e.mediaType === 'video') {
              const currentRep = player.getCurrentRepresentationForType('video');
              if (currentRep && currentRep.height) {
                setActiveQualityLabel(`${currentRep.height}p`);
              }
            }
          } catch {
            // Safe catch
          }
        });

        // Error handling inside dash player
        player.on((dashjs as any).MediaPlayer.events.ERROR, (e: any) => {
          console.error('[DashPlayer ERROR Event]', e);
          const errCode = e?.error?.code || e?.code;
          const errMsg = e?.error?.message || e?.message || '';

          // If DRM KeySystem access is denied or MediaKeys failed to create
          if (errCode === 112 || errCode === 113) {
            const isIframe = typeof window !== 'undefined' && window.self !== window.top;
            setErrorState({
              message: isIframe
                ? 'DRM Key System access is restricted inside the embedded preview iframe. Click "Open in New Tab" below to play the video with full browser DRM support.'
                : (errMsg || 'DRM ClearKey access could not be initialized. Please refresh or retry.'),
              code: `DASH_DRM_${errCode}`,
              canOpenInNewTab: true,
            });
            setIsLoading(false);
            setIsBuffering(false);
            return;
          }

          if (retryCountRef.current < 2) {
            retryCountRef.current += 1;
            setTimeout(() => {
              initializePlayback(true);
            }, 1500 * retryCountRef.current);
          } else {
            setErrorState({
              message: errMsg || 'Stream authorization or playback error occurred. Please verify your network and retry.',
              code: errCode ? `DASH_${errCode}` : 'STREAM_ERROR',
              canOpenInNewTab: typeof window !== 'undefined' && window.self !== window.top,
            });
            setIsLoading(false);
            setIsBuffering(false);
          }
        });
      } else if (data.url) {
        // Standard HTML5 video playback fallback
        video.src = data.url;
        video.load();
      } else {
        throw new PlaybackApiError('No compatible media stream found for this video.', 'UNSUPPORTED_FORMAT');
      }

      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      setIsBuffering(false);
      const message =
        err instanceof PlaybackApiError
          ? err.message
          : 'Unable to start playback. Please verify media authorization and network status.';
      setErrorState({
        message,
        code: (err as any)?.code || 'PLAYBACK_FAIL',
      });
    }
  }, [params, endpointBaseUrl]);

  // Trigger initialization when params or endpoint changes
  useEffect(() => {
    initializePlayback();

    // Clean teardown on unmount or lecture change
    return () => {
      if (dashPlayerRef.current) {
        try {
          dashPlayerRef.current.reset();
          dashPlayerRef.current.destroy();
        } catch {
          // Safe catch
        }
        dashPlayerRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
  }, [initializePlayback]);

  // Video Element Native Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Apply stored volume & rate
    video.volume = isMuted ? 0 : volume;
    video.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);

      // Auto resume from last saved position
      if (!resumeSeekAttemptedRef.current) {
        resumeSeekAttemptedRef.current = true;
        const saved = getPlaybackPosition(params.lectureId);
        if (saved && saved.currentTime > 5 && video.duration && saved.currentTime < video.duration - 8) {
          video.currentTime = saved.currentTime;
          setCurrentTime(saved.currentTime);
          setResumeNotice({
            time: saved.currentTime,
            visible: true,
          });
          // Auto hide resume toast after 5s
          setTimeout(() => {
            setResumeNotice((prev) => (prev ? { ...prev, visible: false } : null));
          }, 5000);
        }
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Update buffer progress
      if (video.buffered.length > 0) {
        for (let i = video.buffered.length - 1; i >= 0; i--) {
          if (video.buffered.start(i) <= video.currentTime) {
            setBuffered(video.buffered.end(i));
            break;
          }
        }
      }

      // Periodically persist playback position every 2 seconds
      if (video.currentTime > 0) {
        savePlaybackPosition(params.lectureId, video.currentTime, video.duration || 0);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      clearPlaybackPosition(params.lectureId);
      onLectureComplete?.();
    };

    const handleVideoError = () => {
      // Ignore if dash is active and handling
      if (!dashPlayerRef.current) {
        setErrorState({
          message: 'Video playback encountered an error or media source expired.',
          code: 'VIDEO_ELEMENT_ERROR',
        });
        setIsLoading(false);
        setIsBuffering(false);
      }
    };

    const handleDurationChange = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setIsBuffering(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleVideoError);
    };
  }, [params.lectureId, volume, isMuted, playbackRate, onLectureComplete]);

  // Action Handlers
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || isLoading || errorState) return;

    if (video.paused || video.ended) {
      const playPromise = dashPlayerRef.current ? dashPlayerRef.current.play() : video.play();
      if (playPromise && typeof (playPromise as any).then === 'function') {
        (playPromise as Promise<void>).then(() => {
          setIsPlaying(true);
          setIconFeedback('play');
          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = setTimeout(() => setIconFeedback(null), 500);
        }).catch(() => {
          // Autoplay restrictions or user gesture required
        });
      } else {
        setIsPlaying(true);
      }
    } else {
      if (dashPlayerRef.current) {
        dashPlayerRef.current.pause();
      } else {
        video.pause();
      }
      setIsPlaying(false);
      setIconFeedback('pause');
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setIconFeedback(null), 500);
    }
  }, [isLoading, errorState]);

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(newTime, duration || video.duration || 0));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleRelativeSeek = useCallback((deltaSecs: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min((video.currentTime || 0) + deltaSecs, video.duration || 0));
    video.currentTime = target;
    setCurrentTime(target);
  }, []);

  const handleVolumeChange = (newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    saveSettings({ volume: clamped, muted: clamped === 0 });
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    saveSettings({ muted: nextMuted });
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    saveSettings({ playbackRate: newRate });
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
  };

  const handleQualityChange = (qId: number | 'auto') => {
    setCurrentQualityId(qId);
    if (!dashPlayerRef.current) return;

    if (qId === 'auto') {
      dashPlayerRef.current.updateSettings({
        streaming: {
          abr: {
            autoSwitchBitrate: {
              video: true,
            },
          },
        },
      });
      const rep = dashPlayerRef.current.getCurrentRepresentationForType('video');
      if (rep && rep.height) {
        setActiveQualityLabel(`${rep.height}p`);
      }
    } else {
      dashPlayerRef.current.updateSettings({
        streaming: {
          abr: {
            autoSwitchBitrate: {
              video: false,
            },
          },
        },
      });
      dashPlayerRef.current.setRepresentationForTypeByIndex('video', qId, true);
      const chosen = qualities.find((q) => q.id === qId);
      if (chosen) {
        setActiveQualityLabel(chosen.label);
      }
    }
  };

  const handleBack = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onBack?.();
  }, [onBack]);

  // If player is launched in full screen mode, attempt native fullscreen on mount
  useEffect(() => {
    if (isFullScreenMode) {
      const container = containerRef.current;
      if (container && !document.fullscreenElement) {
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(() => {});
        } else if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        }
      }
    }
  }, [isFullScreenMode]);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if (video && (video as any).webkitEnterFullscreen) {
        // iOS Safari fullscreen fallback
        (video as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // Mobile Tap & Double Tap Gesture Detection
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle clicks on video container, not inside control buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('#video-seek-bar-container') || target.closest('input')) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    let side: 'left' | 'right' | 'center' = 'center';
    if (x < width * 0.38) {
      side = 'left';
    } else if (x > width * 0.62) {
      side = 'right';
    }

    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Check if double tap on same side
    if (lastTap && now - lastTap.time < 320 && lastTap.side === side && side !== 'center') {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = null;

      // Execute double tap action
      if (side === 'left') {
        handleRelativeSeek(-10);
        setGestureFeedback({ side: 'left', count: (gestureFeedback.count || 0) + 1 });
      } else if (side === 'right') {
        handleRelativeSeek(10);
        setGestureFeedback({ side: 'right', count: (gestureFeedback.count || 0) + 1 });
      }

      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = setTimeout(() => {
        setGestureFeedback({ side: null, count: 0 });
      }, 650);
      return;
    }

    // Record tap
    lastTapRef.current = { time: now, side };

    // Single tap behavior: toggle controls visibility or play/pause
    singleTapTimeoutRef.current = setTimeout(() => {
      lastTapRef.current = null;
      setIsControlsVisible((prev) => !prev);
      if (!isControlsVisible) {
        resetControlsTimer();
      }
    }, 280);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          resetControlsTimer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleRelativeSeek(-5);
          resetControlsTimer();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleRelativeSeek(5);
          resetControlsTimer();
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          handleRelativeSeek(-10);
          resetControlsTimer();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handleRelativeSeek(10);
          resetControlsTimer();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.05));
          resetControlsTimer();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.05));
          resetControlsTimer();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handleToggleMute();
          resetControlsTimer();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullScreenMode && onBack && !document.fullscreenElement) {
            e.preventDefault();
            handleBack();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleRelativeSeek, volume, isControlsVisible, resetControlsTimer, isFullScreenMode, onBack, handleBack]);

  const handleRetry = () => {
    clearPlaybackCache(params.lectureId);
    initializePlayback(true);
  };

  const handleRestartFromBeginning = () => {
    clearPlaybackPosition(params.lectureId);
    handleSeek(0);
    setResumeNotice(null);
  };

  return (
    <div
      id="responsive-video-player-wrapper"
      className={
        isFullScreenMode
          ? 'fixed inset-0 z-50 w-full h-full bg-black flex flex-col items-center justify-center select-none overflow-hidden'
          : 'w-full flex flex-col items-center select-none'
      }
    >
      {/* Outer Player Frame */}
      <div
        id="video-player-container"
        ref={containerRef}
        onMouseMove={resetControlsTimer}
        onClick={handleContainerClick}
        className={
          isFullScreenMode
            ? 'group relative w-full h-full bg-black overflow-hidden flex items-center justify-center transition-all'
            : 'group relative w-full aspect-video bg-zinc-950 sm:rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/60 transition-all'
        }
      >
        {/* HTML5 Video Element */}
        <video
          id="html5-video-element"
          ref={videoRef}
          playsInline
          crossOrigin="anonymous"
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Offline Banner */}
        {isOffline && (
          <div
            id="video-offline-banner"
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-200 text-xs shadow-lg backdrop-blur-md animate-pulse"
          >
            <WifiOff className="w-4 h-4 text-red-400" />
            <span>Network offline. Video will resume automatically when connected.</span>
          </div>
        )}

        {/* Resumed Playback Toast */}
        {resumeNotice && resumeNotice.visible && (
          <div
            id="video-resume-notice"
            className="absolute top-4 left-4 z-30 flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-amber-500/40 text-white text-xs shadow-xl backdrop-blur-md animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Resumed from {formatTime(resumeNotice.time)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRestartFromBeginning();
              }}
              className="ml-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors text-[11px] font-medium"
            >
              Start over
            </button>
          </div>
        )}

        {/* Center Feedback / Buffering / Play Overlay */}
        <CenterPlayOverlay
          isPlaying={isPlaying}
          isLoading={isLoading}
          isBuffering={isBuffering}
          showIconFeedback={iconFeedback}
          onTogglePlay={togglePlay}
        />

        {/* Double-tap Gestures Visualizer */}
        <GestureOverlay feedback={gestureFeedback} />

        {/* Error State with Professional Retry View */}
        {errorState && (
          <div
            id="video-error-overlay"
            className="absolute inset-0 z-35 flex flex-col items-center justify-center p-6 bg-zinc-950/95 backdrop-blur-md text-center"
          >
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-3 shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">Playback Unavailable</h4>
            <p className="text-xs text-zinc-400 max-w-md mb-4 leading-relaxed">
              {errorState.message}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                id="video-retry-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry();
                }}
                className="px-4 py-2 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-lg active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Playback</span>
              </button>

              {(errorState.canOpenInNewTab || (typeof window !== 'undefined' && window.self !== window.top)) && (
                <a
                  id="video-open-newtab-btn"
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold shadow-lg active:scale-95 transition-all border border-zinc-700"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Open in New Tab</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Top Header Bar (Back button, Title & DRM Badge) */}
        <div
          className={`absolute top-0 inset-x-0 z-25 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 flex items-center justify-between ${
            isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3 truncate pr-3">
            {onBack && (
              <button
                id="video-player-back-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBack();
                }}
                className="p-1.5 sm:p-2 -ml-1 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/70 shadow-md backdrop-blur-md flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all"
                title="Back to Home Screen"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span className="hidden xs:inline sm:inline">Home</span>
              </button>
            )}
            <h3 className="text-xs sm:text-sm font-medium text-white truncate drop-shadow-sm">
              {lectureTitle || params.title || 'Lecture Playback'}
            </h3>
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-medium tracking-wide">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Authorized</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              id="player-top-open-newtab"
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50 text-[11px] flex items-center gap-1.5 backdrop-blur-sm transition-colors"
              title="Open player in new browser tab for DRM"
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">New Tab</span>
            </a>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div
          id="video-bottom-controls"
          className={`absolute bottom-0 inset-x-0 z-25 px-4 pb-3 pt-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 flex flex-col gap-1.5 ${
            isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Seek Timeline */}
          <SeekBar
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            onSeek={handleSeek}
          />

          {/* Controls Strip */}
          <div className="flex items-center justify-between gap-2 text-white">
            {/* Left Controls: Play/Pause, Rewind/Forward, Volume, Time */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="video-play-pause-btn"
                type="button"
                onClick={togglePlay}
                className="p-1.5 text-zinc-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
                title={isPlaying ? 'Pause (space)' : 'Play (space)'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <button
                id="video-rewind-10s-btn"
                type="button"
                onClick={() => handleRelativeSeek(-10)}
                className="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
                title="Rewind 10s (j)"
                aria-label="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                id="video-forward-10s-btn"
                type="button"
                onClick={() => handleRelativeSeek(10)}
                className="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
                title="Forward 10s (l)"
                aria-label="Forward 10 seconds"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={handleVolumeChange}
                onToggleMute={handleToggleMute}
              />

              {/* Time display */}
              <div className="text-xs font-mono text-zinc-300 ml-1 select-none">
                <span className="text-white font-medium">{formatTime(currentTime)}</span>
                <span className="text-zinc-500 mx-1">/</span>
                <span className="text-zinc-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Speed, Quality, Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-2">
              <SpeedSelector
                currentRate={playbackRate}
                onRateChange={handleRateChange}
              />

              <QualitySelector
                qualities={qualities}
                currentQualityId={currentQualityId}
                activeQualityLabel={activeQualityLabel}
                onSelectQuality={handleQualityChange}
              />

              <button
                id="video-fullscreen-btn"
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
                title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
