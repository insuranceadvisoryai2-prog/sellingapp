// api.js — Drop into your Vercel frontend
// Works with plain JS, React, Next.js, Vue, etc.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL   // Next.js
             ?? process.env.VITE_API_URL            // Vite / React
             ?? "https://your-api.onrender.com";    // fallback

// ─────────────────────────────────────────────────────────────────────────────
// Token helpers (localStorage — swap for httpOnly cookie in high-security apps)
// ─────────────────────────────────────────────────────────────────────────────
export const getToken  = ()        => localStorage.getItem("token");
export const setToken  = (token)   => localStorage.setItem("token", token);
export const clearToken = ()       => localStorage.removeItem("token");

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────
async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (!token) throw new Error("Not authenticated.");
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed.");
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const auth = {
  async register(username, email, password) {
    const data = await request("/api/auth/register", {
      method: "POST",
      body: { username, email, password },
    });
    setToken(data.data.token);
    return data.data;
  },

  async login(username, password) {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
    setToken(data.data.token);
    return data.data;
  },

  logout() {
    clearToken();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
export const products = {
  getAll({ category, search, page = 1, pageSize = 20 } = {}) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search)   params.set("search",   search);
    params.set("page",     page);
    params.set("pageSize", pageSize);
    return request(`/api/products?${params}`);
  },

  getById(id) {
    return request(`/api/products/${id}`);
  },

  getCategories() {
    return request("/api/products/categories");
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────
export const cart = {
  get()                          { return request("/api/cart", { auth: true }); },
  addItem(productId, quantity)   {
    return request("/api/cart/items", { method: "POST", body: { productId, quantity }, auth: true });
  },
  updateItem(productId, quantity) {
    return request(`/api/cart/items/${productId}`, { method: "PUT", body: { quantity }, auth: true });
  },
  removeItem(productId) {
    return request(`/api/cart/items/${productId}`, { method: "DELETE", auth: true });
  },
  clear() { return request("/api/cart", { method: "DELETE", auth: true }); },
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────
export const orders = {
  create(notes)  { return request("/api/orders", { method: "POST", body: { notes }, auth: true }); },
  getAll(page=1) { return request(`/api/orders?page=${page}`, { auth: true }); },
  getById(id)    { return request(`/api/orders/${id}`, { auth: true }); },
};
