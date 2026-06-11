// scraper.js — Meesho URL-based scraper only (no Chrome needed)

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// Extract __NEXT_DATA__ from HTML
function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

// Extract meta tag value
function extractMeta(html, property) {
  const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i'));
  return match?.[1] || null;
}

// ── MEESHO PRODUCT URL SCRAPER ────────────────────────────────────────────────
export async function scrapeMeeshoUrl(url) {
  console.log(`🔍 Scraping Meesho URL: ${url}`);

  try {
    const html = await fetchPage(url);

    // Try __NEXT_DATA__ first (most reliable)
    const nextData = extractNextData(html);
    if (nextData) {
      const props = nextData?.props?.pageProps;

      // Find product data in various possible paths
      const product =
        props?.product ||
        props?.productData ||
        props?.data?.product ||
        props?.initialData?.product ||
        props?.serverData?.product;

      if (product) {
        const name = product.name || product.product_name || product.title || '';
        const price = parseFloat(product.current_price || product.price?.mrp || product.mrp || 0);
        const mrp   = parseFloat(product.original_price || product.price?.original || product.mrp || price);

        // Collect all images
        const rawImgs = product.images || product.product_images || product.media?.images || [];
        const images  = rawImgs
          .map(i => (typeof i === 'string' ? i : (i.url || i.image_url || i.src || '')))
          .filter(Boolean);

        if (name && price > 0) {
          console.log(`✅ Extracted from __NEXT_DATA__: ${name}`);
          return {
            name,
            description: product.description || product.product_description || `${name} — Available for wholesale`,
            price,
            original_price: mrp,
            discount_pct: mrp > price ? Math.round((1 - price/mrp)*100) : 0,
            image_url: images[0] || '',
            images,
            category: product.primary_category || product.category?.name || 'Wholesale Products',
            subcategory: product.sub_category || '',
            brand: product.brand_name || product.supplier_name || '',
            specifications: product.product_attributes || product.attributes || {},
            source_url: url,
            source_site: 'meesho',
            stock: 999,
            min_order: 1,
            unit: 'piece',
          };
        }
      }

      // Try to find product in page sections/catalog
      const allKeys = JSON.stringify(nextData);
      const priceMatch = allKeys.match(/"(?:current_price|mrp|price)"\s*:\s*(\d+(?:\.\d+)?)/);
      const nameMatch  = allKeys.match(/"(?:product_name|name|title)"\s*:\s*"([^"]{5,100})"/);
      const imgMatch   = allKeys.match(/"(?:url|image_url|cover_image)"\s*:\s*"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/);

      if (nameMatch && priceMatch) {
        const name  = nameMatch[1];
        const price = parseFloat(priceMatch[1]);
        console.log(`✅ Extracted from JSON scan: ${name}`);
        return {
          name,
          description: `${name} — Available for wholesale`,
          price,
          original_price: Math.round(price * 1.2),
          discount_pct: 17,
          image_url: imgMatch?.[1] || '',
          images: imgMatch?.[1] ? [imgMatch[1]] : [],
          category: 'Wholesale Products',
          source_url: url,
          source_site: 'meesho',
          stock: 999, min_order: 1, unit: 'piece',
        };
      }
    }

    // Fallback: extract from meta tags (Open Graph)
    const ogTitle = extractMeta(html, 'og:title');
    const ogDesc  = extractMeta(html, 'og:description');
    const ogImage = extractMeta(html, 'og:image');

    // Extract price from various patterns
    const pricePatterns = [
      /"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/,
      /class="[^"]*price[^"]*"[^>]*>[\s₹]*([0-9,]+)/,
      /₹\s*([0-9,]+)/,
      /"amount"\s*:\s*(\d+)/,
    ];
    let price = 0;
    for (const pat of pricePatterns) {
      const m = html.match(pat);
      if (m) { price = parseFloat(m[1].replace(/,/g,'')); if (price > 0) break; }
    }

    // Collect all product images from HTML
    const imgMatches = [...html.matchAll(/https:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?/gi)];
    const images = [...new Set(imgMatches.map(m => m[0]).filter(u => u.includes('cdn') || u.includes('image')))].slice(0, 5);

    if (ogTitle) {
      const name = ogTitle.replace(/\s*[-|]?\s*(?:Buy Online|Meesho|Online Shopping).*$/i, '').trim();
      console.log(`✅ Extracted from meta tags: ${name}`);
      return {
        name,
        description: ogDesc || `${name} — Available for wholesale`,
        price: price || 0,
        original_price: price ? Math.round(price * 1.2) : 0,
        discount_pct: price ? 17 : 0,
        image_url: ogImage || images[0] || '',
        images: ogImage ? [ogImage, ...images.filter(i=>i!==ogImage)].slice(0,5) : images,
        category: 'Wholesale Products',
        source_url: url,
        source_site: 'meesho',
        stock: 999, min_order: 1, unit: 'piece',
      };
    }

    throw new Error('Could not extract product data from this URL');

  } catch (err) {
    console.error('❌ Meesho URL scrape failed:', err.message);
    return null;
  }
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function scrapeAll(query, sites = ['meesho']) {
  // Only URL-based scraping
  if (!query.includes('meesho.com')) {
    return []; // Non-Meesho URLs not supported — admin adds manually
  }

  const product = await scrapeMeeshoUrl(query);
  return product ? [product] : [];
}
