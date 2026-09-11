const POSITION_PREFIX = 'player_pos_';
const SETTINGS_KEY = 'player_settings_v1';

export interface SavedPosition {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export function savePlaybackPosition(lectureId: string, currentTime: number, duration: number): void {
  if (!lectureId || typeof window === 'undefined') return;
  // Don't save if position is in first 3 seconds or last 5 seconds of the video
  if (currentTime < 3 || (duration > 0 && currentTime >= duration - 5)) {
    if (currentTime >= duration - 5) {
      clearPlaybackPosition(lectureId);
    }
    return;
  }

  try {
    const payload: SavedPosition = {
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      updatedAt: Date.now(),
    };
    localStorage.setItem(POSITION_PREFIX + lectureId, JSON.stringify(payload));
  } catch {
    // Storage quota or privacy restrictions
  }
}

export function getPlaybackPosition(lectureId: string): SavedPosition | null {
  if (!lectureId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(POSITION_PREFIX + lectureId);
    if (!raw) return null;
    const parsed: SavedPosition = JSON.parse(raw);
    if (typeof parsed.currentTime === 'number' && parsed.currentTime > 0) {
      return parsed;
    }
  } catch {
    // Ignore corrupt storage
  }
  return null;
}

export function clearPlaybackPosition(lectureId: string): void {
  if (!lectureId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(POSITION_PREFIX + lectureId);
  } catch {
    // Ignore
  }
}

export interface StoredSettings {
  volume: number;
  muted: boolean;
  playbackRate: number;
}

export function getSavedSettings(): StoredSettings {
  const defaults: StoredSettings = { volume: 0.9, muted: false, playbackRate: 1 };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : defaults.volume,
      muted: Boolean(parsed.muted),
      playbackRate: typeof parsed.playbackRate === 'number' ? parsed.playbackRate : defaults.playbackRate,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: Partial<StoredSettings>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  } catch {
    // Ignore
  }
}
