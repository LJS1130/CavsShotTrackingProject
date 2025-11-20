# Quick Deploy Guide - Railway (Recommended)

Railway is the easiest way to deploy your app. Follow these steps:

## Step 1: Push to GitHub

1. Create a GitHub repository (if you haven't already)
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

## Step 2: Deploy Database on Railway

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"**
3. Click **"Add Database"** → Select **"PostgreSQL"**
4. Railway will create the database automatically
5. Click on the database service → Go to **"Variables"** tab
6. Copy these values (you'll need them):
   - `PGHOST`
   - `PGPORT`
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`
   - Or use `DATABASE_URL` (easier!)

## Step 3: Deploy Backend on Railway

1. In the same Railway project, click **"New Service"**
2. Select **"GitHub Repo"** → Connect your GitHub account
3. Select your repository
4. Railway will detect it's a Node.js app
5. Go to **"Settings"** → **"Root Directory"** → Set to: `server`
6. Go to **"Variables"** tab and add:
   ```
   NODE_ENV=production
   SERVER_PORT=3000
   DATABASE_URL=<paste from database service>
   ```
   (Railway automatically provides DATABASE_URL, so you might not need to set it manually)
7. Go to **"Settings"** → **"Deploy"** → Set start command: `node index.js`
8. Railway will deploy automatically!
9. Once deployed, click **"Settings"** → **"Generate Domain"** to get your backend URL
   - It will look like: `https://your-app-name.up.railway.app`
   - Copy this URL!

## Step 4: Deploy Frontend on Railway

1. In the same Railway project, click **"New Service"** again
2. Select **"GitHub Repo"** → Select the same repository
3. Go to **"Settings"** → **"Root Directory"** → Leave as `/` (root)
4. Go to **"Variables"** tab and add:
   ```
   VITE_SESSION_API_ENDPOINT=https://your-backend-url.up.railway.app/api/sessions
   ```
   (Replace with your actual backend URL from Step 3)
5. Go to **"Settings"** → **"Deploy"** → Set:
   - Build command: `npm run build`
   - Start command: `npx serve -s dist -l 3000`
6. Railway will deploy automatically!
7. Click **"Settings"** → **"Generate Domain"** to get your frontend URL
   - Share this URL with your friends! 🎉

## Step 5: Install serve (for frontend)

The frontend needs a static file server. Add this to your `package.json`:

```json
"dependencies": {
  ...
  "serve": "^14.2.1"
}
```

Then run `npm install` locally and commit the updated `package.json`.

## Troubleshooting

### Backend won't connect to database
- Make sure `DATABASE_URL` is set in backend variables
- Check that database service is running (green status)

### Frontend can't reach backend
- Verify `VITE_SESSION_API_ENDPOINT` is set correctly
- Make sure backend URL includes `https://` and `/api/sessions`
- Check backend logs for CORS errors

### Build fails
- Check Railway logs for error messages
- Make sure all dependencies are in `package.json`
- Verify Node.js version (Railway auto-detects, but you can set it in `package.json`)

## Cost

Railway offers:
- **$5 free credit** per month (usually enough for small apps)
- Pay-as-you-go after that (~$5-10/month for this app)

## Alternative: Render (Free Tier)

If you prefer a free option:
1. Go to [render.com](https://render.com)
2. Follow similar steps but use `render.yaml` config file
3. Free tier spins down after inactivity (takes ~30 seconds to wake up)

---

**Need help?** Check the full `DEPLOYMENT.md` guide for more details!

