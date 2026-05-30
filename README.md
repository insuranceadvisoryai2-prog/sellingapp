# MeshSync: Meesho Product Scraper & AI Auto-Publisher

MeshSync is a premium full-stack web application that fetches product listings from Meesho product links, optimizes titles/descriptions using the Anthropic Claude API, auto-categorizes products, and publishes them into a beautiful local catalog catalog website.

## Core Features

- ⚡ **Lightweight & High-Performance Scraping**: Scrapes product data (images, details, original pricing, specifications) using a dual-path scraping engine. It targets Next.js client hydration states (`__NEXT_DATA__`) first, falling back to CSS selectors if needed.
- 🤖 **AI Copywriter & Auto-Categorizer**: Interfaces with the Anthropic Claude API (`claude-sonnet-4-20250514`) using a professional marketing system prompt to rewrite titles for SEO and write 2-sentence selling descriptions.
- 🌐 **Smart Heuristics Fallback**: If you do not have an API key, the system automatically falls back to an offline rule-based heuristic writer that parses details and creates titles/descriptions instantly, making the app fully operational offline.
- 📁 **Portable Catalog Persistence**: Saves published catalog listings to a local flat JSON database directory.
- 🎨 **Sleek Aesthetics**: A dark-mode, glassmorphism dashboard built with React and Tailwind CSS. It features side-by-side previews, search filtering, custom Lucide category navigation, and responsive layouts.

---

## Project Structure

```
meesho-scraper-republisher/
├── backend/
│   ├── data/             # Saved product database storage
│   ├── db.js             # Flat file JSON database helper
│   ├── scraper.js        # Axios + Next.js __NEXT_DATA__ scraper
│   ├── ai.js             # Anthropic SDK + offline marketing copy fallback
│   ├── server.js         # Express App and routes
│   └── .env              # Backend local environment configs
├── frontend/
│   ├── src/
│   │   ├── components/   # Dashboard, ProductCard, ProductGrid, Sidebar, PreviewModal
│   │   ├── App.jsx       # App logic and state manager
│   │   └── index.css     # Tailwind styling & Glassmorphism classes
│   └── vite.config.js    # Client build configurations
└── package.json          # Root manager to run client/server concurrently
```

---

## Setup & Launch Instructions

### Prerequisites

Make sure you have **Node.js** (v18 or higher) installed on your system.

### 1. Install Dependencies

Install all dependencies for the root, backend, and frontend with a single command:

```bash
# In the root project directory (meesho-scraper-republisher)
npm install
npm run install-all
```

### 2. Configure Environment Variables

Edit `backend/.env` with your API key if you want to use the live Claude AI assistant.

```env
PORT=5000
ANTHROPIC_API_KEY=your_actual_anthropic_api_key
```

*Note: If `ANTHROPIC_API_KEY` is left blank, the app will gracefully run in **Offline Mock Mode**, generating simulated SEO titles and marketing copy dynamically.*

### 3. Run the Application

Start both the backend server and the Vite dev server concurrently:

```bash
npm run dev
```

- **Frontend client** will run on: `http://localhost:5173`
- **Backend API server** will run on: `http://localhost:5000`

---

## How to Use

1. Go to `http://localhost:5173` in your browser.
2. Open Meesho (app or web) and copy a product detail URL.
   *Example: `https://www.meesho.com/men-striped-round-neck-cotton-blend-popcorn-t-shirts/p/6nzkc`*
3. Paste the URL into the search box on the Dashboard and click **Fetch & Rewrite**.
4. The scraper will extract specifications and images. The AI will output rewritten copy and detect categories.
5. Review the side-by-side preview. Customize the title, description, or subcategory drop-down directly in the AI card if desired.
6. Click **Publish to Catalog**.
7. Navigate to the **Catalog** tab to view, search, filter, and inspect detailed specification sheets for your republished products.
