# Testing Production Build Locally

Before deploying, test your production build locally to make sure everything works:

## Step 1: Build the Frontend

```bash
npm run build
```

This creates a `dist` folder with your production-ready frontend.

## Step 2: Set Environment Variables

Create a `.env.production.local` file (or set environment variables):

```bash
# Backend
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cavs_project
DB_USER=postgres
DB_PASSWORD=your_password
SERVER_PORT=3000
NODE_ENV=production

# Frontend (for build)
VITE_SESSION_API_ENDPOINT=http://localhost:3000/api/sessions
```

## Step 3: Start Backend

In one terminal:
```bash
npm run server
```

The backend should start on `http://localhost:3000`

## Step 4: Serve Frontend

In another terminal:
```bash
npm run serve
```

Or:
```bash
npx serve -s dist -l 5173
```

## Step 5: Test

1. Open `http://localhost:5173` (or whatever port serve uses)
2. Test creating a session
3. Test saving/pausing
4. Test loading previous sessions
5. Check browser console for errors
6. Check backend terminal for errors

## Common Issues

### Frontend can't reach backend
- Make sure backend is running on port 3000
- Check `VITE_SESSION_API_ENDPOINT` matches your backend URL
- In production build, the proxy doesn't work - you need the full URL

### CORS errors
- Backend should allow your frontend origin
- Check `server/index.js` CORS configuration

### Database connection fails
- Make sure PostgreSQL is running
- Verify database credentials
- Check database exists

---

Once everything works locally, you're ready to deploy! 🚀

