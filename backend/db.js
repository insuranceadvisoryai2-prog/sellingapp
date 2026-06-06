const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DB_DIR, 'products.json');
const ORDERS_FILE = path.join(DB_DIR, 'orders.json');

function ensureJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
  }
}

function init() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  ensureJsonFile(PRODUCTS_FILE);
  ensureJsonFile(ORDERS_FILE);
}

function readJson(filePath) {
  init();
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

function writeJson(filePath, data) {
  init();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getProducts(subcategory = null) {
  const products = readJson(PRODUCTS_FILE);
  if (subcategory) {
    const lowerSub = subcategory.toLowerCase().trim();
    return products.filter(p => p.subcategory && p.subcategory.toLowerCase().trim() === lowerSub);
  }
  return products;
}

function normalizeProduct(product, previous = {}) {
  return {
    ...previous,
    id: product.id || previous.id || `prod_${Date.now()}`,
    originalUrl: product.originalUrl || previous.originalUrl || '',
    originalTitle: product.originalTitle || previous.originalTitle || '',
    rewrittenTitle: product.rewrittenTitle || previous.rewrittenTitle || '',
    price: Number(product.price ?? previous.price ?? 0),
    originalPrice: (() => {
      const p = Number(product.price ?? previous.price ?? 0);
      let op = Number(product.originalPrice ?? previous.originalPrice ?? 0);
      if (!op || op <= p) {
        op = p + Math.floor(Math.random() * 301) + 100; // 100 to 400 higher
      }
      return op;
    })(),
    specialOfferPrice: product.specialOfferPrice !== undefined ? Number(product.specialOfferPrice) : (previous.specialOfferPrice ?? 0),
    description: product.description ?? previous.description ?? '',
    sellingDescription: product.sellingDescription ?? previous.sellingDescription ?? '',
    images: Array.isArray(product.images) ? product.images : (previous.images || []),
    specifications: product.specifications && typeof product.specifications === 'object' ? product.specifications : (previous.specifications || {}),
    subcategory: product.subcategory || previous.subcategory || 'Uncategorized',
    parentCategory: product.parentCategory || previous.parentCategory || 'Other',
    publishedAt: previous.publishedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function saveProduct(product) {
  const products = getProducts();
  const existingIndex = products.findIndex(p => p.originalUrl === product.originalUrl || p.id === product.id);
  const newProduct = normalizeProduct(product, existingIndex > -1 ? products[existingIndex] : {});

  if (existingIndex > -1) {
    products[existingIndex] = newProduct;
  } else {
    products.unshift(newProduct);
  }

  writeJson(PRODUCTS_FILE, products);
  return newProduct;
}

function updateProduct(id, updates) {
  const products = getProducts();
  const index = products.findIndex(product => product.id === id);
  if (index === -1) return null;

  const updated = normalizeProduct({ ...updates, id }, products[index]);
  products[index] = updated;
  writeJson(PRODUCTS_FILE, products);
  return updated;
}

function deleteProduct(id) {
  const products = getProducts();
  const index = products.findIndex(product => product.id === id);
  if (index === -1) return false;

  products.splice(index, 1);
  writeJson(PRODUCTS_FILE, products);
  return true;
}

function getOrders(status = null) {
  const orders = readJson(ORDERS_FILE);
  const products = getProducts();
  const normalized = orders.map(order => {
    // Support legacy orders that had productSnapshot instead of items
    let items = order.items;
    if (!items && order.productSnapshot) {
      items = [{
        productId: order.productId || null,
        title: order.productSnapshot.title || 'Unknown Product',
        price: order.productSnapshot.price || 0,
        qty: 1,
        image: order.productSnapshot.image || '',
        subcategory: order.productSnapshot.subcategory || '',
      }];
    }
    if (!items) {
      // Try to reconstruct from live product
      const product = products.find(p => p.id === order.productId);
      items = product ? [{
        productId: product.id,
        title: product.rewrittenTitle || product.originalTitle,
        price: product.price,
        qty: 1,
        image: product.images?.[0] || '',
        subcategory: product.subcategory || '',
      }] : [];
    }
    return {
      status: 'Pending',
      paymentStatus: 'Unpaid',
      ...order,
      items,
    };
  });

  if (status) {
    const lowerStatus = status.toLowerCase().trim();
    return normalized.filter(order => order.status && order.status.toLowerCase().trim() === lowerStatus);
  }
  return normalized;
}

function saveOrder(order) {
  const orders = getOrders();
  const newOrder = {
    id: order.id || `ord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    items: Array.isArray(order.items) ? order.items : [],
    customer: order.customer || {},
    status: order.status || 'Pending',
    paymentStatus: order.paymentStatus || 'Unpaid',
    notes: order.notes || '',
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  writeJson(ORDERS_FILE, orders);
  return newOrder;
}

function updateOrder(id, updates) {
  const orders = getOrders();
  const index = orders.findIndex(order => order.id === id);
  if (index === -1) return null;

  const allowedStatuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
  const allowedPayments = ['Unpaid', 'Paid', 'Refunded'];
  const nextStatus = updates.status && allowedStatuses.includes(updates.status) ? updates.status : orders[index].status;
  const nextPaymentStatus = updates.paymentStatus && allowedPayments.includes(updates.paymentStatus) ? updates.paymentStatus : orders[index].paymentStatus;

  const updated = {
    ...orders[index],
    status: nextStatus,
    paymentStatus: nextPaymentStatus,
    notes: updates.notes ?? orders[index].notes ?? '',
    updatedAt: new Date().toISOString(),
  };

  orders[index] = updated;
  writeJson(ORDERS_FILE, orders);
  return updated;
}

module.exports = {
  init,
  getProducts,
  saveProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  saveOrder,
  updateOrder,
};

