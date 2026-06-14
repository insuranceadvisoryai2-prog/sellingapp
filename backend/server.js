// server.js — WholesaleMartIndia Backend
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';
import { scrapeAll } from './scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'wholesalemart_secret_change_in_production';

// Allow frontend origin for normal requests
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(s=>s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  // Import endpoint must accept from ANY origin (bookmarklet runs on meesho.com)
  if (req.path === '/api/admin/import-product') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    return next();
  }
  // All other routes
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || origin.includes('localhost')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', origin); // allow all for now
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '20mb' })); // large for base64 images
app.use(express.static(path.join(__dirname, '../frontend/dist')));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  });
}


// ── IMPORT TOKEN (for bookmarklet) — stored in DB, survives restarts ─────────
app.post('/api/admin/generate-import-token', adminMiddleware, async (req, res) => {
  try {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array).map(b => b.toString(16).padStart(2,'0')).join('');
    await db.saveImportToken(token, req.user.id);
    console.log('Import token saved to DB for user:', req.user.id);
    res.json({ token });
  } catch(err) {
    console.error('Token generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await db.createUser({ username, email, password: hashed });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.getUserByUsername(username);
    if (!user || user.role !== 'admin') return res.status(401).json({ error: 'Invalid admin credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid admin credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, role: 'admin' } });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await db.getUserById(req.user.id);
  res.json(user);
});

// ── PRODUCTS (PUBLIC) — never expose source_url ───────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 24 } = req.query;
    const [products, total] = await Promise.all([
      db.getAllProducts({ category, search, page: +page, limit: +limit }),
      db.countProducts({ category, search }),
    ]);
    // Strip source_url from public response
    const safe = products.map(({ source_url, source_site, ...p }) => p);
    res.json({ products: safe, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch { res.status(500).json({ error: 'Failed to fetch products' }); }
});

app.get('/api/products/categories', async (req, res) => {
  try { res.json(await db.getCategories()); }
  catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    // Strip source info from public view
    const { source_url, source_site, ...safe } = product;
    res.json(safe);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ── PRODUCTS (ADMIN) — includes source_url ────────────────────────────────────
app.get('/api/admin/products', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, status } = req.query;
    res.json(await db.getAllProductsAdmin({ page: +page, status }));
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Pending approval count
app.get('/api/admin/products/pending-count', adminMiddleware, async (req, res) => {
  try { res.json({ count: await db.getPendingCount() }); }
  catch { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/admin/products', adminMiddleware, async (req, res) => {
  try {
    const { name, description, price, original_price, discount_pct,
      image_url, images, image_base64, category, subcategory, brand,
      specifications, stock, unit, min_order, source_url, is_published } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Product name required' });
    if (!price || isNaN(price)) return res.status(400).json({ error: 'Valid price required' });

    let imageArray = [];
    if (Array.isArray(images)) imageArray = images.filter(Boolean);
    else if (typeof images === 'string' && images) imageArray = images.split(',').map(s => s.trim()).filter(Boolean);
    // base64 images from device upload
    if (Array.isArray(image_base64)) imageArray = [...image_base64, ...imageArray];
    if (image_url && !imageArray.includes(image_url)) imageArray.unshift(image_url);

    const product = await db.saveProduct({
      name: name.trim(), description: description || '',
      price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : parseFloat(price),
      discount_pct: parseInt(discount_pct) || 0,
      image_url: imageArray[0] || '', images: imageArray,
      category: category || 'General', subcategory: subcategory || '',
      brand: brand || '', specifications: specifications || {},
      stock: parseInt(stock) || 999, unit: unit || 'piece',
      min_order: parseInt(min_order) || 1,
      source_url: source_url || '', source_site: 'manual',
      is_published: is_published !== false,
      approval_status: 'approved', // manually added = auto approved
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/products/:id', adminMiddleware, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.images !== undefined) {
      let arr = Array.isArray(updates.images)
        ? updates.images.filter(Boolean)
        : (updates.images || '').split(',').map(s => s.trim()).filter(Boolean);
      // prepend base64 images if present
      if (Array.isArray(updates.image_base64)) arr = [...updates.image_base64, ...arr];
      delete updates.image_base64;
      updates.images = arr;
      if (arr.length) updates.image_url = arr[0];
    }
    const product = await db.updateProduct(req.params.id, updates);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/products/:id', adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
    await db.deleteProduct(id);
    res.json({ success: true });
  } catch(err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete: ' + err.message });
  }
});

// ── APPROVAL ENDPOINTS ────────────────────────────────────────────────────────
// Approve single product
app.post('/api/admin/products/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const p = await db.updateProduct(parseInt(req.params.id), { approval_status: 'approved', is_published: true });
    res.json(p);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Reject single product
app.post('/api/admin/products/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const p = await db.updateProduct(parseInt(req.params.id), { approval_status: 'rejected', is_published: false });
    res.json(p);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Approve ALL pending
app.post('/api/admin/products/approve-all', adminMiddleware, async (req, res) => {
  try {
    const count = await db.approveAllPending();
    res.json({ success: true, approved: count });
  } catch(err) { res.status(500).json({ error: err.message }); }
});


// ── DIRECT IMPORT (from bookmarklet) ─────────────────────────────────────────
app.post('/api/admin/import-product', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  // Accept either: JWT admin token OR import token from DB
  let authorized = false;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (user.role === 'admin') authorized = true;
  } catch {}

  if (!authorized) {
    try {
      authorized = await db.validateImportToken(token);
    } catch(e) {
      console.error('Token validation error:', e.message);
    }
  }

  if (!authorized) return res.status(401).json({ error: 'Invalid token. Re-generate bookmarklet from admin panel.' });

  try {
    const p = req.body;
    if (!p.name || !p.name.trim()) return res.status(400).json({ error: 'Product name missing' });

    const saved = await db.saveProduct({
      name:           (p.name || '').trim().slice(0, 255),
      description:    (p.description || '').trim(),
      price:          parseFloat(p.price) || 0,
      original_price: parseFloat(p.original_price || p.mrp || p.price) || 0,
      discount_pct:   parseInt(p.discount_pct) || 0,
      image_url:      (p.images?.[0] || p.image_url || ''),
      images:         Array.isArray(p.images) ? p.images.slice(0, 8) : [],
      category:       (p.category || 'Wholesale Products').trim(),
      subcategory:    (p.subcategory || '').trim(),
      brand:          (p.brand || '').trim(),
      specifications: p.specifications || {},
      stock:          999,
      min_order:      parseInt(p.min_order) || 1,
      unit:           p.unit || 'piece',
      source_url:     p.source_url || '',
      source_site:    'wholesale',
      is_published:   false,
      approval_status:'pending',
    });

    console.log(`✅ Bookmarklet import: ${saved?.name}`);
    res.json({ success: true, product: saved, message: 'Product saved to pending!' });
  } catch (err) {
    console.error('Import error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── CART ──────────────────────────────────────────────────────────────────────
app.get('/api/cart', authMiddleware, async (req, res) => {
  try { res.json(await db.getCartWithItems(req.user.id)); }
  catch { res.status(500).json({ error: 'Failed' }); }
});
app.post('/api/cart', authMiddleware, async (req, res) => {
  try { res.json(await db.addToCart(req.user.id, req.body.productId, req.body.quantity || 1)); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
app.put('/api/cart/:productId', authMiddleware, async (req, res) => {
  try { res.json(await db.updateCartItem(req.user.id, req.params.productId, req.body.quantity)); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
app.delete('/api/cart', authMiddleware, async (req, res) => {
  try { await db.clearCart(req.user.id); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Failed' }); }
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
app.post('/api/orders', authMiddleware, async (req, res) => {
  try { res.json(await db.createOrder(req.user.id, req.body)); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
app.get('/api/orders', authMiddleware, async (req, res) => {
  try { res.json(await db.getOrders(req.user.id, req.user.role === 'admin')); }
  catch { res.status(500).json({ error: 'Failed' }); }
});
app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  try { res.json(await db.getOrderDetails(req.params.id)); }
  catch { res.status(500).json({ error: 'Failed' }); }
});

// ── SCRAPER ───────────────────────────────────────────────────────────────────
app.post('/api/admin/scrape', adminMiddleware, async (req, res) => {
  const { query, sites = ['meesho', 'indiamart'] } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  const job = await db.createScrapeJob(sites.join(','), query);
  res.json({ message: 'Scrape started', jobId: job.id });

  (async () => {
    try {
      console.log(`🔍 Starting scrape job ${job.id} for: ${query}`);
      const products = await scrapeAll(query, sites);
      console.log(`📦 Scraper returned ${products.length} products`);

      if (products.length === 0) {
        await db.updateScrapeJob(job.id, {
          status: 'failed',
          error: 'Could not extract product data. Meesho may be blocking automated access. Try adding the product manually instead.',
          products_found: 0
        });
        return;
      }

      const saved = await db.saveManyProductsPending(products);
      await db.updateScrapeJob(job.id, { status: 'completed', products_found: saved });
      console.log(`✅ Job ${job.id}: ${saved} products saved (pending approval)`);
    } catch (err) {
      console.error(`❌ Job ${job.id} failed:`, err.message);
      await db.updateScrapeJob(job.id, { status: 'failed', error: err.message });
    }
  })();
});

app.get('/api/admin/scrape/jobs', adminMiddleware, async (req, res) => {
  try { res.json(await db.getScrapeJobs()); }
  catch { res.status(500).json({ error: 'Failed' }); }
});

// ── CATCH-ALL ─────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'), (err) => {
    if (err) res.status(200).json({ message: 'WholesaleMartIndia API running' });
  });
});

async function start() {
  try {
    await db.init();
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
  } catch (err) { console.error('Failed to start:', err.message); process.exit(1); }
}
start();
