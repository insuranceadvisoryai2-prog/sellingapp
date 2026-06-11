// scraper.js — Meesho URL scraper with multiple extraction strategies

async function fetchPage(url) {
  // Try multiple user agents
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  ];

  for (const agent of agents) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': agent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://www.google.com/search?q=meesho+products',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
        },
        redirect: 'follow',
      });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 5000) return text; // valid page
      }
    } catch (e) {
      console.log(`Agent failed: ${e.message}`);
    }
  }
  throw new Error('All fetch attempts failed');
}

// Deep search for a value by key in nested JSON
function deepFind(obj, keys, maxDepth = 10) {
  if (maxDepth === 0 || !obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  for (const val of Object.values(obj)) {
    if (typeof val === 'object') {
      const found = deepFind(val, keys, maxDepth - 1);
      if (found !== null) return found;
    }
  }
  return null;
}

function deepFindAll(obj, key, results = [], maxDepth = 8) {
  if (maxDepth === 0 || !obj || typeof obj !== 'object') return results;
  if (obj[key] !== undefined) results.push(obj[key]);
  for (const val of Object.values(obj)) {
    if (typeof val === 'object') deepFindAll(val, key, results, maxDepth - 1);
  }
  return results;
}

// ── MAIN MEESHO URL SCRAPER ───────────────────────────────────────────────────
export async function scrapeMeeshoUrl(url) {
  console.log(`🔍 Scraping: ${url}`);

  try {
    const html = await fetchPage(url);
    console.log(`📄 Page fetched: ${html.length} bytes`);

    // ── Strategy 1: __NEXT_DATA__ deep search ─────────────────────────────────
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextMatch) {
      try {
        const json = JSON.parse(nextMatch[1]);
        console.log('📦 Found __NEXT_DATA__, searching...');

        // Deep find product fields
        const name  = deepFind(json, ['product_name','name','title','productName']);
        const price = deepFind(json, ['current_price','mrp','price','selling_price','finalPrice']);
        const mrp   = deepFind(json, ['original_price','mrp','market_price','maxRetailPrice']);
        const desc  = deepFind(json, ['description','product_description','shortDescription']);
        const brand = deepFind(json, ['brand_name','brandName','supplier_name','seller_name']);
        const cat   = deepFind(json, ['primary_category','category_name','category','primaryCategory']);

        // Find all image URLs
        const allUrls   = deepFindAll(json, 'url').filter(u => typeof u === 'string' && u.startsWith('http') && (u.includes('.jpg') || u.includes('.jpeg') || u.includes('.png') || u.includes('.webp')));
        const coverImgs = deepFindAll(json, 'cover_image').filter(Boolean);
        const imgUrls   = deepFindAll(json, 'image_url').filter(u => typeof u === 'string' && u.startsWith('http'));
        const images    = [...new Set([...allUrls, ...coverImgs, ...imgUrls])].slice(0, 6);

        const priceNum = parseFloat(String(price || 0).replace(/[^0-9.]/g, '')) || 0;
        const mrpNum   = parseFloat(String(mrp || mrp || priceNum * 1.2).replace(/[^0-9.]/g, '')) || priceNum;

        if (name && priceNum > 0) {
          console.log(`✅ Strategy 1 success: ${name} @ ₹${priceNum}`);
          return {
            name: String(name).trim(),
            description: desc ? String(desc).trim() : `${name} — Available for bulk purchase`,
            price: priceNum,
            original_price: mrpNum,
            discount_pct: mrpNum > priceNum ? Math.round((1 - priceNum/mrpNum)*100) : 0,
            image_url: images[0] || '',
            images,
            category: cat ? String(cat).trim() : 'Wholesale Products',
            brand: brand ? String(brand).trim() : '',
            source_url: url,
            source_site: 'wholesale',
            stock: 999, min_order: 1, unit: 'piece',
          };
        }

        // Sub-strategy: scan raw JSON string for patterns
        const raw = nextMatch[1];
        const nameM  = raw.match(/"(?:product_name|name)"\s*:\s*"([^"]{3,150})"/);
        const priceM = raw.match(/"(?:current_price|mrp|selling_price)"\s*:\s*(\d+(?:\.\d+)?)/);
        const imgM   = raw.match(/"(?:url|cover_image|image_url)"\s*:\s*"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/);

        if (nameM && priceM) {
          const p = parseFloat(priceM[1]);
          console.log(`✅ Strategy 1b (string scan): ${nameM[1]} @ ₹${p}`);
          return {
            name: nameM[1].trim(),
            description: `${nameM[1].trim()} — Available for bulk purchase`,
            price: p,
            original_price: Math.round(p * 1.2),
            discount_pct: 17,
            image_url: imgM?.[1] || '',
            images: imgM?.[1] ? [imgM[1]] : [],
            category: 'Wholesale Products',
            source_url: url,
            source_site: 'wholesale',
            stock: 999, min_order: 1, unit: 'piece',
          };
        }
      } catch (e) {
        console.log('__NEXT_DATA__ parse error:', e.message);
      }
    }

    // ── Strategy 2: JSON-LD structured data ───────────────────────────────────
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        const product = ld['@type'] === 'Product' ? ld : (ld['@graph'] || []).find(x => x['@type'] === 'Product');
        if (product) {
          const name  = product.name;
          const price = parseFloat(product.offers?.price || product.offers?.lowPrice || 0);
          const image = Array.isArray(product.image) ? product.image : [product.image].filter(Boolean);
          if (name && price > 0) {
            console.log(`✅ Strategy 2 (JSON-LD): ${name} @ ₹${price}`);
            return {
              name, description: product.description || `${name} — Wholesale`,
              price, original_price: Math.round(price * 1.2), discount_pct: 17,
              image_url: image[0] || '', images: image,
              category: product.category || 'Wholesale Products',
              brand: product.brand?.name || '',
              source_url: url, source_site: 'wholesale',
              stock: parseInt(product.offers?.availability?.match(/\d+/)?.[0]) || 999,
              min_order: 1, unit: 'piece',
            };
          }
        }
      } catch {}
    }

    // ── Strategy 3: Meta tags + HTML patterns ─────────────────────────────────
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/)?.[1]
                 || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/)?.[1];
    const ogDesc  = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/)?.[1];
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1];

    // Multiple price patterns
    let price = 0;
    const pricePatterns = [
      /"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/,
      /"current_price"\s*:\s*(\d+)/,
      /"selling_price"\s*:\s*(\d+)/,
      /₹\s*<[^>]*>\s*(\d[\d,]*)/,
      /class="[^"]*Rs[^"]*"[^>]*>(\d[\d,]+)/,
      /"amount"\s*:\s*(\d+)/,
    ];
    for (const pat of pricePatterns) {
      const m = html.match(pat);
      if (m) { price = parseFloat(m[1].replace(/,/g,'')); if (price > 10) break; }
    }

    // Collect all product images
    const imgSet = new Set();
    if (ogImage) imgSet.add(ogImage);
    const imgPatterns = [
      /https:\/\/[^"'\s]+(?:cdn|images|img)[^"'\s]*\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]{0,100})?/gi,
    ];
    for (const pat of imgPatterns) {
      [...html.matchAll(pat)].slice(0, 6).forEach(m => imgSet.add(m[0]));
    }
    const images = [...imgSet].slice(0, 5);

    if (ogTitle) {
      const cleanName = ogTitle
        .replace(/\s*[|\-–]\s*(Buy Online|Meesho|Shop Online|India|Shopping).*$/i, '')
        .replace(/\s*on Meesho\s*/i, '')
        .trim();

      console.log(`✅ Strategy 3 (meta): ${cleanName} @ ₹${price}`);
      return {
        name: cleanName,
        description: ogDesc?.replace(/Buy .* at best price.*$/i,'').trim() || `${cleanName} — Wholesale`,
        price, original_price: price ? Math.round(price * 1.2) : 0,
        discount_pct: price ? 17 : 0,
        image_url: images[0] || '', images,
        category: 'Wholesale Products',
        source_url: url, source_site: 'wholesale',
        stock: 999, min_order: 1, unit: 'piece',
      };
    }

    // ── Strategy 4: Extract from URL slug ────────────────────────────────────
    const slugMatch = url.match(/meesho\.com\/([^\/]+)\/p\//);
    if (slugMatch) {
      const name = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
      console.log(`⚠️ Strategy 4 (URL slug fallback): ${name}`);
      return {
        name, description: `${name} — Available for wholesale. Price may vary.`,
        price: 0, original_price: 0, discount_pct: 0,
        image_url: '', images: [],
        category: 'Wholesale Products',
        source_url: url, source_site: 'wholesale',
        stock: 999, min_order: 1, unit: 'piece',
      };
    }

    throw new Error('Could not extract product data — Meesho may be blocking this request');

  } catch (err) {
    console.error('❌ Scrape failed:', err.message);
    return null;
  }
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function scrapeAll(query, sites = ['meesho']) {
  if (!query.startsWith('http')) return [];
  if (!query.includes('meesho.com')) return [];
  const product = await scrapeMeeshoUrl(query);
  return product ? [product] : [];
}
