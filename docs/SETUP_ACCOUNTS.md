# ZENETH REACH AI — ACCOUNT SETUP GUIDE

Follow these steps BEFORE starting development.
Each service below takes 5–15 minutes to set up.

---

## 1. SUPABASE (Database — FREE to start)
→ Go to: https://supabase.com
1. Click "Start your project" → sign up
2. Create a new project (any name, e.g. "zenethreach")
3. Set a strong database password — SAVE IT
4. Wait ~2 minutes for project to provision
5. Go to: Settings → API
6. Copy:
   - Project URL → SUPABASE_URL
   - anon/public key → SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_ROLE_KEY
7. Go to: SQL Editor → New Query
8. Paste the contents of: backend/config/schema.sql
9. Click "Run" — all tables are created ✓

---

## 2. ANTHROPIC / CLAUDE AI (~$10 to start)
→ Go to: https://console.anthropic.com
1. Sign up / log in
2. Go to: Settings → API Keys
3. Click "Create Key" → copy it → ANTHROPIC_API_KEY
4. Go to: Billing → Add payment method
5. Add $10 credit (enough for thousands of posts)

---

## 3. BUFFER (Social publishing — ~$18/mo)
→ Go to: https://buffer.com
1. Create a Buffer account
2. Connect your LinkedIn, Instagram, Facebook, TikTok accounts in Buffer
3. Go to: https://buffer.com/developers/apps
4. Click "Create an App"
   - Name: Zeneth Reach AI
   - Redirect URI: http://localhost:4000/api/channels/buffer/callback
   - (For production: https://api.yourdomain.com/api/channels/buffer/callback)
5. Copy:
   - Client ID → BUFFER_CLIENT_ID
   - Client Secret → BUFFER_CLIENT_SECRET

---

## 4. CANVA (Graphics — FREE tier available)
→ Go to: https://www.canva.com/developers
⚠️  IMPORTANT: Apply for Canva Connect API access FIRST — approval takes 1–2 weeks
1. Go to: https://www.canva.com/developers
2. Click "Get started" → fill out the application form
3. While waiting for approval, you can build everything else
4. Once approved, go to Developer Portal → Create App
   - App name: Zeneth Reach AI
   - Redirect URI: http://localhost:4000/api/canva/callback
5. Copy:
   - Client ID → CANVA_CLIENT_ID
   - Client Secret → CANVA_CLIENT_SECRET

### Setting up Canva templates (after connecting):
1. Open Canva → Create a design → Choose "Instagram Post (1080x1080)"
2. Design your branded template (your colors, logo, fonts)
3. Add a Text element, click it, go to "Edit" → rename it to: HEADLINE
4. Add another Text element → rename it to: SUBHEADLINE
5. Save the template — the system auto-fills these fields for each post

---

## 5. NEWSAPI (Trends — FREE for development)
→ Go to: https://newsapi.org
1. Click "Get API Key" → register
2. Copy your API key → NEWSAPI_KEY
Note: Free plan works for development. For production with many users, upgrade to Business plan.

---

## 6. RITETAG (Hashtags — $49/mo)
→ Go to: https://ritetag.com
1. Sign up → choose API plan
2. Go to Account → API → copy your token → RITETAG_API_KEY
Note: Optional — the system has fallback hashtag generation if RiteTag is not connected.

---

## 7. RESEND (Email notifications — FREE to start)
→ Go to: https://resend.com
1. Sign up → verify your email
2. Add your domain: zenethpro.com (follow DNS verification steps)
3. Go to: API Keys → Create API Key
4. Copy → RESEND_API_KEY
5. Set FROM_EMAIL=noreply@zenethpro.com

---

## 8. ONESIGNAL (Push notifications — FREE)
→ Go to: https://onesignal.com
1. Sign up → Create new app
2. Choose "Web Push" → follow setup wizard
3. Go to: Settings → Keys & IDs
4. Copy:
   - App ID → ONESIGNAL_APP_ID
   - REST API Key → ONESIGNAL_API_KEY

---

## 9. RAILWAY (Backend hosting — ~$5/mo)
→ Go to: https://railway.app
1. Sign up → connect GitHub account
2. Create new project → "Deploy from GitHub repo"
3. Select your repository → select the /backend folder
4. Add all environment variables from backend/.env
5. Railway auto-deploys on every push to main branch

---

## 10. VERCEL (Frontend hosting — FREE)
→ Go to: https://vercel.com
1. Sign up → connect GitHub account
2. "Import Project" → select your repository → select /frontend folder
3. Add environment variables from frontend/.env.local
4. Vercel auto-deploys on every push to main branch

---

## SUMMARY CHECKLIST

- [ ] Supabase project created + schema.sql run
- [ ] Anthropic API key obtained + billing added
- [ ] Buffer app created + social accounts connected in Buffer
- [ ] Canva developer application submitted (do this TODAY — takes 1-2 weeks)
- [ ] NewsAPI key obtained
- [ ] RiteTag subscription started (optional)
- [ ] Resend domain verified + API key obtained
- [ ] OneSignal app created
- [ ] Railway project created + env vars added
- [ ] Vercel project created + env vars added

Total estimated monthly cost at launch: ~$150-200/mo
(Buffer ~$50 + Railway ~$5 + Vercel free + Supabase free + Anthropic ~$20-50 + RiteTag $49)
