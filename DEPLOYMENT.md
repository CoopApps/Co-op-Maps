# Co-opMaps Deployment Guide

This guide will help you deploy Co-opMaps to the cloud so it's accessible on the internet.

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

Railway offers free tier with PostgreSQL included.

#### Steps:

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your Co-op-Maps repository
   - Railway will auto-detect Node.js

3. **Add PostgreSQL Database**
   - In your project, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway will create a database and set DATABASE_URL automatically

4. **Set Environment Variables**
   - Click on your web service
   - Go to "Variables" tab
   - Add:
     - NODE_ENV=production
     - ADMIN_PASSWORD=your_secure_password_here
     - JWT_SECRET=your_random_secret_key_here
     - CORS_ORIGIN=*

5. **Run Database Migration**
   - Connect to database and run:
     psql \$DATABASE_URL < server/db/community-maps-schema.sql

6. **Get Your Backend URL**
   - Railway gives you a URL like: https://your-app.up.railway.app
   - Copy this URL

7. **Update Frontend Configuration**
   - Edit public/config.js
   - Change API_BASE_URL to your Railway URL + '/api'

8. **Deploy Frontend to Netlify**
   - Go to netlify.com
   - "Add new site" → "Import from Git"
   - Select your repo
   - Deploy!

---

## Post-Deployment Checklist

- [ ] Backend running at Railway/Render URL
- [ ] Database connected and migrated
- [ ] Environment variables set
- [ ] Frontend config.js points to backend
- [ ] Test: Create → Submit → Admin Approve → Browse

