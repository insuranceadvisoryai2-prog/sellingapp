import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');

  const category = params.get('category') || '';
  const page = parseInt(params.get('page') || '1');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const searchVal = params.get('search') || '';
    setSearch(searchVal);
    api.getProducts({ category, search: searchVal, page, limit: 24 })
      .then(data => { setProducts(data.products || []); setTotal(data.total || 0); setPages(data.pages || 1); })
      .finally(() => setLoading(false));
  }, [params.toString()]);

  const setFilter = (key, val) => {
    const p = new URLSearchParams(params);
    if (val) p.set(key, val); else p.delete(key);
    p.set('page', '1');
    setParams(p);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilter('search', search);
  };

  return (
    <div className="container" style={{ padding: '24px 16px' }}>
      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14 }} />
        <button type="submit" className="btn btn-primary">Search</button>
        {(search || category) && (
          <button type="button" className="btn btn-outline btn-sm"
            onClick={() => { setSearch(''); setParams({}); }}>Clear</button>
        )}
      </form>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar filters */}
        <aside style={{ width: 200, flexShrink: 0, display: 'window.innerWidth > 768px ? block : none' }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Categories</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => setFilter('category', '')}
                style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 6, background: !category ? '#ffebee' : 'transparent', color: !category ? '#e53935' : '#212121', fontWeight: !category ? 700 : 400, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                All Categories
              </button>
              {categories.map(c => (
                <button key={c.category} onClick={() => setFilter('category', c.category)}
                  style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 6, background: category === c.category ? '#ffebee' : 'transparent', color: category === c.category ? '#e53935' : '#212121', fontWeight: category === c.category ? 700 : 400, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  {c.category} ({c.count})
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Products grid */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ color: '#757575', fontSize: 14 }}>
              {total} products {category && `in "${category}"`} {search && `for "${search}"`}
            </p>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#757575' }}>
              <div style={{ fontSize: 48 }}>🔍</div>
              <p style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>No products found</p>
            </div>
          ) : (
            <>
              <div className="grid-products">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
              {pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
                  {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setFilter('page', p)}
                      style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid #e0e0e0', background: p === page ? '#e53935' : 'white', color: p === page ? 'white' : '#212121', fontWeight: 600, cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
