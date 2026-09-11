export interface PlaybackApiResponse {
  success: boolean;
  url?: string;
  dashUrl?: string;
  keys?: Record<string, string>;
  message?: string;
}

export interface ApiLectureParams {
  batchId: string;
  subjectId: string;
  lectureId: string;
  key: string;
  title?: string;
  durationEstimate?: string;
}

export interface VideoQuality {
  id: number | 'auto';
  label: string;
  width?: number;
  height?: number;
  bitrate?: number;
}

export interface PlayerSettings {
  volume: number;
  muted: boolean;
  playbackRate: number;
}
