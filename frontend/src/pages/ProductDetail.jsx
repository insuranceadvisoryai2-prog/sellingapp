// ProductDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth, useToast } from '../App.jsx';

export function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProduct(id).then(setProduct).catch(() => nav('/products')).finally(() => setLoading(false));
  }, [id]);

  const addToCart = async () => {
    if (!user) { toast('Please login first'); nav('/login'); return; }
    try { await api.addToCart(product.id, qty); toast('✅ Added to cart!'); }
    catch (e) { toast('❌ ' + e.message); }
  };

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!product) return null;

  const discount = product.discount_pct || (product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100) : 0);

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: 960 }}>
      <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#e53935', fontWeight: 600, marginBottom: 20, cursor: 'pointer' }}>
        ← Back
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <img src={product.image_url || 'https://via.placeholder.com/500?text=No+Image'}
            alt={product.name}
            style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 400 }}
            onError={e => { e.target.src = 'https://via.placeholder.com/500?text=No+Image'; }} />
        </div>
        <div>
          {product.brand && <p style={{ color: '#757575', fontSize: 13, marginBottom: 6 }}>{product.brand}</p>}
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, lineHeight: 1.4 }}>{product.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#e53935' }}>₹{Number(product.price).toLocaleString('en-IN')}</span>
            {product.original_price > product.price && (
              <span style={{ fontSize: 16, color: '#9e9e9e', textDecoration: 'line-through' }}>₹{Number(product.original_price).toLocaleString('en-IN')}</span>
            )}
            {discount > 0 && <span style={{ background: '#e53935', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 700 }}>{discount}% off</span>}
          </div>
          {product.min_order > 1 && <p style={{ color: '#ff6f00', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Min. order: {product.min_order} {product.unit || 'pieces'}</p>}
          {product.description && <p style={{ color: '#555', lineHeight: 1.6, marginBottom: 20 }}>{product.description}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <label style={{ fontWeight: 600 }}>Qty:</label>
            <input type="number" value={qty} min={product.min_order || 1} onChange={e => setQty(+e.target.value)}
              style={{ width: 70, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 6, textAlign: 'center' }} />
          </div>
          <button className="btn btn-primary btn-full" onClick={addToCart} style={{ fontSize: 16, padding: '14px' }}>
            🛒 Add to Cart
          </button>
          {product.source_url && (
            <a href={product.source_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', textAlign: 'center', marginTop: 12, color: '#757575', fontSize: 13 }}>
              View original on {product.source_site}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
