const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

const API_KEY = process.env.YOUTUBE_API_KEY;
const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const PORT = process.env.PORT || 3001;

// Aapki Render App ki Public URL
const RENDER_EXTERNAL_URL = 'https://yt-free.onrender.com';

// ⚡ SUPER FAST CACHE SYSTEM (Saves API Quota & Loads Instantly)
const cache = {
  trending: {},
  search: {}
};
const CACHE_TTL = 10 * 60 * 1000; // 10 Minutes Cache

function getCachedData(type, key) {
  const cached = cache[type][key];
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  return null;
}

function setCacheData(type, key, data) {
  cache[type][key] = {
    timestamp: Date.now(),
    data: data
  };
}

// 🔄 SELF-PING (KEEP-ALIVE) SYSTEM
// Yeh Render ko sone se rokega by calling its own public URL
function keepAlive() {
  setInterval(async () => {
    try {
      const response = await fetch(`${RENDER_EXTERNAL_URL}/api/health`);
      if (response.ok) {
        console.log(`🔄 Keep-alive ping sent to external URL: Success`);
      }
    } catch (err) {
      console.error('Keep-alive ping failed:', err.message);
    }
  }, 5 * 60 * 1000); // Har 5 minute mein public URL ko hit karega
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/trending', async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });
    
    const { categoryId = 'all', maxResults = 24 } = req.query;
    const cacheKey = `${categoryId}-${maxResults}`;

    // 1. Check Cache First (Instantly return if available)
    const cachedResponse = getCachedData('trending', cacheKey);
    if (cachedResponse) {
      console.log('⚡ Serving Trending from Cache:', categoryId);
      return res.json(cachedResponse);
    }
    
    // 2. If not in cache, fetch from YouTube API
    const cat = categoryId !== 'all' ? `&videoCategoryId=${categoryId}` : '';
    const url = `${YT_BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&maxResults=${maxResults}${cat}&key=${API_KEY}`;
    
    console.log('📡 Fetching Trending from YT:', categoryId);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);
    
    // 3. Save to Cache for next users
    setCacheData('trending', cacheKey, data);
    res.json(data);

  } catch (error) {
    console.error('Trending error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });
    
    const { q, maxResults = 24 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    
    const cacheKey = `${q.toLowerCase().trim()}-${maxResults}`;

    // 1. Check Cache First
    const cachedResponse = getCachedData('search', cacheKey);
    if (cachedResponse) {
      console.log('⚡ Serving Search from Cache:', q);
      return res.json(cachedResponse);
    }
    
    // 2. Fetch from YouTube
    const url = `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=${maxResults}&type=video&key=${API_KEY}`;
    
    console.log('📡 Fetching Search from YT:', q);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);
    
    // 3. Save to Cache
    setCacheData('search', cacheKey, data);
    res.json(data);

  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Backend Super-Charged & Running on port ${PORT}`);
  
  // Start the self-ping mechanism
  keepAlive();
  console.log('🛡️ Self-ping keep-alive enabled! Render server will not sleep.');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});