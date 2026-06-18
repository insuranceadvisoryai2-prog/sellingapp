// db.js — Neon PostgreSQL
import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) { console.error('❌ DATABASE_URL not set!'); process.exit(1); }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000,
});
pool.on('error', err => console.error('DB pool error:', err.message));

export async function init() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer', created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL, description TEXT DEFAULT '',
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        original_price NUMERIC(12,2), discount_pct INT DEFAULT 0,
        image_url TEXT DEFAULT '', images JSONB DEFAULT '[]',
        category TEXT DEFAULT 'General', subcategory TEXT DEFAULT '',
        brand TEXT DEFAULT '', specifications JSONB DEFAULT '{}',
        stock INT NOT NULL DEFAULT 999, unit TEXT DEFAULT 'piece',
        min_order INT DEFAULT 1,
        source_url TEXT DEFAULT '',
        source_site TEXT DEFAULT 'manual',
        is_active BOOLEAN DEFAULT TRUE,
        is_published BOOLEAN DEFAULT FALSE,
        approval_status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS carts (
        id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id)
      );
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY, cart_id INT REFERENCES carts(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL,
        added_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(cart_id, product_id)
      );
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id),
        status TEXT DEFAULT 'pending', total_amount NUMERIC(12,2) NOT NULL,
        address TEXT, notes TEXT,
        customer_name TEXT, customer_mobile TEXT, customer_email TEXT, payment_method TEXT DEFAULT 'cod',
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        product_name TEXT NOT NULL, product_image TEXT, product_source_url TEXT,
        quantity INT NOT NULL, unit_price NUMERIC(12,2) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS scrape_jobs (
        id SERIAL PRIMARY KEY, site TEXT NOT NULL, query TEXT NOT NULL,
        status TEXT DEFAULT 'pending', products_found INT DEFAULT 0,
        error TEXT, started_at TIMESTAMPTZ DEFAULT NOW(), finished_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, is_published);
      CREATE INDEX IF NOT EXISTS idx_products_approval ON products(approval_status);
    `);

    // Add new columns to existing tables if upgrading
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_mobile TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod';
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image TEXT;
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_source_url TEXT;
    `).catch(() => {});

    console.log('✅ Database connected and tables verified');
  } finally { client.release(); }
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
export async function getAllProducts({ category, search, page=1, limit=24 }={}) {
  let q = `SELECT * FROM products WHERE is_active=TRUE AND is_published=TRUE AND approval_status='approved'`;
  const params = []; let i = 1;
  if (category) { q += ` AND category ILIKE $${i++}`; params.push(category); }
  if (search)   { q += ` AND (name ILIKE $${i} OR description ILIKE $${i} OR brand ILIKE $${i})`; params.push(`%${search}%`); i++; }
  q += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
  params.push(limit, (page-1)*limit);
  const { rows } = await pool.query(q, params);
  return rows;
}

export async function countProducts({ category, search }={}) {
  let q = `SELECT COUNT(*) FROM products WHERE is_active=TRUE AND is_published=TRUE AND approval_status='approved'`;
  const params = []; let i = 1;
  if (category) { q += ` AND category ILIKE $${i++}`; params.push(category); }
  if (search)   { q += ` AND (name ILIKE $${i} OR description ILIKE $${i} OR brand ILIKE $${i})`; params.push(`%${search}%`); i++; }
  const { rows } = await pool.query(q, params);
  return parseInt(rows[0].count);
}

export async function getProductById(id) {
  const { rows } = await pool.query(`SELECT * FROM products WHERE id=$1 AND is_active=TRUE AND approval_status='approved'`, [id]);
  return rows[0] || null;
}

export async function getCategories() {
  const { rows } = await pool.query(
    `SELECT category, COUNT(*) as count FROM products
     WHERE is_active=TRUE AND is_published=TRUE AND approval_status='approved' AND category IS NOT NULL
     GROUP BY category ORDER BY count DESC`
  );
  return rows;
}

export async function getAllProductsAdmin({ page=1, limit=50, status }={}) {
  let q = `SELECT * FROM products WHERE is_active=TRUE`;
  const params = []; let i = 1;
  if (status === 'pending')  { q += ` AND approval_status='pending'`; }
  if (status === 'approved') { q += ` AND approval_status='approved'`; }
  if (status === 'rejected') { q += ` AND approval_status='rejected'`; }
  q += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
  params.push(limit, (page-1)*limit);
  const { rows } = await pool.query(q, params);
  return rows;
}

