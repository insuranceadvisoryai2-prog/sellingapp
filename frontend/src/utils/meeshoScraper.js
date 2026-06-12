// meeshoScraper.js — Browser-side scraper (bypasses Meesho's bot detection)
// Runs in the user's browser, NOT on the server

const PROXIES = [
  (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchViaProxy(url) {
  for (const makeProxyUrl of PROXIES) {
    try {
      const proxyUrl = makeProxyUrl(url);
      console.log(`Trying proxy: ${proxyUrl.split('?')[0]}`);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;

      let text;
      // allorigins returns JSON with .contents
      if (proxyUrl.includes('allorigins')) {
        const json = await res.json();
        text = json.contents;
      } else {
        text = await res.text();
      }

      if (text && text.length > 3000 && !text.includes('Access Denied') && !text.includes('403')) {
        console.log(`✅ Proxy success, ${text.length} bytes`);
        return text;
      }
    } catch (e) {
      console.log(`Proxy failed: ${e.message}`);
    }
  }
  return null;
}

// Deep search nested JSON for a key
function deepFind(obj, keys, depth = 8) {
  if (depth === 0 || !obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).length > 0) return obj[key];
  }
  for (const val of Object.values(obj)) {
    if (typeof val === 'object') {
      const found = deepFind(val, keys, depth - 1);
      if (found !== null) return found;
    }
  }
  return null;
}

function deepFindImages(obj, depth = 8) {
  const images = new Set();
  function scan(o, d) {
    if (d === 0 || !o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && v.startsWith('http') && /\.(jpg|jpeg|png|webp)/i.test(v)) {
        images.add(v);
      } else if (typeof v === 'object') {
        scan(v, d - 1);
      }
    }
  }
  scan(obj, depth);
  return [...images];
}

export async function scrapeMeeshoProduct(url) {
  console.log(`🔍 Browser scraping: ${url}`);

  // ── Try Meesho internal API first (most reliable) ──────────────────────────
  // Extract product ID from URL: /p/XXXXX
  const pidMatch = url.match(/\/p\/([a-zA-Z0-9]+)/);
  if (pidMatch) {
    const pid = pidMatch[1];
    try {
      // Meesho's internal product API
      const apiUrl = `https://www.meesho.com/api/v1/products/${pid}`;
      const apiProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
      const apiRes = await fetch(apiProxy, { signal: AbortSignal.timeout(10000) });
      if (apiRes.ok) {
        const wrapper = await apiRes.json();
        const data = JSON.parse(wrapper.contents || '{}');
        if (data?.data || data?.product) {
          const p = data.data || data.product;
          const price = parseFloat(p.current_price || p.mrp || 0);
          const images = (p.images || []).map(i => i.url || i).filter(Boolean);
          if (p.name && price > 0) {
            console.log(`✅ Meesho API success: ${p.name}`);
            return {
              name: p.name,
              description: p.description || `${p.name} — Available for wholesale`,
              price,
              original_price: parseFloat(p.original_price || p.mrp || price * 1.2),
              discount_pct: p.discount_percent || 0,
              image_url: images[0] || '',
              images,
              category: p.primary_category || 'Wholesale Products',
              brand: p.brand_name || p.supplier_name || '',
              specifications: p.product_attributes || {},
            };
          }
        }
      }
    } catch (e) {
      console.log('API attempt failed:', e.message);
    }
  }

  // ── Try fetching page via proxy ────────────────────────────────────────────
  const html = await fetchViaProxy(url);
  if (!html) {
    throw new Error('Meesho is blocking automated access. Please add this product manually using the "Add Manually" option.');
  }

  // ── Parse __NEXT_DATA__ ────────────────────────────────────────────────────
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const json = JSON.parse(nextMatch[1]);

      const name  = deepFind(json, ['product_name','name','title','productName']);
      const price = deepFind(json, ['current_price','selling_price','finalPrice']);
      const mrp   = deepFind(json, ['mrp','original_price','market_price','maxRetailPrice']);
      const desc  = deepFind(json, ['description','product_description']);
      const brand = deepFind(json, ['brand_name','brandName','supplier_name']);
      const cat   = deepFind(json, ['primary_category','category_name','category']);
      const images = deepFindImages(json).filter(u =>
        u.includes('meesho') || u.includes('cdn') || u.includes('product')
      ).slice(0, 6);

      const priceNum = parseFloat(String(price || 0).replace(/[^0-9.]/g, '')) || 0;
      const mrpNum   = parseFloat(String(mrp || 0).replace(/[^0-9.]/g, '')) || Math.round(priceNum * 1.2);

      if (name && priceNum > 0) {
        console.log(`✅ __NEXT_DATA__ success: ${name}`);
        return {
          name: String(name).trim(),
          description: desc ? String(desc).trim() : `${name} — Available for wholesale`,
          price: priceNum,
          original_price: mrpNum,
          discount_pct: mrpNum > priceNum ? Math.round((1 - priceNum/mrpNum)*100) : 0,
          image_url: images[0] || '',
          images,
          category: cat ? String(cat).trim() : 'Wholesale Products',
          brand: brand ? String(brand).trim() : '',
          specifications: {},
        };
      }
    } catch (e) {
      console.log('__NEXT_DATA__ parse failed:', e.message);
    }
  }

  // ── JSON-LD fallback ───────────────────────────────────────────────────────
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const p = ld['@type'] === 'Product' ? ld : null;
      if (p?.name) {
        const price = parseFloat(p.offers?.price || 0);
        const imgs  = (Array.isArray(p.image) ? p.image : [p.image]).filter(Boolean);
        return {
          name: p.name,
          description: p.description || `${p.name} — Wholesale`,
          price, original_price: Math.round(price * 1.2), discount_pct: 17,
          image_url: imgs[0] || '', images: imgs,
          category: p.category || 'Wholesale Products',
          brand: p.brand?.name || '',
          specifications: {},
        };
      }
    } catch {}
  }

  // ── Meta tags fallback ─────────────────────────────────────────────────────
  const ogTitle = html.match(/property="og:title"[^>]*content="([^"]+)"/)?.[1]
                || html.match(/content="([^"]+)"[^>]*property="og:title"/)?.[1];
  const ogDesc  = html.match(/property="og:description"[^>]*content="([^"]+)"/)?.[1];
  const ogImage = html.match(/property="og:image"[^>]*content="([^"]+)"/)?.[1];
  const priceM  = html.match(/"(?:current_price|selling_price|mrp)"\s*:\s*(\d+)/);

  if (ogTitle) {
    const name  = ogTitle.replace(/\s*[-|]\s*(Meesho|Buy Online|Shop).*$/i,'').trim();
    const price = parseFloat(priceM?.[1] || 0);
    return {
      name,
      description: ogDesc || `${name} — Available for wholesale`,
      price, original_price: Math.round(price * 1.2), discount_pct: price ? 17 : 0,
      image_url: ogImage || '', images: ogImage ? [ogImage] : [],
      category: 'Wholesale Products', brand: '', specifications: {},
    };
  }

  // ── URL slug last resort ───────────────────────────────────────────────────
  const slug = url.match(/meesho\.com\/([^\/]+)\/p\//)?.[1];
  if (slug) {
    const name = slug.replace(/-/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
    throw new Error(`Could not extract full details. Product title appears to be "${name}". Please add it manually with full details.`);
  }

  throw new Error('Could not scrape this product. Please add it manually.');
}
