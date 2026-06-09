// db.js - PostgreSQL connection with IPv4 forced (Render free tier fix)
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import pg from 'pg';
const { Pool } = pg;

async function resolveIPv4(hostname) {
  return new Promise((resolve, reject) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses[0]);
    });
  });
}

let pool;

async function getPool() {
  if (pool) return pool;
  const host = await resolveIPv4('db.iimusjukiunjjvqtnhit.supabase.co');
  console.log('✅ Resolved Supabase IPv4:', host);
  pool = new Pool({
    host,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'RushiSneha@1',
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

export async function init() {
  try {
    const db = await getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name          TEXT NOT NULL,
        description   TEXT,
        price         NUMERIC(18,2) NOT NULL DEFAULT 0,
        original_price NUMERIC(18,2),
        image_url     TEXT,
        images        JSONB DEFAULT '[]',
        category      TEXT,
        subcategory   TEXT,
        specifications JSONB DEFAULT '{}',
        stock         INT NOT NULL DEFAULT 999,
        is_active     BOOLEAN DEFAULT TRUE,
        source_url    TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ Database connected and table verified');
  } catch (err) {
    console.error('❌ Database init failed:', err.message);
    throw err;
  }
}

export async function getAllProducts() {
  const db = await getPool();
  const { rows } = await db.query(`SELECT * FROM products WHERE is_active = TRUE ORDER BY created_at DESC`);
  return rows;
}

export async function getProductById(id) {
  const db = await getPool();
  const { rows } = await db.query(`SELECT * FROM products WHERE id = $1 AND is_active = TRUE`, [id]);
  return rows[0] || null;
}

export async function saveProduct(product) {
  const db = await getPool();
  const { name, description, price, original_price, image_url, images, category, subcategory, specifications, stock, source_url } = product;
  const { rows } = await db.query(
    `INSERT INTO products (name, description, price, original_price, image_url, images, category, subcategory, specifications, stock, source_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [name, description, price || 0, original_price, image_url, JSON.stringify(images || []), category, subcategory, JSON.stringify(specifications || {}), stock || 999, source_url]
  );
  return rows[0];
}

export async function updateProduct(id, updates) {
  const db = await getPool();
  const fields = [], values = [];
  let i = 1;
  const allowed = ['name','description','price','original_price','image_url','images','category','subcategory','specifications','stock','is_active'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push((key === 'images' || key === 'specifications') ? JSON.stringify(updates[key]) : updates[key]);
    }
  }
  if (!fields.length) return null;
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await db.query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows[0] || null;
}

export async function deleteProduct(id) {
  const db = await getPool();
  await db.query(`UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
}

export async function getProductsByCategory(category) {
  const db = await getPool();
  const { rows } = await db.query(`SELECT * FROM products WHERE category = $1 AND is_active = TRUE ORDER BY created_at DESC`, [category]);
  return rows;
}

export async function searchProducts(query) {
  const db = await getPool();
  const { rows } = await db.query(
    `SELECT * FROM products WHERE is_active = TRUE AND (name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1) ORDER BY created_at DESC`,
    [`%${query}%`]
  );
  return rows;
}

export default { init, getAllProducts, getProductById, saveProduct, updateProduct, deleteProduct, getProductsByCategory, searchProducts };
