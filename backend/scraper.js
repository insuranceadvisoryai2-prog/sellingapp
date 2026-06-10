// scraper.js — URL-based + keyword scraping using fetch
import https from 'https';
import http from 'http';

// ── FETCH HELPER ──────────────────────────────────────────────────────────────
async function fetchWithHeaders(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Referer': 'https://www.google.com/',
      ...extraHeaders,
    }
  });
  return res;
}

// ── DETECT IF INPUT IS URL OR KEYWORD ────────────────────────────────────────
export function isUrl(input) {
  return input.startsWith('http://') || input.startsWith('https://') || input.includes('meesho.com') || input.includes('indiamart.com');
}

// ── SCRAPE SINGLE MEESHO PRODUCT URL ─────────────────────────────────────────
export async function scrapeMeeshoProduct(url) {
  console.log(`🔍 Scraping Meesho product URL: ${url}`);
  try {
    const res = await fetchWithHeaders(url);
    const html = await res.text();

    // Extract __NEXT_DATA__ JSON
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) throw new Error('Could not find product data in page');

    const json = JSON.parse(match[1]);
    const props = json?.props?.pageProps;

    // Try different data paths Meesho uses
    const product = props?.product || props?.productData || props?.data?.product || props?.initialData?.product;

    if (!product) {
      // Try extracting from meta tags
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      const priceMatch = html.match(/"price":\s*"?(\d+(?:\.\d+)?)"?/);

      if (titleMatch) {
        return [{
          name: titleMatch[1].replace(' - Meesho', '').trim(),
          description: descMatch?.[1] || '',
          price: parseFloat(priceMatch?.[1] || 0),
          original_price: parseFloat(priceMatch?.[1] || 0) * 1.2,
          image_url: imageMatch?.[1] || '',
          images: imageMatch?.[1] ? [imageMatch[1]] : [],
          category: 'Meesho Products',
          source_url: url,
          source_site: 'meesho',
          stock: 999, min_order: 1, unit: 'piece',
        }];
      }
      throw new Error('Product data not found');
    }

    const name = product.name || product.product_name || product.title;
    const price = parseFloat(product.current_price || product.price?.mrp || product.mrp || 0);
    const original = parseFloat(product.original_price || product.price?.original || price * 1.2);

    // Get all images
    const rawImages = product.images || product.product_images || [];
    const images = rawImages.map(img =>
      typeof img === 'string' ? img : (img.url || img.image_url || img.src || '')
    ).filter(Boolean);

    const variants = product.variants || product.product_variants || [];

    return [{
      name,
      description: product.description || product.product_description || `${name} - Available on WholesaleMartIndia`,
      price,
      original_price: original,
      discount_pct: original > price ? Math.round((1 - price/original)*100) : 0,
      image_url: images[0] || '',
      images,
      category: product.primary_category || product.category || 'Meesho Products',
      subcategory: product.sub_category || '',
      brand: product.brand_name || product.supplier_name || '',
      specifications: product.product_attributes || {},
      source_url: url,
      source_site: 'meesho',
      stock: 999,
      min_order: 1,
      unit: 'piece',
    }];
  } catch (err) {
    console.error('❌ Meesho URL scrape failed:', err.message);
    return [];
  }
}

