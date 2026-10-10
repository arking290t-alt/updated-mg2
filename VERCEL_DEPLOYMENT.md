# Deploying to Vercel Guide

This application is fully pre-configured and ready to deploy to **Vercel** with one click.

---

## 🚀 Quick Deployment Steps

### Step 1: Push to GitHub / GitLab / Bitbucket
Ensure your code is pushed to your Git repository.

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** -> **"Project"**.
3. Import your repository.

### Step 3: Configure Build & Settings (Auto-Detected)
Vercel will automatically detect `vercel.json` and set:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Environment Variables (Vercel Project Settings)
In the **Environment Variables** section on Vercel, add:

| Variable Name | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Your Google Gemini API Key for AI chatbot responses. |

> **Note on Firebase**: Your Firebase configuration (`mg-manager-3ab66`) is already pre-configured in `src/firebase/config.ts`. If you ever want to change projects, you can optionally override with `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc. in Vercel environment variables.

### Step 5: Click "Deploy"
Vercel will build the frontend assets, set up the serverless function (`/api/gemini/chat`), and give you a live production URL (e.g., `https://your-app.vercel.app`).

---

## 🛠 Features Enabled on Vercel
- **Single Page App Routing**: All client routes load cleanly with SPA fallback via `vercel.json`.
- **Serverless API Route (`/api/gemini/chat`)**: Runs securely on Vercel Serverless Functions with zero server maintenance.
- **Direct Live Firestore Integration**: Connects straight from client to `mg-manager-3ab66` with zero latency.
- **Offline & Fallback Safety**: Built-in fallback database and corrugator technical knowledge ensures the assistant works even during API rate limits.