export async function getPendingCount() {
  const { rows } = await pool.query(`SELECT COUNT(*) FROM products WHERE approval_status='pending' AND is_active=TRUE`);
  return parseInt(rows[0].count);
}

export async function saveProduct(p) {
  const { rows } = await pool.query(
    `INSERT INTO products
      (name,description,price,original_price,discount_pct,image_url,images,
       category,subcategory,brand,specifications,stock,unit,min_order,
       source_url,source_site,is_published,approval_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      p.name, p.description||'', p.price||0, p.original_price||p.price||0, p.discount_pct||0,
      p.image_url||'', JSON.stringify(p.images||[]),
      p.category||'General', p.subcategory||'', p.brand||'',
      JSON.stringify(p.specifications||{}),
      p.stock||999, p.unit||'piece', p.min_order||1,
      p.source_url||'', p.source_site||'manual',
      p.is_published || false,
      p.approval_status || 'pending',
    ]
  );
  return rows[0];
}

// Save scraped products as PENDING (requires admin approval)
export async function saveManyProductsPending(products) {
  let saved = 0;
  for (const p of products) {
    try {
      await saveProduct({ ...p, is_published: false, approval_status: 'pending' });
      saved++;
    } catch {}
  }
  return saved;
}

export async function saveManyProducts(products) {
  let saved = 0;
  for (const p of products) {
    try { await saveProduct(p); saved++; } catch {}
  }
  return saved;
}

export async function updateProduct(id, updates) {
  const allowed = [
    'name','description','price','original_price','discount_pct',
    'image_url','images','category','subcategory','brand','specifications',
    'stock','unit','min_order','source_url','is_active','is_published','approval_status'
  ];
  const fields = [], values = []; let i = 1;
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      const val = (key==='images'||key==='specifications') ? JSON.stringify(updates[key]) : updates[key];
      fields.push(`${key}=$${i++}`); values.push(val);
    }
  }
  if (!fields.length) return null;
  fields.push(`updated_at=NOW()`); values.push(parseInt(id));
  const { rows } = await pool.query(`UPDATE products SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, values);
  return rows[0] || null;
}

export async function approveAllPending() {
  const { rowCount } = await pool.query(
    `UPDATE products SET approval_status='approved', is_published=TRUE, updated_at=NOW()
     WHERE approval_status='pending' AND is_active=TRUE`
  );
  return rowCount;
}

export async function deleteProduct(id) {
  // Hard delete from DB - admin explicitly chose to delete
  const { rowCount } = await pool.query(`DELETE FROM products WHERE id=$1`, [parseInt(id)]);
  if (rowCount === 0) {
    // Fallback: soft delete
    await pool.query(`UPDATE products SET is_active=FALSE, updated_at=NOW() WHERE id=$1`, [parseInt(id)]);
  }
}

