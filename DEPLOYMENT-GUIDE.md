# Deployment Guide

This guide will help you deploy the Fleet Management System with:
- **Frontend**: Vercel
- **Backend**: Render (with PostgreSQL)

---

## Prerequisites

1. A [GitHub](https://github.com) account
2. A [Render](https://render.com) account (free tier works)
3. A [Vercel](https://vercel.com) account (free tier works)

---

## Part 1: Backend Deployment (Render)

### Step 1.1: Push Code to GitHub

1. Create a new repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/fleet-management-system.git
git push -u origin main
```

### Step 1.2: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** and select **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `fleet-management-backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn production_app:app --bind 0.0.0.0:$PORT`
   
5. Click **"Create Web Service"**

### Step 1.3: Configure Environment Variables

After the service is created, go to **"Environment"** tab and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your PostgreSQL connection string (see below) |
| `SECRET_KEY` | A random secure string (generate one) |
| `CORS_ORIGIN` | Your Vercel frontend URL (e.g., `https://your-app.vercel.app`) |
| `PORT` | `5002` |

### Step 1.4: Add PostgreSQL Database

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `fleet-db`
   - **Database Name**: `fleetdb`
   - **User**: `fleetuser`
3. Click **"Create Database"**
4. Copy the **"Internal Connection String"**
5. Paste it as the `DATABASE_URL` environment variable in your web service

### Step 1.5: Get Your Backend URL

After deployment, your backend URL will be:
```
https://fleet-management-backend.onrender.com
```

---

## Part 2: Frontend Deployment (Vercel)

### Step 2.1: Update API Configuration

Before deploying, update the frontend to use your production backend URL:

Edit `frontend/src/api.js`:
```javascript
import axios from "axios";

const api = axios.create({
  // Use your Render backend URL here
  baseURL: "https://fleet-management-backend.onrender.com",
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
```

### Step 2.2: Deploy to Vercel

**Option A: Using Vercel CLI**

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

**Option B: Using GitHub Integration**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **"Deploy"**

### Step 2.3: Update CORS on Backend

After getting your Vercel URL (e.g., `https://fleet-management.vercel.app`), 
go to Render dashboard and update `CORS_ORIGIN` environment variable to your Vercel URL.

---

## Part 3: Final Configuration

### Update CORS on Backend

1. Go to Render Dashboard → Your Backend Service → Environment
2. Edit `CORS_ORIGIN` to your Vercel URL (without trailing slash)
   - Example: `CORS_ORIGIN` = `https://fleet-management.vercel.app`

---

## Default Credentials

After deployment, use these credentials to login:
- **Username**: `admin`
- **Password**: `password`

> ⚠️ **Important**: Change the admin password after first login!

---

## Troubleshooting

### CORS Errors
If you get CORS errors:
1. Make sure `CORS_ORIGIN` is set correctly in Render
2. The backend must be restarted after changing environment variables

### Database Connection Issues
1. Verify `DATABASE_URL` is correct
2. Make sure PostgreSQL is fully provisioned (wait for green status)

### Session Issues
1. Ensure `SECRET_KEY` is set in environment variables
2. Check that `withCredentials: true` is set in frontend API

---

## Project Structure for Deployment

```
fleet-management-system/
├── backend/
│   ├── production_app.py    # Production Flask app
│   ├── requirements.txt    # Python dependencies
│   ├── Procfile           # Gunicorn config for Render
│   ├── runtime.txt        # Python version
│   └── .env.example       # Environment variables template
├── frontend/
│   ├── src/
│   │   └── api.js        # API configuration (update this!)
│   ├── package.json
│   └── vite.config.js
└── README.md
```

