# Co-opMaps Deployment Guide

This guide covers deploying Co-opMaps as a web-based application with support for both modern and legacy systems.

## Table of Contents
1. [Deployment Options](#deployment-options)
2. [Low-Tech Version](#low-tech-version)
3. [Progressive Enhancement](#progressive-enhancement)
4. [Platform Recommendations](#platform-recommendations)

---

## Deployment Options

### Option A: Static Frontend + API Backend (Recommended)

**Best for:** Production deployments, scalability, CDN distribution

**Architecture:**
- Frontend: Static HTML/CSS/JS served from CDN or static hosting
- Backend: API server on separate domain/subdomain
- Database: Managed PostgreSQL service
- Cache: Managed Redis (optional)

**Pros:**
- Cheaper (static hosting is often free)
- Faster (CDN distribution)
- More scalable
- Better separation of concerns

**Deployment Steps:**

1. **Frontend (Static Hosting):**
   ```bash
   # Deploy to Netlify, Vercel, or GitHub Pages
   # Simply upload the public/ directory with index.html

   # Or use S3 + CloudFront
   aws s3 sync public/ s3://coopmaps-frontend/
   ```

2. **Backend (API Server):**
   ```bash
   # Deploy to Heroku, Railway, or Render
   git push heroku main

   # Or use Docker on VPS
   docker-compose up -d
   ```

**Cost Estimate:**
- Frontend: $0 (Netlify/Vercel free tier)
- Backend: $7-25/month (Heroku, Railway, Render)
- Database: $5-15/month (managed PostgreSQL)
- **Total: $12-40/month**

---

### Option B: All-in-One Server

**Best for:** Simple deployments, single VPS, local installations

**Architecture:**
- Single Express server serves both frontend and API
- Everything runs on one machine/container

**Deployment:**
```bash
# Already configured! Server serves static files from public/
npm start

# Or with Docker
docker-compose up -d
```

**Cost Estimate:**
- VPS: $5-10/month (DigitalOcean, Linode, Hetzner)
- **Total: $5-10/month**

---

## Low-Tech Version

### Requirements for Legacy Systems

**Minimum Browser Support:**
- Internet Explorer 11 (2013)
- Chrome 49+ (2016)
- Firefox 52+ (2017)
- Safari 10+ (2016)

**Target Systems:**
- Windows XP/Vista/7
- Old Android devices (4.4+)
- Slow internet (2G/3G)
- Limited RAM (2GB+)

### Low-Tech Implementation Strategy

#### 1. **Dual Version Approach**

Create two versions that share the same backend:

```
public/
├── index.html          # Modern version (ES6+, WebSockets)
├── legacy.html         # Low-tech version (ES5, polling)
├── js/
│   ├── modern/        # Modern JavaScript modules
│   └── legacy/        # Transpiled ES5 code
└── css/
    ├── modern.css     # CSS Grid, Flexbox
    └── legacy.css     # Float-based layouts
```

#### 2. **Feature Detection & Progressive Enhancement**

```html
<!-- Automatically redirect to appropriate version -->
<script>
  // Check for modern features
  var isModern = (
    'Promise' in window &&
    'fetch' in window &&
    'WebSocket' in window &&
    'localStorage' in window
  );

  // Redirect to legacy version if needed
  if (!isModern && !window.location.pathname.includes('legacy')) {
    window.location.href = '/legacy.html';
  }
</script>
```

#### 3. **Graceful Degradation Features**

| Feature | Modern Version | Low-Tech Version |
|---------|---------------|------------------|
| Real-time sync | WebSocket (Socket.io) | Long polling (every 5s) |
| JavaScript | ES6 modules | Transpiled ES5 |
| Storage | IndexedDB + localStorage | localStorage only |
| UI Updates | Virtual DOM/React | Direct DOM manipulation |
| Graphics | Canvas API | SVG fallback |
| Icons | SVG sprites | PNG fallback images |
| Fonts | Web fonts | System fonts |
| Network | Fetch API | XMLHttpRequest |
| Bundling | ES modules | Concatenated files |

---

## Progressive Enhancement Implementation

### Phase 1: Core Functionality (Works Everywhere)

**What works offline/legacy:**
- View and create diagrams
- Add enterprises and relationships
- Basic drawing tools
- Export to image/PDF
- localStorage persistence

**Technology:**
- Plain HTML/CSS/JavaScript (ES5)
- No build tools required
- No external dependencies beyond jsPDF

### Phase 2: Enhanced Features (Modern Browsers)

**Additional features with backend:**
- User authentication
- Cloud storage
- Share diagrams
- Public gallery
- Search

**Technology:**
- Fetch API for HTTP requests
- JWT for authentication
- AJAX form submissions

### Phase 3: Real-time Collaboration (Latest Browsers)

**Advanced features:**
- Live collaborative editing
- User presence
- Instant updates
- Version history

**Technology:**
- WebSocket (Socket.io)
- Service Workers (PWA)
- IndexedDB caching

---

## Platform Recommendations

### For Well-Resourced Organizations

**Recommended Stack:**
- **Frontend:** Vercel or Netlify (free tier)
- **Backend:** Railway or Render ($7-15/month)
- **Database:** Railway PostgreSQL or Supabase ($5-10/month)
- **CDN:** Cloudflare (free)

**Total Cost:** $12-25/month
**Setup Time:** 1-2 hours
**Maintenance:** Low

---

### For Resource-Constrained Coops

**Recommended Stack:**
- **Single VPS:** Hetzner or DigitalOcean ($5/month)
- **All-in-one Docker:** PostgreSQL + Backend + Frontend
- **Domain:** Namecheap ($8-12/year)

**Total Cost:** $5-6/month
**Setup Time:** 2-4 hours
**Maintenance:** Medium (requires basic Linux knowledge)

---

### For Local/Offline Use

**Recommended Approach:**
- Use the standalone HTML file (no backend)
- Data stored in browser localStorage
- Export/import for backup
- Can be run from file:// or USB drive

**Total Cost:** $0
**Setup Time:** 0 minutes (just open the file)
**Maintenance:** None

**Limitations:**
- No multi-user support
- No cloud backup
- No sharing features
- Data tied to one browser

---

## Quick Start Deployment

### Fastest Path to Production (Recommended for Most)

**Using Railway (All-in-one, ~5 minutes):**

```bash
# 1. Create account at railway.app
# 2. Install Railway CLI
npm i -g @railway/cli

# 3. Login and deploy
railway login
railway init
railway up

# 4. Add PostgreSQL
railway add postgresql

# 5. Set environment variables in Railway dashboard
# (Copy from .env.example)

# Done! You'll get a URL like: https://coopmaps-production.up.railway.app
```

**Cost:** $5-10/month (includes database)
**Automatic:** SSL, deployments, monitoring, backups

---

### Free Tier Deployment (For Testing)

**Frontend: Netlify**
```bash
# Deploy frontend only (works without backend)
npx netlify-cli deploy --dir=public
```

**Backend: Render (Free tier)**
```bash
# Create account at render.com
# Connect GitHub repo
# Render auto-deploys on push
```

**Limitations:**
- Free tier sleeps after inactivity (cold starts)
- 750 hours/month free (enough for testing)

---

## Performance Optimization for Low-Tech

### 1. Reduce File Sizes

**JavaScript:**
```bash
# Minify JavaScript for legacy version
npx terser public/js/legacy/app.js -o public/js/legacy/app.min.js
```

**Images:**
```bash
# Optimize images
npx imagemin public/images/* --out-dir=public/images/optimized
```

**Total bundle size target:**
- Modern version: < 500KB
- Legacy version: < 200KB

### 2. Enable Aggressive Caching

```nginx
# nginx.conf
location /static {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Lazy Loading

```javascript
// Load features on-demand for legacy browsers
function loadFeature(feature) {
    if (feature === 'collaboration') {
        // Only load Socket.io when needed
        loadScript('/js/socket.io.min.js', function() {
            initializeCollaboration();
        });
    }
}
```

---

## Browser Compatibility Matrix

| Feature | Chrome 49+ | Firefox 52+ | IE 11 | Safari 10+ | Mobile |
|---------|-----------|-------------|-------|-----------|--------|
| Basic drawing | ✅ | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ | ✅ |
| PDF Export | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Backend sync | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Real-time collab | ✅ | ✅ | ❌ | ✅ | ⚠️ |
| Offline PWA | ✅ | ✅ | ❌ | ⚠️ | ✅ |

✅ Full support | ⚠️ Partial support | ❌ Not supported

---

## Monitoring & Maintenance

### Essential Monitoring (Free Tools)

1. **Uptime Monitoring:**
   - UptimeRobot (free, checks every 5 minutes)
   - Better Uptime (free tier)

2. **Error Tracking:**
   - Sentry (free tier, 5k events/month)
   ```javascript
   // Add to frontend
   Sentry.init({ dsn: 'YOUR_DSN' });
   ```

3. **Analytics (Optional):**
   - Plausible (privacy-friendly, $9/month)
   - Or self-hosted Matomo (free)

### Backup Strategy

```bash
# Automated daily backups
0 2 * * * pg_dump coopmaps | gzip > /backups/db-$(date +%F).sql.gz

# Keep last 7 days
find /backups -name "db-*.sql.gz" -mtime +7 -delete
```

---

## Security Checklist

- [ ] HTTPS enabled (Let's Encrypt)
- [ ] Environment variables secured (not in code)
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] CORS properly configured
- [ ] Regular dependency updates
- [ ] Database backups automated
- [ ] Admin password changed from default

---

## Support for Different Network Conditions

### Slow Connections (2G/3G)

**Optimizations:**
- Compress responses (gzip/brotli)
- Lazy load images
- Defer non-critical JS
- Use CDN for static assets
- Implement request debouncing

```javascript
// Debounce save operations
const debouncedSave = debounce(saveDiagram, 2000);
```

### Intermittent Connectivity

**Strategies:**
- Offline-first with Service Worker
- Queue failed requests
- Auto-retry with exponential backoff
- Visual indicators for sync status

```javascript
// Show connection status
window.addEventListener('online', () => {
    syncQueuedChanges();
    showNotification('Connected - syncing changes...');
});
```

---

## Recommended Reading

- [Progressive Enhancement Guide](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)
- [Can I Use - Browser Compatibility](https://caniuse.com/)
- [Web.dev Performance Best Practices](https://web.dev/fast/)

---

## Next Steps

1. **Choose your deployment option** (see recommendations above)
2. **Set up monitoring** (UptimeRobot + Sentry)
3. **Create backups** (automated database backups)
4. **Test on target devices** (borrow old computers/phones)
5. **Document for users** (create user guide)

For detailed setup instructions, see [SETUP.md](./SETUP.md)
