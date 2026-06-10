// server.js — WholesaleMartIndia Backend
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';
import { scrapeAll, scrapeMeesho, scrapeIndiaMart } from './scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'wholesalemart_secret_change_in_production';

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Serve built frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── AUTH ROUTES ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await db.createUser({ username, email, password: hashed });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username or email already exists' });
    console.error(err);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await db.getUserById(req.user.id);
  res.json(user);
});

// ── PRODUCT ROUTES ────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 24 } = req.query;
    const [products, total] = await Promise.all([
      db.getAllProducts({ category, search, page: +page, limit: +limit }),
      db.countProducts({ category, search }),
    ]);
    res.json({ products, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/categories', async (req, res) => {
  try {
    const cats = await db.getCategories();
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Admin product routes
app.get('/api/admin/products', adminMiddleware, async (req, res) => {
  const products = await db.getAllProductsAdmin({ page: +req.query.page || 1 });
  res.json(products);
});

app.post('/api/admin/products', adminMiddleware, async (req, res) => {
  try {
    const product = await db.saveProduct(req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', adminMiddleware, async (req, res) => {
  try {
    const product = await db.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', adminMiddleware, async (req, res) => {
  await db.deleteProduct(req.params.id);
  res.json({ success: true });
});

// ── CART ROUTES ───────────────────────────────────────────────────────────────
app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    const cart = await db.getCartWithItems(req.user.id);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/api/cart', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const cart = await db.addToCart(req.user.id, productId, quantity);
    res.json(cart);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/cart/:productId', authMiddleware, async (req, res) => {
  try {
    const cart = await db.updateCartItem(req.user.id, req.params.productId, req.body.quantity);
    res.json(cart);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cart', authMiddleware, async (req, res) => {
  await db.clearCart(req.user.id);
  res.json({ success: true });
});

// ── ORDER ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const order = await db.createOrder(req.user.id, req.body);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await db.getOrders(req.user.id, req.user.role === 'admin');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const order = await db.getOrderDetails(req.params.id);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ── SCRAPER ROUTES (Admin) ────────────────────────────────────────────────────
app.post('/api/admin/scrape', adminMiddleware, async (req, res) => {
  const { query, sites = ['meesho', 'indiamart'] } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const job = await db.createScrapeJob(sites.join(','), query);
  res.json({ message: 'Scrape started', jobId: job.id });

  // Run scrape in background
  (async () => {
    try {
      const products = await scrapeAll(query, sites);
      const saved = await db.saveManyProducts(products);
      await db.updateScrapeJob(job.id, { status: 'completed', products_found: saved });
      console.log(`✅ Scrape job ${job.id} done: ${saved} products saved`);
    } catch (err) {
      await db.updateScrapeJob(job.id, { status: 'failed', error: err.message });
      console.error(`❌ Scrape job ${job.id} failed:`, err.message);
    }
  })();
});

app.get('/api/admin/scrape/jobs', adminMiddleware, async (req, res) => {
  const jobs = await db.getScrapeJobs();
  res.json(jobs);
});

// ── ADMIN LOGIN CHECK ─────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUser = await db.getUserByUsername(username);
  if (!adminUser || adminUser.role !== 'admin')
    return res.status(401).json({ error: 'Invalid admin credentials' });
  const valid = await bcrypt.compare(password, adminUser.password);
  if (!valid) return res.status(401).json({ error: 'Invalid admin credentials' });
  const token = jwt.sign({ id: adminUser.id, username: adminUser.username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: adminUser.id, username: adminUser.username, role: 'admin' } });
});

// ── CATCH-ALL: serve frontend ─────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(200).json({ message: 'WholesaleMartIndia API is running' });
  });
});

// ── START ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await db.init();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 WholesaleMartIndia server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
