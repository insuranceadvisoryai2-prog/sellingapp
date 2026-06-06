const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// â”€â”€â”€ Try to use Puppeteer with Stealth if available â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let puppeteer = null;
let StealthPlugin = null;
try {
  puppeteer = require('puppeteer-extra');
  StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());
  console.log('âœ… Puppeteer+Stealth loaded successfully');
} catch (e) {
  console.log('âš ï¸ Puppeteer not available, using HTTP-only mode');
}

// Find Chrome on this system
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];
const CHROME_PATH = CHROME_PATHS.find(p => fs.existsSync(p));

// â”€â”€â”€ Browser-like headers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'Origin': 'https://www.meesho.com',
  'Referer': 'https://www.meesho.com/',
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Referer': 'https://www.google.com/',
};

// â”€â”€â”€ Extract product ID from Meesho URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractProductId(url) {
  const patterns = [/\/p\/([a-zA-Z0-9]+)/, /\/s\/p\/([a-zA-Z0-9]+)/, /\/product\/([a-zA-Z0-9]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// â”€â”€â”€ Parse numeric price from various formats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function parsePrice(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const m = String(val).replace(/,/g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

// â”€â”€â”€ Deep search for product data in nested JSON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractSlug(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const pIndex = parts.indexOf('p');
    if (pIndex > 0) return parts[pIndex - 1];
    return parts[0] || '';
  } catch (error) {
    const match = String(url).match(/meesho\.com\/([^/]+)\/p\//i);
    return match ? match[1] : '';
  }
}

function wordsFromSlug(slug) {
  return String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(word => word && !['and', 'for', 'with', 'the', 'of', 'new', 'latest'].includes(word));
}

function titleFromSlug(slug) {
  return String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function decodePriceMetadata(raw = {}) {
  const encoded = raw.app_event_data?.price_metadata;
  if (!encoded || typeof encoded !== 'string') return {};
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch (error) {
    return {};
  }
}

function pickPriceInfo(raw = {}) {
  const meta = decodePriceMetadata(raw);
  const basePrice = parsePrice(meta.servingPrice || raw.min_product_price || raw.min_catalog_price || raw.price || raw.discounted_price || raw.mrp);
  const codPrice = parsePrice(meta.diffDiscountingDsInstrumentationData?.codServingPrice || meta.codPrice);
  const strikePrice = parsePrice(meta.strikeOffPrice || raw.original_price || raw.mrp || raw.max_product_price || basePrice);
  const offerPrice = parsePrice(raw.special_offers?.display_text);
  const shippingCharge = parsePrice(meta.shippingCharge);

  return {
    price: basePrice,
    originalPrice: Math.max(strikePrice, basePrice),
    basePrice,
    offerPrice,
    shippingCharge,
    codPrice,
  };
}

function scoreCatalog(catalog, targetSlug, productId) {
  if (!catalog) return 0;
  if (productId && String(catalog.product_id || '').toLowerCase() === productId.toLowerCase()) return 1;
  const catalogSlug = String(catalog.slug || catalog.original_slug || '').toLowerCase();
  if (targetSlug && catalogSlug === targetSlug.toLowerCase()) return 0.98;
  const words = wordsFromSlug(targetSlug);
  if (!words.length) return 0;
  const haystack = [catalogSlug, catalog.name, catalog.hero_product_name, catalog.description, catalog.full_details]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.filter(word => haystack.includes(word)).length / words.length;
}
function deepFindProduct(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 20) return null;

  // Check if this object looks like a product
  const hasName = obj.name || obj.title || obj.product_name;
  const hasPrice = obj.price !== undefined || obj.mrp !== undefined || obj.discounted_price !== undefined || obj.min_product_price !== undefined;
  if (hasName && hasPrice) return obj;

  for (const key of Object.keys(obj)) {
    const found = deepFindProduct(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

// â”€â”€â”€ Extract ALL images from product object â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractAllImages(obj) {
  const images = new Set();

  function scan(o, depth = 0) {
    if (!o || typeof o !== 'object' || depth > 10) return;
    
    // Check array fields that commonly hold images
    const imageArrayKeys = ['images', 'product_images', 'catalog_images', 'catalogImages', 'productImages', 'gallery', 'photos'];
    for (const key of imageArrayKeys) {
      if (o[key] && Array.isArray(o[key])) {
        o[key].forEach(item => {
          if (typeof item === 'string' && item.startsWith('http')) images.add(item);
          else if (item && typeof item === 'object') {
            const src = item.url || item.original || item.src || item.image || item.imageUrl;
            if (src && typeof src === 'string' && src.startsWith('http')) images.add(src);
          }
        });
      }
    }

    // Check string fields that might be image URLs
    const singleImageKeys = ['image', 'hero_image', 'main_image', 'primary_image', 'thumbnail', 'imageUrl', 'image_url', 'default_image'];
    for (const key of singleImageKeys) {
      if (o[key] && typeof o[key] === 'string' && o[key].startsWith('http')) {
        images.add(o[key]);
      }
    }

    // Scan all values looking for image-like URLs
    for (const key of Object.keys(o)) {
      const val = o[key];
      if (typeof val === 'string' && val.startsWith('http') && (val.includes('.jpg') || val.includes('.png') || val.includes('.webp') || val.includes('images.meesho.com'))) {
        images.add(val);
      }
      if (typeof val === 'object') {
        scan(val, depth + 1);
      }
    }
  }

  scan(obj);

  // Clean up: remove _512 thumbnails to get full resolution
  return [...images].map(url => url.replace(/_\d+\.jpg/g, '.jpg').replace(/_\d+\.png/g, '.png'));
}

// â”€â”€â”€ Extract specifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractSpecs(obj) {
  const specs = {};
  if (!obj) return specs;

  // Direct specs object
  if (obj.specifications && typeof obj.specifications === 'object' && !Array.isArray(obj.specifications)) {
    Object.assign(specs, obj.specifications);
  }

  // Array of { key, value } pairs
  const specKeys = ['specifications', 'specs', 'product_details_info', 'product_attributes', 'attributes', 'variation_attributes'];
  for (const k of specKeys) {
    if (obj[k] && Array.isArray(obj[k])) {
      obj[k].forEach(item => {
        const name = item.key || item.name || item.label || item.attribute_name;
        const val = item.value || item.attribute_value;
        if (name && val) specs[name] = val;
      });
    }
  }

  return specs;
}

// â”€â”€â”€ Build clean product data from raw product object â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildProductData(raw, sourceUrl) {
  const title = raw.hero_product_name || raw.name || raw.title || raw.product_name || raw.description || '';
  const priceInfo = pickPriceInfo(raw);
  const images = extractAllImages(raw);
  const description = raw.full_details || raw.description || raw.product_description || raw.product_details || raw.share_text || '';
  const specs = extractSpecs(raw);
  const category = raw.sub_sub_category_name || raw.category_name || raw.subcategory || raw.category || '';
  const rating = raw.rating || raw.average_rating || raw.product_rating || raw.catalog_reviews_summary?.average_rating_str || '';

  if (rating) specs['Rating'] = String(rating);
  const productId = extractProductId(sourceUrl);
  if (productId) specs['Supplier Product ID'] = String(productId);
  if (raw.catalog_id || raw.catalogId || raw.id) specs['Supplier Catalog ID'] = String(raw.catalog_id || raw.catalogId || raw.id);
  if (raw.supplier_id || raw.supplier) specs['Supplier ID'] = String(raw.supplier_id || raw.supplier);
  if (priceInfo.offerPrice && priceInfo.offerPrice < priceInfo.price) specs['Special Offer Price'] = `₹${priceInfo.offerPrice}`;
  if (priceInfo.basePrice && priceInfo.basePrice !== priceInfo.price) specs['Base Product Price'] = `₹${priceInfo.basePrice}`;
  if (priceInfo.shippingCharge) specs['Shipping Included'] = `₹${priceInfo.shippingCharge}`;

  return {
    title: String(title).trim(),
    price: priceInfo.price,
    originalPrice: `₹${priceInfo.originalPrice || priceInfo.price || 0}`,
    images,
    description,
    specifications: specs,
    category_hint: category,
    source: raw.__source || 'supplier',
  };
}

// ————————————————————————————————————————————————————————————————————————————
// METHOD 1: Puppeteer with Stealth (most reliable — uses real Chrome)
// ————————————————————————————————————————————————————————————————————————————
async function tryPuppeteerScrape(url) {
  if (!puppeteer || !CHROME_PATH) return null;
  console.log('  → [Method 1] Launching real Chrome with stealth...');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // Navigate and wait for network to settle
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    console.log(`     Status: ${response.status()}`);

    // If we hit an Akamai challenge, wait for it to auto-resolve
    let content = await page.content();
    if (content.includes('sec-if-cpt-container') || content.includes('akamai')) {
      console.log('     Akamai challenge detected, waiting for auto-resolve...');
      await page.waitForFunction(() => {
        return document.querySelector('#__NEXT_DATA__') !== null || document.querySelector('h1') !== null;
      }, { timeout: 20000 }).catch(() => {});
      content = await page.content();
    }

    // Try to extract __NEXT_DATA__ from the page
    const nextDataJson = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? el.textContent : null;
    });

    if (nextDataJson) {
      console.log('  ✅ [Method 1] Got __NEXT_DATA__ via Puppeteer');
      const parsed = JSON.parse(nextDataJson);
      const raw = deepFindProduct(parsed);
      if (raw) {
        return buildProductData(raw, url);
      }
    }

    // Fallback: extract data from the rendered DOM directly
    console.log('     Trying DOM extraction...');
    const domData = await page.evaluate(() => {
      const title = document.querySelector('h1, span[class*="ProductName"], p[class*="Title"]')?.textContent?.trim();
      const priceEl = document.querySelector('h4[class*="Price"], span[class*="Price"], h3[class*="Price"]');
      const price = priceEl?.textContent?.trim();

      const imgs = [];
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.dataset?.src;
        if (src && src.includes('images.meesho.com')) imgs.push(src);
      });

      let description = '';
      document.querySelectorAll('div[class*="Description"], p[class*="Description"], span[class*="detail"]').forEach(el => {
        description += el.textContent.trim() + '\n';
      });

      return { title, price, imgs, description };
    });

    if (domData.title) {
      console.log(`  ✅ [Method 1] Extracted from DOM: "${domData.title}"`);
      const imgsCleaned = domData.imgs.map(u => u.replace(/_\d+\.jpg/g, '.jpg'));
      return {
        title: domData.title,
        price: parsePrice(domData.price),
        originalPrice: domData.price || '₹0',
        images: imgsCleaned,
        description: domData.description || '',
        specifications: {},
        category_hint: '',
      };
    }

    return null;
  } catch (err) {
    console.log(`  ⚠ [Method 1] Puppeteer error: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ————————————————————————————————————————————————————————————————————————————
// METHOD 1.5: Extract from JSON-LD structured data (most reliable for Meesho)
// ————————————————————————————————————————————————————————————————————————————
async function tryLdJsonScrape(url) {
  console.log('  → [Method 1.5] JSON-LD structured data extraction...');
  try {
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: s => s < 500,
    });

    if (response.status === 403) {
      console.log('  ⚠ [Method 1.5] 403 Forbidden');
      return null;
    }

    const html = response.data;
    const $ = cheerio.load(html);

    // --- Extract JSON-LD structured data ---
    let productLd = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'Product') {
          productLd = data;
        } else if (Array.isArray(data)) {
          const found = data.find(d => d['@type'] === 'Product');
          if (found) productLd = found;
        }
      } catch (e) { /* skip invalid JSON */ }
    });

    if (!productLd || !productLd.name) {
      console.log('  ⚠ [Method 1.5] No Product JSON-LD found');
      return null;
    }

    console.log(`  ✅ [Method 1.5] Found JSON-LD Product: "${productLd.name}"`);

    // Extract title
    const title = productLd.name || '';

    // Extract images from JSON-LD
    let images = [];
    if (productLd.image) {
      const imgArr = Array.isArray(productLd.image) ? productLd.image : [productLd.image];
      images = imgArr.map(img => {
        if (typeof img === 'string') return img;
        if (img && img.url) return img.url;
        return null;
      }).filter(Boolean);
    }

    // Convert .avif to .webp for wider browser support, and try to get higher-res versions
    images = images.map(img => {
      let cleaned = img.replace(/\?width=\d+/g, '');
      // Try to get higher res by replacing _512 with _1200
      cleaned = cleaned.replace(/_512\./g, '_1200.');
      return cleaned;
    });

    // Also scan HTML for additional meesho CDN images
    const cdnRegex = /https:\/\/images\.meesho\.com\/images\/products\/[^\s"'>\)]+/g;
    const cdnMatches = html.match(cdnRegex) || [];
    for (const match of cdnMatches) {
      let clean = match.replace(/\\/g, '').split(/["')>\s]/)[0];
      if (clean && !images.some(existing => existing.includes(clean.split('?')[0].split('_')[0]))) {
        images.push(clean);
      }
    }

    // Extract price
    const offers = productLd.offers || {};
    const price = parsePrice(offers.price || 0);
    const originalPrice = `₹${price}`;

    // Extract description from <meta name="description"> (has full product details)
    let description = '';
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    if (metaDesc && metaDesc.length > 30) {
      description = metaDesc;
    }

    // Also try og:description as supplement
    if (!description) {
      description = $('meta[property="og:description"]').attr('content') || '';
    }

    // Extract specs from the meta description
    const specs = {};
    
    // Parse key-value pairs from description (e.g., "Fabric: Cotton Blend")
    const specLines = description.split('\n');
    for (const line of specLines) {
      const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (colonMatch && colonMatch[1].trim().length < 40 && colonMatch[2].trim().length < 200) {
        const key = colonMatch[1].trim();
        const val = colonMatch[2].trim();
        // Skip lines that are too long (probably the main description text)
        if (!key.toLowerCase().startsWith('name') && val.length < 150) {
          specs[key] = val;
        }
      }
    }

    // Extract brand
    if (productLd.brand) {
      const brandName = typeof productLd.brand === 'string' ? productLd.brand : productLd.brand.name;
      if (brandName) specs['Brand'] = brandName;
    }

    // Extract rating
    if (productLd.aggregateRating) {
      specs['Rating'] = `${productLd.aggregateRating.ratingValue}/5 (${productLd.aggregateRating.reviewCount} reviews)`;
    }

    // Extract SKU
    if (productLd.sku) {
      specs['SKU'] = productLd.sku;
    }

    // Extract category from breadcrumb JSON-LD
    let categoryHint = '';
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'BreadcrumbList' && data.itemListElement) {
          const items = data.itemListElement;
          // Get the second-to-last breadcrumb as category
          if (items.length >= 3) {
            categoryHint = items[items.length - 2].name || '';
          }
        }
      } catch (e) { /* skip */ }
    });

    return {
      title: String(title).trim(),
      price,
      originalPrice,
      images,
      description: description.trim(),
      specifications: specs,
      category_hint: categoryHint,
      source: 'ld-json',
    };
  } catch (err) {
    console.log(`  ⚠ [Method 1.5] Error: ${err.message}`);
    return null;
  }
}

// ————————————————————————————————————————————————————————————————————————————
// METHOD 2: HTTP page scrape with browser headers
// ————————————————————————————————————————————————————————————————————————————
async function tryHttpScrape(url) {
  console.log('  → [Method 2] HTTP scrape with browser headers...');
  try {
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: s => s < 500,
    });

    if (response.status === 403) {
      console.log('  ⚠ [Method 2] 403 Forbidden');
      return null;
    }

    const html = response.data;
    const $ = cheerio.load(html);

    // Try __NEXT_DATA__
    const nextScript = $('#__NEXT_DATA__').html();
    if (nextScript) {
      try {
        const parsed = JSON.parse(nextScript);
        const raw = deepFindProduct(parsed);
        if (raw) {
          console.log('  ✅ [Method 2] Found product in __NEXT_DATA__');
          return buildProductData(raw, url);
        }
      } catch (e) {
        console.log('  ⚠ JSON parse error:', e.message);
      }
    }

    // Try CSS selectors
    const title = $('h1').first().text().trim();
    if (title) {
      const priceText = $('span[class*="Price"], h3[class*="Price"], h4[class*="Price"]').first().text().trim();
      const imgs = [];
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && src.includes('images.meesho.com') && !imgs.includes(src)) imgs.push(src);
      });

      let desc = '';
      $('span[class*="Description"], div[class*="Description"]').each((_, el) => {
        desc += $(el).text().trim() + '\n';
      });

      console.log(`  ✅ [Method 2] CSS selector extraction: "${title}"`);
      return {
        title,
        price: parsePrice(priceText),
        originalPrice: priceText || '₹0',
        images: imgs.map(u => u.replace(/_\d+\.jpg/g, '.jpg')),
        description: desc.trim() || '',
        specifications: {},
        category_hint: '',
      };
    }

    return null;
  } catch (err) {
    console.log(`  ⚠ [Method 2] Error: ${err.message}`);
    return null;
  }
}

// ————————————————————————————————————————————————————————————————————————————
// METHOD 3: Parse from URL slug (last resort — no images/price)
// ————————————————————————————————————————————————————————————————————————————
async function tryMeeshoSearchApi(url) {
  const productId = extractProductId(url);
  const slug = extractSlug(url);
  const slugQuery = wordsFromSlug(slug).join(' ');
  const queries = [...new Set([slugQuery, titleFromSlug(slug), productId].filter(Boolean))];
  let best = null;
  let bestScore = 0;

  console.log('  -> [Method 0] Meesho search API exact-match fallback...');

  for (const query of queries) {
    try {
      const response = await axios.post(
        'https://www.meesho.com/api/v1/products/search',
        { query, type: 'text_search', page: 1, offset: 0, limit: 30 },
        { headers: API_HEADERS, timeout: 15000, proxy: false }
      );

      const catalogs = response.data?.catalogs || response.data?.products || [];
      for (const catalog of catalogs) {
        const score = scoreCatalog(catalog, slug, productId);
        if (score > bestScore) {
          best = catalog;
          bestScore = score;
        }
      }
      if (bestScore >= 1) break;
    } catch (error) {
      console.log(`  ! [Method 0] Search query "${query}" failed: ${error.message}`);
    }
  }

  if (!best || bestScore < 0.25) return null;
  best.__source = 'meesho-search-api';
  const product = buildProductData(best, url);
  product.matchConfidence = Number(bestScore.toFixed(2));
  console.log(`  OK [Method 0] Search API matched product with confidence ${product.matchConfidence}`);
  return product;
}
function trySlugFallback(url) {
  console.log('  → [Method 3] URL slug fallback...');
  const productId = extractProductId(url);
  const slugMatch = url.match(/meesho\.com\/([^/]+)\/p\//);
  if (!slugMatch) return null;

  const title = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    title,
    price: 0,
    originalPrice: '₹0',
    images: [],
    description: `Product from Supplier (ID: ${productId}). Use the "Paste HTML" option in the dashboard for accurate data.`,
    specifications: { 'Product ID': productId, 'Source': 'Supplier' },
    category_hint: '',
  };
}

// ————————————————————————————————————————————————————————————————————————————
// METHOD 0.5: Meesho Catalog Detail API (fetch full images using product ID)
// ————————————————————————————————————————————————————————————————————————————
async function tryMeeshoCatalogApi(url) {
  const productId = extractProductId(url);
  if (!productId) return null;
  console.log(`  → [Method 0.5] Meesho catalog detail API for product ID: ${productId}...`);

  // Try multiple Meesho internal API endpoints
  const endpoints = [
    {
      method: 'post',
      url: 'https://www.meesho.com/api/v1/products/catalog_details',
      body: { product_id: productId },
    },
    {
      method: 'post',
      url: 'https://www.meesho.com/api/v1/products/detail',
      body: { product_id: productId },
    },
    {
      method: 'get',
      url: `https://www.meesho.com/api/v1/catalogs/${productId}`,
    },
    {
      method: 'post',
      url: 'https://www.meesho.com/api/v1/products/catalog',
      body: { catalog_id: productId },
    },
  ];

  for (const ep of endpoints) {
    try {
      const res = ep.method === 'post'
        ? await axios.post(ep.url, ep.body, { headers: API_HEADERS, timeout: 10000, proxy: false })
        : await axios.get(ep.url, { headers: API_HEADERS, timeout: 10000, proxy: false });

      const data = res.data;
      if (!data) continue;

      // Extract images from any response shape
      const images = extractAllImages(data);
      if (images.length === 0) continue;

      // Try to extract price and title too
      const raw = deepFindProduct(data) || data;
      const priceInfo = pickPriceInfo(raw);
      const title = raw.hero_product_name || raw.name || raw.title || raw.product_name || '';

      if (images.length > 0) {
        console.log(`  ✅ [Method 0.5] Got ${images.length} images from catalog API`);
        const product = buildProductData(raw, url);
        if (product.images.length === 0) product.images = images;
        return product;
      }
    } catch (e) {
      // Try next endpoint
    }
  }

  // Also try fetching via the search API with product_id as query
  try {
    const res = await axios.post(
      'https://www.meesho.com/api/v1/products/search',
      { query: productId, type: 'text_search', page: 1, offset: 0, limit: 10 },
      { headers: API_HEADERS, timeout: 12000, proxy: false }
    );
    const catalogs = res.data?.catalogs || res.data?.products || [];
    const exact = catalogs.find(c =>
      String(c.product_id || '').toLowerCase() === productId.toLowerCase() ||
      String(c.catalog_id || '').toLowerCase() === productId.toLowerCase()
    );
    if (exact) {
      const images = extractAllImages(exact);
      if (images.length > 0) {
        exact.__source = 'meesho-catalog-id-search';
        const product = buildProductData(exact, url);
        console.log(`  ✅ [Method 0.5] Product ID search got ${product.images.length} images`);
        return product;
      }
    }
  } catch (e) { /* skip */ }

  console.log('  ⚠ [Method 0.5] No images found via catalog API');
  return null;
}


