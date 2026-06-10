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

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
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

// ── HEALTH ────────────────────────────────────────────────────────────────────
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

// ── PRODUCTS (PUBLIC) ─────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 24 } = req.query;
    const [products, total] = await Promise.all([
      db.getAllProducts({ category, search, page: +page, limit: +limit }),
      db.countProducts({ category, search }),
    ]);
    res.json({ products, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch products' }); }
});

app.get('/api/products/categories', async (req, res) => {
  try { res.json(await db.getCategories()); }
  catch { res.status(500).json({ error: 'Failed to fetch categories' }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch { res.status(500).json({ error: 'Failed to fetch product' }); }
});

// ── PRODUCTS (ADMIN) ──────────────────────────────────────────────────────────
app.get('/api/admin/products', adminMiddleware, async (req, res) => {
  try { res.json(await db.getAllProductsAdmin({ page: +req.query.page || 1 })); }
  catch { res.status(500).json({ error: 'Failed' }); }
});

// CREATE product manually
app.post('/api/admin/products', adminMiddleware, async (req, res) => {
  try {
    const {
      name, description, price, original_price, discount_pct,
      image_url, images, category, subcategory, brand,
      specifications, stock, unit, min_order, is_published
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Product name is required' });
    if (!price || isNaN(price)) return res.status(400).json({ error: 'Valid price is required' });

    // images can be array of URLs or comma-separated string
    let imageArray = [];
    if (Array.isArray(images)) imageArray = images.filter(Boolean);
    else if (typeof images === 'string' && images) imageArray = images.split(',').map(s => s.trim()).filter(Boolean);
    if (image_url && !imageArray.includes(image_url)) imageArray.unshift(image_url);

    const product = await db.saveProduct({
      name: name.trim(),
      description: description || '',
      price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : parseFloat(price),
      discount_pct: discount_pct || 0,
      image_url: imageArray[0] || '',
      images: imageArray,
      category: category || 'General',
      subcategory: subcategory || '',
      brand: brand || '',
      specifications: specifications || {},
      stock: parseInt(stock) || 999,
      unit: unit || 'piece',
      min_order: parseInt(min_order) || 1,
      source_site: 'manual',
      is_published: is_published !== false,
    });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
});

// UPDATE product
app.put('/api/admin/products/:id', adminMiddleware, async (req, res) => {
  try {
    const updates = req.body;

    // Handle images array
    if (updates.images !== undefined) {
      let imageArray = [];
      if (Array.isArray(updates.images)) imageArray = updates.images.filter(Boolean);
      else if (typeof updates.images === 'string') imageArray = updates.images.split(',').map(s => s.trim()).filter(Boolean);
      updates.images = imageArray;
      if (imageArray.length) updates.image_url = imageArray[0];
    }

    const product = await db.updateProduct(req.params.id, updates);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: 'Failed to update product' }); }
});

// DELETE product
app.delete('/api/admin/products/:id', adminMiddleware, async (req, res) => {
  try { await db.deleteProduct(req.params.id); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Failed to delete product' }); }
});

// ── CART ──────────────────────────────────────────────────────────────────────
app.get('/api/cart', authMiddleware, async (req, res) => {
  try { res.json(await db.getCartWithItems(req.user.id)); }
  catch { res.status(500).json({ error: 'Failed to fetch cart' }); }
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
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const job = await db.createScrapeJob(sites.join(','), query);
  res.json({ message: 'Scrape started', jobId: job.id });

  (async () => {
    try {
      const products = await scrapeAll(query, sites);
      const saved = await db.saveManyProducts(products);
      await db.updateScrapeJob(job.id, { status: 'completed', products_found: saved });
      console.log(`✅ Scrape job ${job.id}: ${saved} products saved`);
    } catch (err) {
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

// ── START ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await db.init();
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 WholesaleMartIndia on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}
start();
