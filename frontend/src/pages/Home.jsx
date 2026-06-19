import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { CATEGORIES, getCategoryIcon, getCategoryColor } from '../utils/categories.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([api.getProducts({ limit:12 }), api.getCategories()])
      .then(([p,c]) => { setProducts(p.products||[]); setCategories(c||[]); })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => { e.preventDefault(); if (search.trim()) nav(`/products?search=${encodeURIComponent(search)}`); };

  return (
    <div>
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#b71c1c 0%,#e53935 50%,#ff6f00 100%)', color:'white', padding:'60px 16px', textAlign:'center' }}>
        <h1 style={{ fontSize:'clamp(24px,5vw,48px)', fontWeight:800, marginBottom:12 }}>India's #1 Wholesale Marketplace</h1>
        <p style={{ fontSize:16, opacity:0.9, marginBottom:32 }}>Buy in bulk at factory prices. Direct to your doorstep.</p>
        <form onSubmit={handleSearch} style={{ display:'flex', maxWidth:560, margin:'0 auto', gap:8 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search products, categories, brands..."
            style={{ flex:1, padding:'14px 18px', borderRadius:8, border:'none', fontSize:16, outline:'none' }} />
          <button type="submit" className="btn btn-accent" style={{ padding:'14px 24px', borderRadius:8, fontSize:15 }}>Search</button>
        </form>
      </div>

      {/* Categories */}
      {/* Shop by Category — always show all standard cats, highlight ones with products */}
      <div className="container" style={{ padding:'32px 16px 0' }}>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:20 }}>Shop by Category</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12 }}>
          {CATEGORIES.map(cat => {
            const dbCat = categories.find(c => c.category === cat.name);
            const count = dbCat ? parseInt(dbCat.count) : 0;
            return (
              <Link key={cat.name}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                style={{ background:'white', borderRadius:12, padding:'16px 10px', textAlign:'center',
                  boxShadow: count>0 ? '0 2px 8px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
                  textDecoration:'none', border: count>0 ? `2px solid ${cat.color}20` : '1px solid #f0f0f0',
                  opacity: count>0 ? 1 : 0.5, transition:'all .2s', display:'block' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 6px 16px ${cat.color}30`; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow= count>0?'0 2px 8px rgba(0,0,0,0.1)':'0 1px 4px rgba(0,0,0,0.05)'; }}>
                <div style={{ fontSize:32, marginBottom:8 }}>{cat.icon}</div>
                <p style={{ fontSize:12, fontWeight:700, color:'#212121', lineHeight:1.3 }}>{cat.name}</p>
                {count > 0 && <p style={{ fontSize:11, color: cat.color, fontWeight:700, marginTop:4 }}>{count} products</p>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Products */}
      <div className="container" style={{ padding:'32px 16px 48px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:20, fontWeight:700 }}>Featured Products</h2>
          <Link to="/products" style={{ color:'#e53935', fontWeight:600, fontSize:14 }}>View All →</Link>
        </div>
        {loading ? <div className="spinner"/> : products.length===0 ? (
          <div style={{ textAlign:'center', padding:60, color:'#757575' }}>
            <div style={{ fontSize:48 }}>📦</div>
            <p style={{ fontSize:18, fontWeight:600 }}>No products yet</p>
            <p style={{ marginTop:8 }}>Check back soon!</p>
          </div>
        ) : (
          <div className="grid-products">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>
        )}
      </div>

      {/* Features */}
      <div style={{ background:'#212121', color:'white', padding:'40px 16px' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:32, textAlign:'center' }}>
            {[
              {icon:'🏭',title:'Factory Prices',desc:'Direct from manufacturers'},
              {icon:'📦',title:'Bulk Orders',desc:'Save more when you buy more'},
              {icon:'🚚',title:'Pan-India Delivery',desc:'Ship anywhere in India'},
              {icon:'🔒',title:'Secure Payments',desc:'100% safe transactions'},
            ].map(f=>(
              <div key={f.title}>
                <div style={{ fontSize:36, marginBottom:8 }}>{f.icon}</div>
                <div style={{ fontWeight:700, marginBottom:4 }}>{f.title}</div>
                <div style={{ fontSize:13, opacity:0.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
