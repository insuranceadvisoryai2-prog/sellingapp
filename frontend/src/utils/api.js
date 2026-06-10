// src/utils/api.js
const BASE = import.meta.env.VITE_API_URL || '';

function getToken() { return localStorage.getItem('token'); }
export function setToken(t) { localStorage.setItem('token', t); }
export function clearToken() { localStorage.removeItem('token'); localStorage.removeItem('user'); }
export function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}
export function setUser(u) { localStorage.setItem('user', JSON.stringify(u)); }

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register: (body) => req('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => req('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  adminLogin: (body) => req('/api/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => req('/api/auth/me'),

  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/products${q ? '?' + q : ''}`);
  },
  getProduct: (id) => req(`/api/products/${id}`),
  getCategories: () => req('/api/products/categories'),

  // Cart
  getCart: () => req('/api/cart'),
  addToCart: (productId, quantity = 1) => req('/api/cart', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  updateCartItem: (productId, quantity) => req(`/api/cart/${productId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  clearCart: () => req('/api/cart', { method: 'DELETE' }),

  // Orders
  createOrder: (body) => req('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrders: () => req('/api/orders'),
  getOrder: (id) => req(`/api/orders/${id}`),

  // Admin
  adminGetProducts: (page = 1) => req(`/api/admin/products?page=${page}`),
  adminCreateProduct: (body) => req('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateProduct: (id, body) => req(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDeleteProduct: (id) => req(`/api/admin/products/${id}`, { method: 'DELETE' }),
  adminScrape: (query, sites) => req('/api/admin/scrape', { method: 'POST', body: JSON.stringify({ query, sites }) }),
  adminScrapeJobs: () => req('/api/admin/scrape/jobs'),
};
