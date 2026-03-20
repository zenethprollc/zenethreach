# DEVELOPER QUICK-START GUIDE

## Prerequisites
- Node.js 20+ installed (https://nodejs.org)
- Git installed
- All accounts from SETUP_ACCOUNTS.md completed

---

## Step 1: Clone and install

```bash
# Install backend dependencies
cd zenethreach/backend
npm install

# Install Playwright browser (for website crawling)
npx playwright install chromium

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 2: Configure environment variables

```bash
# Backend
cd backend
cp .env.example .env
# Open .env and fill in all values

# Frontend
cd ../frontend
cp .env.example .env.local
# Open .env.local and fill in all values
```

---

## Step 3: Set up the database

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Open `backend/config/schema.sql` 
5. Copy the entire contents and paste into the SQL Editor
6. Click "Run"
7. You should see: "Success. No rows returned"

---

## Step 4: Run in development

Open TWO terminal windows:

**Terminal 1 — Backend:**
```bash
cd zenethreach/backend
npm run dev
# Should print: Zeneth Reach AI backend running on port 4000
```

**Terminal 2 — Frontend:**
```bash
cd zenethreach/frontend
npm run dev
# Should print: ready on http://localhost:3000
```

---

## Step 5: Test the flow

1. Open http://localhost:3000
2. Click "Create account" → enter your email + password
3. You'll be redirected to the onboarding wizard
4. Enter your website URL → click "Scan site"
5. Wait ~30 seconds → review brand profile
6. Connect Buffer (this connects all your social accounts)
7. Set schedule → click "Activate autopilot"
8. Go to Dashboard → click "✦ Generate post"
9. Wait ~20 seconds → a post appears in your queue
10. Click "✓ Approve" → it gets scheduled to post

---

## Project structure reference

```
backend/src/
├── index.js              ← Main server + cron jobs
├── lib/
│   ├── supabase.js       ← Database client
│   └── logger.js         ← Logging
├── middleware/
│   └── auth.js           ← JWT verification
├── modules/
│   ├── brand-scanner/    ← Website crawler + Claude AI extractor
│   ├── trend-engine/     ← NewsAPI + trend relevance scoring
│   ├── content-gen/      ← Claude AI post generation
│   ├── design-gen/       ← Canva API graphic generation
│   ├── queue-manager/    ← Approval workflow + notifications
│   ├── publisher/        ← Buffer API social publishing
│   └── analytics/        ← Engagement tracking + learning loop
└── routes/
    ├── auth.js            ← /api/auth/*
    ├── brand.js           ← /api/brand/*
    ├── onboarding.js      ← /api/onboarding/*
    ├── queue.js           ← /api/queue/*
    ├── schedule.js        ← /api/settings/*
    ├── analytics.js       ← /api/analytics/*
    ├── channels.js        ← /api/channels/*
    └── canva.js           ← /api/canva/*

frontend/src/
├── app/
│   ├── page.jsx                    ← Root redirect
│   ├── layout.jsx                  ← Root layout
│   ├── login/page.jsx              ← Login page
│   ├── signup/page.jsx             ← Signup page
│   ├── onboarding/page.jsx         ← Setup wizard
│   └── (dashboard)/                ← All authenticated pages
│       ├── layout.jsx              ← Sidebar + auth guard
│       ├── dashboard/page.jsx      ← Main dashboard
│       ├── queue/                  ← Post queue
│       │   ├── page.jsx            ← Queue list
│       │   └── [id]/page.jsx       ← Post detail/edit
│       ├── brand/page.jsx          ← Brand setup
│       ├── schedule/page.jsx       ← Schedule settings
│       ├── channels/page.jsx       ← Channel connections
│       ├── analytics/page.jsx      ← Analytics
│       ├── trends/page.jsx         ← Trend feed
│       └── canva/page.jsx          ← Canva templates
├── lib/
│   └── api.js                      ← Supabase + axios API client
├── hooks/
│   └── useAuth.js                  ← Auth state + hooks
└── components/
    └── layout/
        └── Sidebar.jsx             ← Navigation sidebar
```

---

## Deploying to production

**Backend (Railway):**
```bash
# Railway auto-deploys from GitHub
# Just push to main:
git add . && git commit -m "deploy" && git push
```

**Frontend (Vercel):**
```bash
# Vercel also auto-deploys from GitHub push
# No extra steps needed
```

**Update Buffer redirect URI for production:**
- Go to buffer.com/developers → your app
- Change redirect URI to: https://api.yourdomain.com/api/channels/buffer/callback
- Update BUFFER_REDIRECT_URI in Railway env vars

---

## Common issues

**"No brand profile found" error:**
→ Run the website scan first from Brand Setup page

**Canva graphics not generating:**
→ Canva Connect API requires manual approval. Check if your app is approved at canva.com/developers

**Posts not publishing:**
→ Check that Buffer is connected in Channels page and channels are toggled ON

**Trends not appearing:**
→ NewsAPI free tier has rate limits. Check NEWSAPI_KEY is set in .env

**Auth errors:**
→ Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct in frontend .env.local
