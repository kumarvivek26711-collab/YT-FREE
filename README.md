# YT Bina Ads 📺 (Backend)

YouTube videos bina ads ke — API key hidden 🔒

## Quick Setup (3 Steps)

### 1. Local Test करो
```bash
npm install
echo "YOUTUBE_API_KEY=AIza_your_key_here" > .env
npm start
```

Open `index-backend.html` in browser

### 2. GitHub Push करो
```bash
git add .
git commit -m "Initial"
git push
```

### 3. Render पर Deploy करो
- render.com जाओ
- New Web Service → Connect GitHub
- Environment में add करो: `YOUTUBE_API_KEY = AIza_xxxxx`
- Deploy दबाओ
- अपना URL copy करो
- `index-backend.html` में update करो (line 7)

## Files

- **server.js** - Backend (API key यहाँ)
- **index-backend.html** - Frontend (users के लिए)
- **package.json** - Dependencies
- **.env** - API key (local only)
- **.gitignore** - Keeps .env safe

## Important ⚠️

- ✅ API key Render environment में डालो
- ✅ `.env` को GitHub पर upload मत करो
- ✅ Frontend पर URL update करना
- ✅ API key index-backend.html में मत डालो

## API Key कहाँ से?
1. console.cloud.google.com
2. YouTube Data API v3 enable करो
3. API Key बनाओ
4. Render environment में paste करो

---

**Done!** Happy YouTubing! 🎉
