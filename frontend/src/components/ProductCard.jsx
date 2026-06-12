import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../App.jsx';
import { useToast } from '../App.jsx';

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const toast = useToast();

  const addToCart = async (e) => {
    e.preventDefault();
    if (!user) { toast('Please login to add to cart'); return; }
    try {
      await api.addToCart(product.id, 1);
      toast('✅ Added to cart!');
    } catch (err) {
      toast('❌ ' + err.message);
    }
  };

  const discount = product.discount_pct || (product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100) : 0);

  return (
    <Link to={`/products/${product.id}`} className="card" style={{ display: 'flex', flexDirection: 'column', transition: 'transform .2s, box-shadow .2s', textDecoration: 'none' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
    >
      <div style={{ position: 'relative', paddingTop: '100%', background: '#f5f5f5' }}>
        <img
          src={product.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}
          alt={product.name}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
        />
        {discount > 0 && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: '#e53935', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
            {discount}% OFF
          </span>
        )}
        {product.source_site && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize' }}>
            {product.source_site}
          </span>
        )}
      </div>
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#212121', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e53935' }}>
            ₹{Number(product.price).toLocaleString('en-IN')}
          </span>
          {product.original_price > product.price && (
            <span style={{ fontSize: 12, color: '#9e9e9e', textDecoration: 'line-through' }}>
              ₹{Number(product.original_price).toLocaleString('en-IN')}
            </span>
          )}
        </div>
        {product.min_order > 1 && (
          <p style={{ fontSize: 11, color: '#757575' }}>Min order: {product.min_order} {product.unit || 'pieces'}</p>
        )}
        <button className="btn btn-primary btn-full btn-sm" onClick={addToCart} style={{ marginTop: 6 }}>
          Add to Cart
        </button>
      </div>
    </Link>
  );
}