// ── SCRAPE SINGLE INDIAMART PRODUCT URL ──────────────────────────────────────
export async function scrapeIndiaMartProduct(url) {
  console.log(`🔍 Scraping IndiaMart product URL: ${url}`);
  try {
    const res = await fetchWithHeaders(url);
    const html = await res.text();

    const titleMatch = html.match(/<h1[^>]*class="[^"]*prod-name[^"]*"[^>]*>([^<]+)<\/h1>/) ||
                       html.match(/<title>([^<]+)<\/title>/);
    const priceMatch = html.match(/class="[^"]*price[^"]*"[^>]*>[\s₹]*([0-9,]+)/) ||
                       html.match(/"price":\s*"?(\d+)"?/);
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

    // Extract all product images
    const imageMatches = [...html.matchAll(/data-src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*class="[^"]*prod-img/gi)];
    const images = imageMatches.map(m => m[1]).filter(Boolean);
    if (imageMatch?.[1] && !images.includes(imageMatch[1])) images.unshift(imageMatch[1]);

    const name = titleMatch?.[1]?.replace(' - IndiaMART', '').trim();
    const price = parseFloat((priceMatch?.[1] || '0').replace(/,/g, ''));

    if (!name) throw new Error('Could not extract product name');

    return [{
      name,
      description: descMatch?.[1] || `${name} - WholesaleMartIndia`,
      price: price || 100,
      original_price: price ? Math.round(price * 1.3) : 130,
      discount_pct: 23,
      image_url: images[0] || '',
      images,
      category: 'IndiaMart Products',
      source_url: url,
      source_site: 'indiamart',
      stock: 999,
      min_order: 10,
      unit: 'pieces',
    }];
  } catch (err) {
    console.error('❌ IndiaMart URL scrape failed:', err.message);
    return [];
  }
}

// ── SCRAPE BY KEYWORD — MEESHO ────────────────────────────────────────────────
export async function scrapeMeeshoKeyword(query, maxProducts = 30) {
  console.log(`🔍 Scraping Meesho keyword: "${query}"`);
  const products = [];
  try {
    // Try Meesho search page and extract __NEXT_DATA__
    const res = await fetchWithHeaders(`https://www.meesho.com/search?q=${encodeURIComponent(query)}`);
    const html = await res.text();

    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (match) {
      const json = JSON.parse(match[1]);
      const items =
        json?.props?.pageProps?.searchData?.products ||
        json?.props?.pageProps?.products ||
        json?.props?.pageProps?.data?.products || [];

      for (const item of items.slice(0, maxProducts)) {
        const price = parseFloat(item.current_price || item.price?.mrp || item.mrp || 0);
        const original = parseFloat(item.original_price || item.mrp || price * 1.2);
        const imgs = (item.images || []).map(i => typeof i === 'string' ? i : (i.url || '')).filter(Boolean);

        if (!item.name && !item.product_name) continue;

        products.push({
          name: item.name || item.product_name,
          description: item.description || `${item.name || item.product_name} - WholesaleMartIndia`,
          price,
          original_price: original,
          discount_pct: item.discount_percent || (original > price ? Math.round((1-price/original)*100) : 0),
          image_url: imgs[0] || item.cover_image || '',
          images: imgs,
          category: item.primary_category || query,
          subcategory: item.sub_category || '',
          brand: item.brand_name || '',
          source_url: `https://www.meesho.com/p/${item.product_id || item.id}`,
          source_site: 'meesho',
          stock: 999, min_order: 1, unit: 'piece',
        });
      }
    }
    console.log(`✅ Meesho keyword "${query}": ${products.length} products`);
  } catch (err) {
    console.error('❌ Meesho keyword scrape failed:', err.message);
  }
  return products.filter(p => p.name && p.price > 0);
}