// ————————————————————————————————————————————————————————————————————————————
// MAIN SCRAPER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function scrapeMeeshoProduct(url) {
  if (!url || !url.toLowerCase().includes('meesho.com')) {
    throw new Error('Invalid URL. Please paste a valid Meesho product URL.');
  }

  const productId = extractProductId(url);
  console.log(`\nðŸ” Scraping Meesho product: ${url}`);
  console.log(`   Product ID: ${productId || 'unknown'}`);

  let data = null;

  // Try Method 0: Meesho search API exact match (fast and usually has images/prices)
  data = await tryMeeshoSearchApi(url);

  // Try Method 1.5: JSON-LD structured data extraction
  if (!data || !data.title) {
    data = await tryLdJsonScrape(url);
  }

  // Try Method 1: Puppeteer (most accurate)
  if (!data || !data.title) {
    data = await tryPuppeteerScrape(url);
  }

  // Try Method 2: HTTP scrape
  if (!data || !data.title) {
    data = await tryHttpScrape(url);
  }

  // Try Method 3: URL slug fallback
  if (!data || !data.title) {
    data = trySlugFallback(url);
  }

  if (!data || !data.title) {
    throw new Error(
      'Could not extract product data. Meesho is blocking automated access. ' +
      'Use the "Paste HTML" option in the admin dashboard for accurate results.'
    );
  }

  // Ensure images array
  if (!data.images || data.images.length === 0) {
    data.images = [];
  }

  // Clean specs
  if (typeof data.specifications !== 'object' || Array.isArray(data.specifications)) {
    data.specifications = {};
  }

  console.log(`  âœ… Final: "${data.title}" â€” â‚¹${data.price} â€” ${data.images.length} images`);
  return data;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PARSE HTML (for the "Paste HTML" feature)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function parseFromHtml(html) {
  const $ = cheerio.load(html);

  // Try __NEXT_DATA__ first
  const nextScript = $('#__NEXT_DATA__').html();
  let nextDataProduct = null;
  if (nextScript) {
    try {
      const parsed = JSON.parse(nextScript);
      nextDataProduct = deepFindProduct(parsed);
    } catch (e) {
      console.log('  ⚠️ JSON parse error:', e.message);
    }
  }

  // Try JSON-LD structured data
  let ldJsonProduct = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'Product') {
        ldJsonProduct = data;
      } else if (Array.isArray(data)) {
        const found = data.find(d => d['@type'] === 'Product');
        if (found) ldJsonProduct = found;
      }
    } catch (e) { /* skip */ }
  });

  // Get title
  const title = nextDataProduct?.hero_product_name || nextDataProduct?.name || nextDataProduct?.title || nextDataProduct?.product_name || nextDataProduct?.description || ldJsonProduct?.name || $('h1').first().text().trim() || 'Unknown Product';

  // Get prices
  const priceInfo = nextDataProduct ? pickPriceInfo(nextDataProduct) : null;
  const priceText = $('span[class*="Price"], h3[class*="Price"], h4[class*="Price"]').first().text().trim();
  const ldPrice = ldJsonProduct?.offers?.price;
  const price = priceInfo ? priceInfo.price : (ldPrice || parsePrice(priceText));
  const originalPriceText = priceInfo ? `₹${priceInfo.originalPrice}` : (price ? `₹${price}` : (priceText || '₹0'));

  // Extract description
  let description = nextDataProduct?.full_details || nextDataProduct?.description || nextDataProduct?.product_description || nextDataProduct?.product_details || nextDataProduct?.share_text || '';
  if (!description) {
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc && metaDesc.length > 30) description = metaDesc;
    else description = $('meta[property="og:description"]').attr('content') || '';
  }

  // Extract category
  const category = nextDataProduct?.sub_sub_category_name || nextDataProduct?.category_name || nextDataProduct?.subcategory || nextDataProduct?.category || '';

  // Extract specs
  const specs = nextDataProduct ? extractSpecs(nextDataProduct) : {};

  // --- Ultra-robust image extraction ---
  const imgs = [];

  // 1. If we got product data from __NEXT_DATA__, use its images first
  if (nextDataProduct) {
    const nextImages = extractAllImages(nextDataProduct);
    for (const img of nextImages) {
      if (!imgs.includes(img)) imgs.push(img);
    }
  }

  // 1.5 If we got JSON-LD images, use them
  if (ldJsonProduct && ldJsonProduct.image) {
    const imgArr = Array.isArray(ldJsonProduct.image) ? ldJsonProduct.image : [ldJsonProduct.image];
    for (const img of imgArr) {
      let url = typeof img === 'string' ? img : (img.url || '');
      if (url) {
        url = url.replace(/\?width=\d+/g, '').replace(/_512\./g, '_1200.');
        if (!imgs.includes(url)) imgs.push(url);
      }
    }
  }

  // 2. Scan all img tags in the HTML (including srcset and other attributes)
  $('img').each((_, el) => {
    const attribs = el.attribs || {};
    for (const key of Object.keys(attribs)) {
      const val = attribs[key];
      if (!val || typeof val !== 'string') continue;

      if (key.toLowerCase() === 'srcset') {
        const parts = val.split(',');
        for (const part of parts) {
          const urlMatch = part.trim().split(/\s+/)[0];
          if (urlMatch && urlMatch.startsWith('http') && (urlMatch.includes('images.meesho.com') || urlMatch.match(/\.(jpg|jpeg|png|webp)/i))) {
            const clean = urlMatch.replace(/\\/g, '').split(/[")'>\s]/)[0];
            const highRes = clean.replace(/_\d+\.(jpg|jpeg|png|webp)/g, '.$1').replace(/_\d+\.jpg/g, '.jpg');
            if (highRes && !imgs.includes(highRes)) imgs.push(highRes);
          }
        }
      } else {
        if (val.startsWith('http') && (val.includes('images.meesho.com') || val.match(/\.(jpg|jpeg|png|webp)/i))) {
          const clean = val.replace(/\\/g, '').split(/[")'>\s]/)[0];
          const highRes = clean.replace(/_\d+\.(jpg|jpeg|png|webp)/g, '.$1').replace(/_\d+\.jpg/g, '.jpg');
          if (highRes && !imgs.includes(highRes)) imgs.push(highRes);
        }
      }
    }
  });

  // 3. Scan the raw HTML string using regex to catch any other Meesho CDN URLs
  const cdnRegex = /https:\/\/images\.meesho\.com\/[^\s"'>]+/g;
  const matches = html.match(cdnRegex) || [];
  for (const match of matches) {
    let clean = match.replace(/\\/g, '');
    clean = clean.split(/[")'>\s]/)[0];
    if (clean && clean.startsWith('http')) {
      const highRes = clean.replace(/_\d+\.(jpg|jpeg|png|webp)/g, '.$1').replace(/_\d+\.jpg/g, '.jpg');
      if (highRes && !imgs.includes(highRes)) imgs.push(highRes);
    }
  }

  // --- End of ultra-robust image extraction ---

  return {
    title: String(title).trim(),
    price: price,
    originalPrice: originalPriceText,
    images: imgs,
    description: description,
    specifications: specs,
    category_hint: category,
  };
}

module.exports = { scrapeMeeshoProduct, parseFromHtml };