// ── USERS ─────────────────────────────────────────────────────────────────────
export async function createUser({ username, email, password, role='customer' }) {
  const { rows } = await pool.query(
    `INSERT INTO users (username,email,password,role) VALUES ($1,$2,$3,$4) RETURNING *`,
    [username, email, password, role]
  );
  return rows[0];
}
export async function getUserByUsername(username) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE username=$1`, [username]);
  return rows[0] || null;
}
export async function getUserById(id) {
  const { rows } = await pool.query(`SELECT id,username,email,role,created_at FROM users WHERE id=$1`, [id]);
  return rows[0] || null;
}

// ── CART ──────────────────────────────────────────────────────────────────────
export async function getOrCreateCart(userId) {
  let { rows } = await pool.query(`SELECT * FROM carts WHERE user_id=$1`, [userId]);
  if (!rows.length) { const r = await pool.query(`INSERT INTO carts (user_id) VALUES ($1) RETURNING *`, [userId]); rows = r.rows; }
  return rows[0];
}
export async function getCartWithItems(userId) {
  const cart = await getOrCreateCart(userId);
  const { rows } = await pool.query(
    `SELECT ci.*,p.name,p.image_url,p.price as current_price,p.stock
     FROM cart_items ci JOIN products p ON ci.product_id=p.id WHERE ci.cart_id=$1`, [cart.id]
  );
  return { cart, items: rows };
}
export async function addToCart(userId, productId, quantity) {
  const cart = await getOrCreateCart(userId);
  const { rows:[product] } = await pool.query(`SELECT * FROM products WHERE id=$1`, [productId]);
  if (!product) throw new Error('Product not found');
  await pool.query(
    `INSERT INTO cart_items (cart_id,product_id,quantity,unit_price) VALUES ($1,$2,$3,$4)
     ON CONFLICT (cart_id,product_id) DO UPDATE SET quantity=cart_items.quantity+$3`,
    [cart.id, productId, quantity, product.price]
  );
  return getCartWithItems(userId);
}
export async function updateCartItem(userId, productId, quantity) {
  const cart = await getOrCreateCart(userId);
  if (quantity <= 0) await pool.query(`DELETE FROM cart_items WHERE cart_id=$1 AND product_id=$2`, [cart.id, productId]);
  else await pool.query(`UPDATE cart_items SET quantity=$1 WHERE cart_id=$2 AND product_id=$3`, [quantity, cart.id, productId]);
  return getCartWithItems(userId);
}
export async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  await pool.query(`DELETE FROM cart_items WHERE cart_id=$1`, [cart.id]);
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
export async function createOrder(userId, { address, notes, customer_name, customer_mobile, customer_email, payment_method }={}) {
  const { items } = await getCartWithItems(userId);
  if (!items.length) throw new Error('Cart is empty');
  const total = items.reduce((s,i) => s + i.unit_price * i.quantity, 0);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows:[order] } = await client.query(
      `INSERT INTO orders (user_id,total_amount,address,notes,customer_name,customer_mobile,customer_email,payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, total, address, notes, customer_name||null, customer_mobile||null, customer_email||null, payment_method||'cod']
    );
    for (const item of items) {
      // Get product image and source_url for order snapshot
      const { rows:[prod] } = await client.query(`SELECT image_url, source_url FROM products WHERE id=$1`, [item.product_id]);
      await client.query(
        `INSERT INTO order_items (order_id,product_id,product_name,product_image,product_source_url,quantity,unit_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.product_id, item.name, prod?.image_url||'', prod?.source_url||'', item.quantity, item.unit_price]
      );
      await client.query(`UPDATE products SET stock=stock-$1 WHERE id=$2`, [item.quantity, item.product_id]);
    }
    await client.query(`DELETE FROM cart_items WHERE cart_id=(SELECT id FROM carts WHERE user_id=$1)`, [userId]);
    await client.query('COMMIT');
    return order;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
export async function getOrders(userId, isAdmin=false) {
  const q = isAdmin
    ? `SELECT o.*, u.username, u.email as user_email FROM orders o
       JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC`
    : `SELECT id, status, total_amount, payment_method, address, customer_name,
              customer_mobile, created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC`;
  const { rows } = await pool.query(q, isAdmin?[]:[userId]);
  return rows;
}
export async function getOrderDetails(orderId, userId=null) {
  let q = `SELECT o.*, u.username, u.email as user_email
            FROM orders o JOIN users u ON o.user_id=u.id WHERE o.id=$1`;
  const params = [orderId];
  if (userId) { q += ` AND o.user_id=$2`; params.push(userId); }
  const { rows:[order] } = await pool.query(q, params);
  if (!order) return null;
  const { rows:items } = await pool.query(
    `SELECT oi.*, p.image_url as live_image, p.source_url as live_source
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id=$1`, [orderId]
  );
  return { ...order, items };
}

// ── SCRAPE JOBS ───────────────────────────────────────────────────────────────
export async function createScrapeJob(site, query) {
  const { rows } = await pool.query(`INSERT INTO scrape_jobs (site,query) VALUES ($1,$2) RETURNING *`, [site, query]);
  return rows[0];
}
export async function updateScrapeJob(id, { status, products_found, error }) {
  await pool.query(
    `UPDATE scrape_jobs SET status=$1,products_found=$2,error=$3,finished_at=NOW() WHERE id=$4`,
    [status, products_found||0, error, id]
  );
}
export async function getScrapeJobs() {
  const { rows } = await pool.query(`SELECT * FROM scrape_jobs ORDER BY started_at DESC LIMIT 50`);
  return rows;
}

export async function updateOrderStatus(orderId, status) {
  return pool.query(
    `UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [status, orderId]
  );
}

// ── IMPORT TOKENS ─────────────────────────────────────────────────────────────
export async function saveImportToken(token, userId) {
  await pool.query(
    `INSERT INTO import_tokens (token, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')
     ON CONFLICT (token) DO UPDATE SET expires_at = NOW() + INTERVAL '30 days'`,
    [token, userId]
  );
}

export async function validateImportToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM import_tokens WHERE token=$1 AND expires_at > NOW()`,
    [token]
  );
  return rows.length > 0;
}

export async function cleanExpiredTokens() {
  await pool.query(`DELETE FROM import_tokens WHERE expires_at < NOW()`);
}

export default pool;
