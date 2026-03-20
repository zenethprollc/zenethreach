# Zeneth Reach AI — Marketing Autopilot SaaS

## What This Is
A fully automated social media marketing platform. Give it your website URL, connect your social accounts, and it runs forever — finding trending news, generating branded posts with Canva graphics, and publishing to LinkedIn, Instagram, Facebook, and TikTok automatically.

---

## Quick Start (for your developer)

### 1. Install requirements
- Node.js 20+ (https://nodejs.org)
- npm (comes with Node.js)

### 2. Set up accounts (see docs/SETUP_ACCOUNTS.md)
You need API keys from: Anthropic, Supabase, Buffer, Canva, NewsAPI, Resend, OneSignal

### 3. Configure environment variables
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in all the values in both files
```

### 4. Set up the database
```bash
cd backend
npm install
npm run db:setup
```

### 5. Start the backend
```bash
cd backend
npm run dev
```

### 6. Start the frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

### 7. Open the app
Go to: http://localhost:3000

---

## Project Structure
```
zenethreach/
├── backend/          ← Node.js API server + all automation modules
│   ├── src/
│   │   ├── modules/
│   │   │   ├── brand-scanner/     ← Scans website, builds brand profile
│   │   │   ├── trend-engine/      ← Fetches trending news, scores relevance
│   │   │   ├── content-gen/       ← Generates post content with Claude AI
│   │   │   ├── design-gen/        ← Creates Canva graphics automatically
│   │   │   ├── queue-manager/     ← Handles approval workflow + notifications
│   │   │   ├── publisher/         ← Posts to all social platforms via Buffer
│   │   │   └── analytics/         ← Tracks engagement, feeds learning loop
│   │   ├── routes/                ← All API endpoints
│   │   ├── middleware/            ← Auth, error handling
│   │   └── lib/                   ← Shared utilities
│   └── config/                    ← Database schema, cron config
├── frontend/         ← Next.js dashboard
│   └── src/
│       ├── app/                   ← All pages
│       └── components/            ← Reusable UI components
└── docs/             ← Setup guides
```

---

## Support
Zeneth Pro LLC · reuben@zenethpro.com · zenethpro.com
