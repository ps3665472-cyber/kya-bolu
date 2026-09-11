import express, { Request, Response } from 'express';
import path from 'path';
import { Readable } from 'stream';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

interface StreamSession {
  manifestUrl: string;
  baseUrl: string;
  queryString: string;
  createdAt: number;
}

const streamSessions = new Map<string, StreamSession>();

// Purge sessions older than 24 hours periodically
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, session] of streamSessions.entries()) {
    if (session.createdAt < cutoff) {
      streamSessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Playback Info endpoint: authorizes and configures stream proxy
  app.get('/api/playback-info', async (req: Request, res: Response): Promise<void> => {
    try {
      const endpoint = (req.query.endpoint as string) || 'https://examcrushers.in/api/play';
      const batchId = req.query.batchId as string;
      const subjectId = req.query.subjectId as string;
      const lectureId = req.query.lectureId as string;
      const key = req.query.key as string;

      if (!batchId || !subjectId || !lectureId) {
        res.status(400).json({ success: false, message: 'Missing required query parameters' });
        return;
      }

      const targetUrl = new URL(endpoint);
      targetUrl.searchParams.set('batchId', batchId);
      targetUrl.searchParams.set('subjectId', subjectId);
      targetUrl.searchParams.set('lectureId', lectureId);
      if (key) {
        targetUrl.searchParams.set('key', key);
      }

      const upstreamRes = await fetch(targetUrl.toString(), {
        headers: { Accept: 'application/json' },
      });

      if (!upstreamRes.ok) {
        res.status(upstreamRes.status).json({
          success: false,
          message: `Upstream authorization service returned status ${upstreamRes.status}`,
        });
        return;
      }

      const json = await upstreamRes.json();

      if (!json || !json.success) {
        res.json({
          success: false,
          message: json?.message || 'Media playback not authorized for this lecture',
        });
        return;
      }

      const dashUrl = json.dashUrl?.trim();
      const rawUrl = json.url?.trim();

      if (dashUrl) {
        // Extract the underlying MPD URL and query signature
        let actualMpdUrl = dashUrl;
        if (dashUrl.includes('url=')) {
          const parsed = new URL(dashUrl);
          const encodedUrl = parsed.searchParams.get('url');
          if (encodedUrl) {
            actualMpdUrl = decodeURIComponent(encodedUrl);
          }
        }

        const mpdObj = new URL(actualMpdUrl);
        const lastSlashIndex = mpdObj.pathname.lastIndexOf('/');
        const basePath = lastSlashIndex !== -1 ? mpdObj.pathname.slice(0, lastSlashIndex + 1) : '/';
        const baseUrl = `${mpdObj.origin}${basePath}`;
        const queryString = mpdObj.search.startsWith('?') ? mpdObj.search.slice(1) : mpdObj.search;

        // Create stream session ID
        const sessionId = crypto.randomUUID();
        streamSessions.set(sessionId, {
          manifestUrl: actualMpdUrl,
          baseUrl,
          queryString,
          createdAt: Date.now(),
        });

        res.json({
          success: true,
          isDash: true,
          dashUrl: `/api/stream/manifest/${sessionId}/manifest.mpd`,
          keys: json.keys || undefined,
        });
        return;
      }

      if (rawUrl) {
        res.json({
          success: true,
          isDash: false,
          url: rawUrl,
        });
        return;
      }

      res.status(404).json({ success: false, message: 'No playable media source found' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to contact playback authorization server' });
    }
  });

  // MPD Manifest proxy with BaseURL rewrite
  app.get('/api/stream/manifest/:sessionId/manifest.mpd', async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const session = streamSessions.get(sessionId);

    if (!session) {
      res.status(404).send('Playback session expired or not found');
      return;
    }

    try {
      const upstreamRes = await fetch(session.manifestUrl, {
        headers: { Accept: '*/*' },
      });

      if (!upstreamRes.ok) {
        res.status(upstreamRes.status).send('Failed to fetch upstream manifest');
        return;
      }

      let manifestText = await upstreamRes.text();

      // Cleanly remove any existing BaseURL elements (to avoid nested or duplicate resolution)
      let cleanManifest = manifestText.replace(/<BaseURL>[\s\S]*?<\/BaseURL>/g, '');

      // Insert single local BaseURL right under <MPD ...>
      const localBaseUrl = `/api/stream/segment/${sessionId}/`;
      cleanManifest = cleanManifest.replace(/(<MPD[^>]*>)/, `$1\n  <BaseURL>${localBaseUrl}</BaseURL>`);

      res.setHeader('Content-Type', 'application/dash+xml');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(cleanManifest);
    } catch (err) {
      res.status(502).send('Error proxying manifest');
    }
  });

  // Segment proxy with Range support and streaming pipe
  app.get('/api/stream/segment/:sessionId/*', async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const session = streamSessions.get(sessionId);

    if (!session) {
      res.status(404).send('Playback session expired');
      return;
    }

    const segmentPath = req.params[0];
    if (!segmentPath) {
      res.status(400).send('Missing segment path');
      return;
    }

    // Construct upstream segment URL with signature
    const sep = session.queryString ? '?' : '';
    const targetSegmentUrl = `${session.baseUrl}${segmentPath}${sep}${session.queryString}`;

    const headersToSend: Record<string, string> = {
      Accept: '*/*',
    };
    if (req.headers.range) {
      headersToSend['Range'] = req.headers.range;
    }

    try {
      const upstreamRes = await fetch(targetSegmentUrl, {
        headers: headersToSend,
      });

      res.status(upstreamRes.status);

      // Forward essential streaming headers
      const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
      const contentLength = upstreamRes.headers.get('content-length');
      const contentRange = upstreamRes.headers.get('content-range');
      const acceptRanges = upstreamRes.headers.get('accept-ranges') || 'bytes';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', acceptRanges);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);

      if (upstreamRes.body) {
        // Stream body via Node stream pipe
        const nodeStream = Readable.fromWeb(upstreamRes.body as any);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (err) {
      if (!res.headersSent) {
        res.status(502).send('Error streaming media segment');
      }
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
