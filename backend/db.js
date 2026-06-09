// backend/db.js  — PostgreSQL (Supabase) persistent storage
// Replaces the flat-file JSON database that resets on server restart

import pg from 'pg';

const { Pool } = pg;

pg.defaults.family = 4;

const pool = new Pool({
  host: 'db.iimusjukiunjjvqtnhit.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'RushiSneha@1',
  ssl: { rejectUnauthorized: false },
});

// ── PRODUCTS ─────────────────────────────────────────────────

export async function getAllProducts() {
  const { rows } = await pool.query(
    `SELECT * FROM products WHERE is_active = TRUE ORDER BY created_at DESC`
  );
  return rows;
}

export async function getProductById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM products WHERE id = $1 AND is_active = TRUE`, [id]
  );
  return rows[0] || null;
}

export async function saveProduct(product) {
  const {
    name, description, price, original_price,
    image_url, images, category, subcategory,
    specifications, stock, source_url
  } = product;

  const { rows } = await pool.query(
    `INSERT INTO products
       (name, description, price, original_price, image_url, images,
        category, subcategory, specifications, stock, source_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      name, description, price || 0, original_price,
      image_url, JSON.stringify(images || []),
      category, subcategory,
      JSON.stringify(specifications || {}),
      stock || 999, source_url
    ]
  );
  return rows[0];
}

export async function updateProduct(id, updates) {
  const fields = [];
  const values = [];
  let i = 1;

  const allowed = ['name','description','price','original_price','image_url',
                   'images','category','subcategory','specifications','stock','is_active'];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      const val = (key === 'images' || key === 'specifications')
        ? JSON.stringify(updates[key])
        : updates[key];
      fields.push(`${key} = $${i++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) return null;
  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteProduct(id) {
  await pool.query(
    `UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [id]
  );
}

export async function getProductsByCategory(category) {
  const { rows } = await pool.query(
    `SELECT * FROM products WHERE category = $1 AND is_active = TRUE ORDER BY created_at DESC`,
    [category]
  );
  return rows;
}

export async function searchProducts(query) {
  const { rows } = await pool.query(
    `SELECT * FROM products
     WHERE is_active = TRUE
       AND (name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
     ORDER BY created_at DESC`,
    [`%${query}%`]
  );
  return rows;
}

export default pool;
export async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name        TEXT NOT NULL,
        description TEXT,
        price       NUMERIC(18,2) NOT NULL DEFAULT 0,
        original_price NUMERIC(18,2),
        image_url   TEXT,
        images      JSONB DEFAULT '[]',
        category    TEXT,
        subcategory TEXT,
        specifications JSONB DEFAULT '{}',
        stock       INT NOT NULL DEFAULT 999,
        is_active   BOOLEAN DEFAULT TRUE,
        source_url  TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ Database connected and table verified');
  } catch (err) {
    console.error('❌ Database init failed:', err.message);
    throw err;
  }
}
