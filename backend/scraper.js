// scraper.js — Meesho + IndiaMart product scraper using Puppeteer Stealth
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const BROWSER_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox',
  '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
  '--no-first-run', '--no-zygote', '--disable-gpu',
  '--window-size=1280,800',
];

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: BROWSER_ARGS,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
}

// ── MEESHO SCRAPER ────────────────────────────────────────────────────────────
export async function scrapeMeesho(query, maxProducts = 40) {
  console.log(`🔍 Scraping Meesho for: "${query}"`);
  const browser = await launchBrowser();
  const products = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    const url = `https://www.meesho.com/search?q=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Scroll to load more products
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }

    const items = await page.evaluate((max) => {
      const cards = document.querySelectorAll('[data-testid="product-container"], .sc-dkrFOg, div[class*="ProductList"]');
      const results = [];

      cards.forEach((card, idx) => {
        if (idx >= max) return;
        try {
          const name = card.querySelector('p[class*="ProductTitle"], h5, [class*="product-title"]')?.textContent?.trim();
          const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
          const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '');
          const price = parseFloat(priceText) || 0;
          const imgEl = card.querySelector('img');
          const image_url = imgEl?.src || imgEl?.getAttribute('data-src') || '';
          const linkEl = card.querySelector('a');
          const href = linkEl?.href || '';

          if (name && price > 0) {
            results.push({ name, price, image_url, source_url: href });
          }
        } catch {}
      });
      return results;
    }, maxProducts);

    for (const item of items) {
      products.push({
        name: item.name,
        description: `${item.name} - Available on WholesaleMartIndia`,
        price: item.price,
        original_price: Math.round(item.price * 1.2),
        discount_pct: 17,
        image_url: item.image_url,
        images: item.image_url ? [item.image_url] : [],
        category: query,
        source_url: item.source_url,
        source_site: 'meesho',
        stock: 999,
        min_order: 1,
      });
    }

    console.log(`✅ Meesho: found ${products.length} products`);
  } catch (err) {
    console.error(`❌ Meesho scrape failed:`, err.message);
  } finally {
    await browser.close();
  }

  return products;
}

// ── INDIAMART SCRAPER ─────────────────────────────────────────────────────────
export async function scrapeIndiaMart(query, maxProducts = 40) {
  console.log(`🔍 Scraping IndiaMart for: "${query}"`);
  const browser = await launchBrowser();
  const products = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    const url = `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }

    const items = await page.evaluate((max) => {
      const cards = document.querySelectorAll('.list-card-ui, .organic-card, [class*="product-card"]');
      const results = [];

      cards.forEach((card, idx) => {
        if (idx >= max) return;
        try {
          const name = card.querySelector('.producttitle, h3, .pname')?.textContent?.trim();
          const priceEl = card.querySelector('.price, .lcprice, [class*="price"]');
          const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '');
          const price = parseFloat(priceText) || 0;
          const imgEl = card.querySelector('img');
          const image_url = imgEl?.src || imgEl?.getAttribute('data-src') || '';
          const linkEl = card.querySelector('a');
          const href = linkEl?.href || '';
          const brand = card.querySelector('.companyname, .supplier')?.textContent?.trim() || '';

          if (name && price > 0) {
            results.push({ name, price, image_url, source_url: href, brand });
          }
        } catch {}
      });
      return results;
    }, maxProducts);

    for (const item of items) {
      products.push({
        name: item.name,
        description: `Wholesale ${item.name} by ${item.brand || 'Supplier'} - WholesaleMartIndia`,
        price: item.price,
        original_price: Math.round(item.price * 1.3),
        discount_pct: 23,
        image_url: item.image_url,
        images: item.image_url ? [item.image_url] : [],
        category: query,
        brand: item.brand,
        source_url: item.source_url,
        source_site: 'indiamart',
        stock: 999,
        min_order: 10,
        unit: 'pieces',
      });
    }

    console.log(`✅ IndiaMart: found ${products.length} products`);
  } catch (err) {
    console.error(`❌ IndiaMart scrape failed:`, err.message);
  } finally {
    await browser.close();
  }

  return products;
}

// ── COMBINED SCRAPER ──────────────────────────────────────────────────────────
export async function scrapeAll(query, sites = ['meesho', 'indiamart']) {
  const results = [];
  if (sites.includes('meesho')) {
    const p = await scrapeMeesho(query, 30);
    results.push(...p);
  }
  if (sites.includes('indiamart')) {
    const p = await scrapeIndiaMart(query, 30);
    results.push(...p);
  }
  return results;
}
