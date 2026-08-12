const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}${req.query.q ? ' → ' + req.query.q : ''}`);
  next();
});

const API_KEY  = process.env.YOUTUBE_API_KEY;
const YT_BASE  = 'https://www.googleapis.com/youtube/v3';
const PORT     = process.env.PORT || 3001;

// ── Simple In-Memory Cache ──────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  console.log(`⚡ Serving from Cache: ${key}`);
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ── Helper: YouTube items → { videos: [...] } ──────────────────
// FIX: Frontend expects { videos: [] } but YouTube returns { items: [] }
function formatVideos(items = []) {
  return items.map(item => ({
    id:           item.id?.videoId || item.id || '',
    title:        item.snippet?.title || '',
    channelTitle: item.snippet?.channelTitle || '',
    thumbnail:    item.snippet?.thumbnails?.medium ||
                  item.snippet?.thumbnails?.default || null,
    publishedAt:  item.snippet?.publishedAt || '',
  }));
}

// ── Health ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Search ─────────────────────────────────────────────────────
// FIX: Now accepts "limit" param (frontend sends limit=100)
// FIX: Returns { videos: [...] } instead of raw YouTube response
app.get('/api/search', async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

    const { q, limit, maxResults } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    const count = Math.min(parseInt(limit || maxResults || 24), 50); // YT max = 50
    const cacheKey = `search:${q}:${count}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    console.log(`🔍 Fetching Search from YT: ${q}`);
    const url = `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=${count}&type=video&regionCode=IN&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error.message);
      return res.status(400).json({ error: data.error.message, videos: [] });
    }

    const result = { videos: formatVideos(data.items) };
    setCache(cacheKey, result);
    console.log(`✅ Search done: ${result.videos.length} videos`);
    res.json(result);

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message, videos: [] });
  }
});

// ── Category (Trending by category) ───────────────────────────
// FIX: This route was MISSING — frontend calls /api/category?id=10&limit=100
app.get('/api/category', async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

    const { id, limit, maxResults } = req.query;
    const catId = id && id !== 'all' ? id : null;
    const count = Math.min(parseInt(limit || maxResults || 24), 50);
    const cacheKey = `category:${catId || 'all'}:${count}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    console.log(`📂 Fetching Category from YT: ${catId || 'all'}`);
    const catParam = catId ? `&videoCategoryId=${catId}` : '';
    const url = `${YT_BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&maxResults=${count}${catParam}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error.message);
      return res.status(400).json({ error: data.error.message, videos: [] });
    }

    // /videos endpoint returns id as string, not object
    const result = { videos: formatVideos(data.items) };
    setCache(cacheKey, result);
    console.log(`✅ Category done: ${result.videos.length} videos`);
    res.json(result);

  } catch (err) {
    console.error('Category error:', err);
    res.status(500).json({ error: err.message, videos: [] });
  }
});

// ── Trending (kept for backward compat) ────────────────────────
app.get('/api/trending', async (req, res) => {
  const { categoryId, limit, maxResults } = req.query;
  req.query.id = categoryId;
  req.query.limit = limit || maxResults;
  // Reuse category logic
  return require('http').get(
    `http://localhost:${PORT}/api/category?id=${categoryId || ''}&limit=${limit || 24}`,
    r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res.json(JSON.parse(d))); }
  ).on('error', () => res.status(500).json({ videos: [] }));
});

// ── 404 / Error handlers ───────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not Found', videos: [] }));
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error', videos: [] });
});

// ── Keep-Alive ──────────────────────────────────────────────────
function keepAlive() {
  const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      await fetch(`${EXTERNAL_URL}/api/health`);
      console.log('💓 Keep-alive ping sent to external URL: Success');
    } catch (err) {
      console.log('💓 Keep-alive ping skipped');
    }
  }, 5 * 60 * 1000);
}

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🚀 YT-Free Backend — FIXED v2.0   ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`✅ Backend Super-Charged & Running on port ${PORT}`);
  console.log(`🔐 API Key: ${API_KEY ? 'SET ✓' : 'MISSING ✗'}`);
  console.log('');
  keepAlive();
  console.log('🛡️ Self-ping keep-alive enabled! Render server will not sleep.');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
