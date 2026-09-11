import { PlaybackApiResponse, ApiLectureParams } from '../types/player';

export interface ValidatedPlaybackData {
  dashUrl?: string;
  url?: string;
  keys?: Record<string, string>;
  isDash: boolean;
  cachedAt: number;
}

// In-memory cache to prevent redundant API queries
const cache = new Map<string, { data: ValidatedPlaybackData; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class PlaybackApiError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'PlaybackApiError';
  }
}

/**
 * Validates and caches playback response from authorized endpoint.
 * Sensitive URLs and DRM keys are kept encapsulated in memory and never leaked.
 */
export async function fetchPlaybackData(
  params: ApiLectureParams,
  endpointBaseUrl: string = 'https://examcrushers.in/api/play',
  forceRefresh: boolean = false
): Promise<ValidatedPlaybackData> {
  const cacheKey = `${endpointBaseUrl}::${params.batchId}::${params.subjectId}::${params.lectureId}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  // Attempt to call the local full-stack server proxy first
  const query = new URLSearchParams();
  query.set('batchId', params.batchId);
  query.set('subjectId', params.subjectId);
  query.set('lectureId', params.lectureId);
  if (params.key) {
    query.set('key', params.key);
  }
  if (endpointBaseUrl) {
    query.set('endpoint', endpointBaseUrl);
  }
  const serverProxyPath = `/api/playback-info?${query.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    let response: Response;
    try {
      response = await fetch(serverProxyPath, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch {
      // If local server endpoint is unavailable, fall back directly to the provided endpoint
      const directUrl = new URL(endpointBaseUrl);
      directUrl.searchParams.set('batchId', params.batchId);
      directUrl.searchParams.set('subjectId', params.subjectId);
      directUrl.searchParams.set('lectureId', params.lectureId);
      if (params.key) {
        directUrl.searchParams.set('key', params.key);
      }
      response = await fetch(directUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new PlaybackApiError('Authentication failed or session expired. Please verify authorization.', 'AUTH_FAILED');
      }
      if (response.status === 404) {
        throw new PlaybackApiError('Requested media lecture was not found.', 'NOT_FOUND');
      }
      throw new PlaybackApiError(`Playback service returned error status (${response.status})`, 'HTTP_ERROR');
    }

    const json = await response.json();

    if (!json || typeof json !== 'object') {
      throw new PlaybackApiError('Invalid response format received from backend.', 'INVALID_FORMAT');
    }

    if (!json.success) {
      const msg = json.message || 'Media authorization was declined by the server.';
      throw new PlaybackApiError(msg, 'SERVER_REJECTED');
    }

    const hasDash = typeof json.dashUrl === 'string' && json.dashUrl.trim().length > 0;
    const hasStandardUrl = typeof json.url === 'string' && json.url.trim().length > 0;

    if (!hasDash && !hasStandardUrl) {
      throw new PlaybackApiError('No valid media stream URL was provided for this lecture.', 'NO_STREAM');
    }

    const validated: ValidatedPlaybackData = {
      dashUrl: hasDash ? json.dashUrl!.trim() : undefined,
      url: hasStandardUrl ? json.url!.trim() : undefined,
      keys: json.keys && typeof json.keys === 'object' ? json.keys : undefined,
      isDash: hasDash,
      cachedAt: Date.now(),
    };

    // Cache valid response
    cache.set(cacheKey, {
      data: validated,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return validated;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof PlaybackApiError) {
      throw err;
    }
    if ((err as Error)?.name === 'AbortError') {
      throw new PlaybackApiError('Connection timed out while contacting the playback server.', 'TIMEOUT');
    }
    throw new PlaybackApiError('Unable to connect to the playback service. Please check your network.', 'NETWORK_ERROR');
  }
}

export function clearPlaybackCache(lectureId?: string): void {
  if (!lectureId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(lectureId)) {
      cache.delete(key);
    }
  }
}