// ── SCRAPE BY KEYWORD — INDIAMART ─────────────────────────────────────────────
export async function scrapeIndiaMartKeyword(query, maxProducts = 30) {
  console.log(`🔍 Scraping IndiaMart keyword: "${query}"`);
  const products = [];
  try {
    const res = await fetch(
      `https://dir.indiamart.com/jsonsearch/search.mp?ss=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'Accept': 'application/json', 'Referer': 'https://www.indiamart.com/' } }
    );
    if (res.ok) {
      const data = await res.json();
      const items = data?.data || data?.products || [];
      for (const item of items.slice(0, maxProducts)) {
        const price = parseFloat((item.MIN_PRICE || item.price || '0').toString().replace(/[^0-9.]/g, '')) || 0;
        const imgs = item.IMG ? (Array.isArray(item.IMG) ? item.IMG : [item.IMG]) : [];
        if (!item.PRODUCT_NAME && !item.name) continue;
        products.push({
          name: item.PRODUCT_NAME || item.name,
          description: item.PROD_DESC || `Wholesale ${item.PRODUCT_NAME} - WholesaleMartIndia`,
          price: price || 100,
          original_price: price ? Math.round(price * 1.3) : 130,
          discount_pct: 23,
          image_url: imgs[0] || '',
          images: imgs,
          category: item.CATNAME || query,
          subcategory: item.SUB_CATNAME || '',
          brand: item.SUPPLIER_NAME || item.COMP_NAME || '',
          source_url: item.PRODUCT_URL || '',
          source_site: 'indiamart',
          stock: 999,
          min_order: parseInt(item.MOQ || '10') || 10,
          unit: item.UOM || 'pieces',
        });
      }
    }
    console.log(`✅ IndiaMart keyword "${query}": ${products.length} products`);
  } catch (err) {
    console.error('❌ IndiaMart keyword scrape failed:', err.message);
  }
  return products.filter(p => p.name && p.price > 0);
}

// ── GENERATE REALISTIC SAMPLE PRODUCTS (fallback) ────────────────────────────
export function generateSampleProducts(query, count = 20) {
  console.log(`📦 Generating sample products for: "${query}"`);
  const sampleImages = {
    shoes: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400'],
    saree: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400', 'https://images.unsplash.com/photo-1617627143233-4cc887fcb8ad?w=400'],
    mobile: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400'],
    default: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'],
  };
  const q = query.toLowerCase();
  const imgs = sampleImages[Object.keys(sampleImages).find(k => q.includes(k))] || sampleImages.default;
  const products = [];
  const prefixes = ['Premium', 'Classic', 'Wholesale', 'Bulk Pack', 'Export Quality', 'Designer', 'Handmade', 'Organic'];
  const sites = ['meesho', 'indiamart'];

  for (let i = 0; i < count; i++) {
    const price = Math.floor(Math.random() * 1500) + 99;
    const original = Math.round(price * (1.15 + Math.random() * 0.4));
    products.push({
      name: `${query} ${prefixes[i % prefixes.length]} #${i + 1}`,
      description: `High quality wholesale ${query}. Perfect for bulk buyers and retailers. Available in multiple colors and sizes. Direct from manufacturer at best wholesale prices in India.`,
      price, original_price: original,
      discount_pct: Math.round((1 - price/original)*100),
      image_url: imgs[i % imgs.length],
      images: imgs,
      category: query, brand: `WMI Wholesale`,
      source_url: '#', source_site: sites[i % 2],
      stock: Math.floor(Math.random()*500)+100,
      min_order: sites[i%2]==='indiamart' ? 10 : 1,
      unit: 'pieces',
    });
  }
  return products;
}

// ── MAIN SCRAPE FUNCTION ──────────────────────────────────────────────────────
export async function scrapeAll(query, sites = ['meesho', 'indiamart']) {
  const results = [];
  const queryIsUrl = isUrl(query);

  if (queryIsUrl) {
    // Scrape specific product URL
    if (query.includes('meesho.com')) {
      const p = await scrapeMeeshoProduct(query);
      results.push(...p);
    } else if (query.includes('indiamart.com')) {
      const p = await scrapeIndiaMartProduct(query);
      results.push(...p);
    }
  } else {
    // Scrape by keyword
    if (sites.includes('meesho')) {
      const p = await scrapeMeeshoKeyword(query, 25);
      results.push(...p);
    }
    if (sites.includes('indiamart')) {
      const p = await scrapeIndiaMartKeyword(query, 25);
      results.push(...p);
    }
  }

  // Fallback to sample products if nothing scraped
  if (results.length === 0) {
    console.log('⚠️ Live scraping returned nothing, using sample products...');
    const keyword = queryIsUrl ? query.split('/').filter(Boolean).pop() || 'product' : query;
    results.push(...generateSampleProducts(keyword, 20));
  }

  return results;
}
