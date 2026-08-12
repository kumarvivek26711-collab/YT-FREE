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
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

const API_KEY = process.env.YOUTUBE_API_KEY;
const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const PORT = process.env.PORT || 3001;

// ✅ Keep-Alive: Server को ping करो हर 5 min (Render को sleep न होने दे)
function keepAlive() {
  setInterval(async () => {
    try {
      await fetch(`http://localhost:${PORT}/api/health`);
      console.log('🔄 Keep-alive ping sent');
    } catch (err) {
      console.log('Keep-alive ping skipped');
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/trending', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    const { categoryId, maxResults = 24 } = req.query;
    const cat = categoryId && categoryId !== 'all' ? `&videoCategoryId=${categoryId}` : '';
    
    const url = `${YT_BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&maxResults=${maxResults}${cat}&key=${API_KEY}`;
    
    console.log('📡 Trending request:', categoryId || 'all');
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('YouTube API error:', data.error.message);
      return res.status(400).json({ error: data.error.message });
    }
    
    console.log('✅ Trending response:', data.items?.length || 0, 'items');
    res.json(data);
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    const { q, maxResults = 24 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    const url = `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=${maxResults}&type=video&key=${API_KEY}`;
    
    console.log('📡 Search request:', q);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('YouTube API error:', data.error.message);
      return res.status(400).json({ error: data.error.message });
    }
    
    console.log('✅ Search response:', data.items?.length || 0, 'items');
    res.json(data);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════╗');
  console.log('║   YT Bina Ads Backend Server   ║');
  console.log('╚════════════════════════════════╝');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔐 API Key: ${API_KEY ? 'SET ✓' : 'MISSING ✗'}`);
  console.log('');
  
  // Start keep-alive pinger
  keepAlive();
  console.log('🔄 Keep-alive enabled (every 5 min)');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

