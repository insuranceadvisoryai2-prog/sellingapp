const BASE = import.meta.env.VITE_API_URL || '';
function getToken() { return localStorage.getItem('token'); }
export function setToken(t) { localStorage.setItem('token', t); }
export function clearToken() { localStorage.removeItem('token'); localStorage.removeItem('user'); }
export function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
export function setUser(u) { localStorage.setItem('user', JSON.stringify(u)); }

async function req(path, opts={}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: b => req('/api/auth/register', { method:'POST', body:JSON.stringify(b) }),
  login: b => req('/api/auth/login', { method:'POST', body:JSON.stringify(b) }),
  adminLogin: b => req('/api/admin/login', { method:'POST', body:JSON.stringify(b) }),
  me: () => req('/api/auth/me'),

  getProducts: (p={}) => { const q=new URLSearchParams(p).toString(); return req(`/api/products${q?'?'+q:''}`); },
  getProduct: id => req(`/api/products/${id}`),
  getCategories: () => req('/api/products/categories'),

  getCart: () => req('/api/cart'),
  addToCart: (productId, quantity=1) => req('/api/cart',{ method:'POST', body:JSON.stringify({productId,quantity}) }),
  updateCartItem: (productId, quantity) => req(`/api/cart/${productId}`,{ method:'PUT', body:JSON.stringify({quantity}) }),
  clearCart: () => req('/api/cart',{ method:'DELETE' }),

  createOrder: b => req('/api/orders',{ method:'POST', body:JSON.stringify(b) }),
  getOrders: () => req('/api/orders'),
  getOrder: id => req(`/api/orders/${id}`),

  adminGetProducts: (page=1, status='') => req(`/api/admin/products?page=${page}${status?'&status='+status:''}`),
  adminPendingCount: () => req('/api/admin/products/pending-count'),
  adminCreateProduct: b => req('/api/admin/products',{ method:'POST', body:JSON.stringify(b) }),
  adminUpdateProduct: (id,b) => req(`/api/admin/products/${id}`,{ method:'PUT', body:JSON.stringify(b) }),
  adminDeleteProduct: id => req(`/api/admin/products/${id}`,{ method:'DELETE' }),
  adminApprove: id => req(`/api/admin/products/${id}/approve`,{ method:'POST' }),
  adminReject: id => req(`/api/admin/products/${id}/reject`,{ method:'POST' }),
  adminApproveAll: () => req('/api/admin/products/approve-all',{ method:'POST' }),
  adminScrape: (query, sites) => req('/api/admin/scrape',{ method:'POST', body:JSON.stringify({query,sites}) }),
  adminScrapeJobs: () => req('/api/admin/scrape/jobs'),
};

// Browser-side scrape + save directly
export async function browserScrapeAndSave(productData) {
  // Save scraped product directly as pending via admin API
  return api.adminCreateProduct({
    ...productData,
    source_site: 'wholesale',
    is_published: false,
    approval_status: 'pending',
  });
}
