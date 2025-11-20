# Deployment Guide

This guide will help you deploy your basketball shot tracking app so your friends can access it anytime!

## Quick Overview

Your app has three components that need to be deployed:
1. **Frontend** (Vue.js) - The user interface
2. **Backend** (Express.js) - The API server
3. **Database** (PostgreSQL) - Stores session data

## Recommended Option: Railway (Easiest All-in-One)

Railway is the easiest option because it can host everything in one place and has a free tier.

### Steps:

1. **Sign up at [railway.app](https://railway.app)** (free tier available)

2. **Deploy Database:**
   - Click "New Project"
   - Click "Add Database" → "PostgreSQL"
   - Railway will create a PostgreSQL database and give you connection details

3. **Deploy Backend:**
   - In the same project, click "New Service" → "GitHub Repo"
   - Connect your GitHub account and select this repository
   - Railway will detect it's a Node.js app
   - Set the root directory to `/server` (or create a separate backend repo)
   - Add environment variables:
     ```
     DB_HOST=<from Railway PostgreSQL>
     DB_PORT=5432
     DB_NAME=railway
     DB_USER=postgres
     DB_PASSWORD=<from Railway PostgreSQL>
     SERVER_PORT=3000
     ```
   - Set the start command: `node index.js`
   - Railway will automatically assign a public URL like `https://your-app.up.railway.app`

4. **Deploy Frontend:**
   - Create a new service → "GitHub Repo" (same repo)
   - Set root directory to `/` (root)
   - Add environment variable:
     ```
     VITE_API_URL=https://your-backend-url.up.railway.app
     ```
   - Set build command: `npm run build`
   - Set start command: `npm run preview` (or use a static file server)
   - Railway will give you a frontend URL

5. **Update Frontend API URL:**
   - Update `vite.config.js` to use your Railway backend URL instead of localhost

---

## Alternative Option 1: Render (Free Tier Available)

### Database:
1. Go to [render.com](https://render.com)
2. Create a new PostgreSQL database
3. Note the connection string

### Backend:
1. Create a new "Web Service"
2. Connect your GitHub repo
3. Set:
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node index.js`
   - Environment Variables: Add your database credentials

### Frontend:
1. Create a new "Static Site"
2. Connect your GitHub repo
3. Set:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`

---

## Alternative Option 2: Vercel (Frontend) + Railway (Backend + DB)

### Frontend on Vercel:
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-detect Vue.js
4. Add environment variable: `VITE_API_URL=https://your-backend-url.up.railway.app`
5. Deploy!

### Backend + Database on Railway:
Follow the Railway steps above for backend and database.

---

## Important Configuration Changes Needed

Before deploying, you'll need to make these changes:

### 1. Update `vite.config.js`
Change the proxy target to your production backend URL, or remove proxy and use environment variables.

### 2. Update `server/index.js`
Make sure it can serve static files in production, or configure CORS properly for your frontend domain.

### 3. Environment Variables
Create a `.env.production` file (don't commit it!) with your production database credentials.

---

## Quick Start: Railway Deployment Script

I can help you set up the necessary configuration files for Railway deployment. Would you like me to:
1. Create a `railway.json` configuration file
2. Update your code to use environment variables properly
3. Create a production-ready build configuration

Let me know which option you'd like to pursue!

