const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const API_KEY = process.env.YOUTUBE_API_KEY; // Hidden in .env
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

// Routes
app.get('/api/trending', async (req, res) => {
  try {
    const { categoryId, maxResults = 24 } = req.query;
    const cat = categoryId && categoryId !== 'all' ? `&videoCategoryId=${categoryId}` : '';
    
    const url = `${YT_BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&maxResults=${maxResults}${cat}&key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q, maxResults = 24 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    const url = `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=${maxResults}&type=video&key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
