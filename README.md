# WholesaleMartIndia — Deployment Guide

## Stack
- **Frontend**: React + Vite → Vercel
- **Backend**: Node.js + Express → Render
- **Database**: PostgreSQL → Neon.tech (free, IPv4, works on Render)

---

## Step 1 — Neon Database (5 min, free)

1. Go to **neon.tech** → Sign up with Google
2. New Project → name: `wholesalemartindia`
3. Copy the connection string shown:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save it — you'll need it in Step 3

---

## Step 2 — Push to GitHub

Replace all files in your repo `insuranceadvisoryai2-prog/sellingapp` with these files.

Or create a new repo and push:
```bash
git init
git add .
git commit -m "Complete WholesaleMartIndia app"
git remote add origin https://github.com/YOUR_USERNAME/wholesalemartindia.git
git push -u origin main
```

---

## Step 3 — Render (Backend)

1. Go to **render.com** → your service → **Environment**
2. Add these variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string from Step 1 |
| `JWT_SECRET` | Any 64+ char random string |
| `FRONTEND_URL` | `https://sellingapp-lake.vercel.app` |
| `NODE_ENV` | `production` |

3. Settings:
   - **Build Command**: `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend`
   - **Start Command**: `node backend/server.js`
   - **Root Directory**: *(leave blank)*

---

## Step 4 — Create Admin User

After Render deploys, go to your API URL and run this once:

```bash
curl -X POST https://sellingapp-nued.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"adminRushi","email":"admin@wholesalemart.in","password":"YourSecurePassword"}'
```

Then in Neon dashboard → SQL Editor → run:
```sql
UPDATE users SET role = 'admin' WHERE username = 'adminRushi';
```

---

## Step 5 — Vercel (Frontend)

Your frontend is already on Vercel. No changes needed since the backend serves the built frontend.

If you want a separate Vercel deployment:
1. Vercel → Import from GitHub → select `frontend` folder
2. Add env var: `VITE_API_URL=https://sellingapp-nued.onrender.com`

---

## Using the Admin Dashboard

1. Login at `sellingapp-lake.vercel.app/login` with your admin credentials
2. Click **Admin** in the navbar
3. Go to **Scraper** tab
4. Enter a query like "cotton sarees" or "mobile cases"
5. Select Meesho and/or IndiaMart
6. Click **Start Scraping**
7. Wait ~1 minute → products appear in your store automatically

---

## File Structure

```
wholesalemartindia/
├── backend/
│   ├── server.js      ← Express API
│   ├── db.js          ← Neon PostgreSQL (all DB functions)
│   ├── scraper.js     ← Meesho + IndiaMart scraper
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Routes + Auth context
│   │   ├── pages/           ← Home, Products, Cart, Orders, Login, Admin
│   │   ├── components/      ← Navbar, ProductCard
│   │   └── utils/api.js     ← All API calls
│   ├── index.html
│   └── package.json
├── package.json       ← Root scripts
├── .env.example       ← Template for env vars
└── .gitignore
```
