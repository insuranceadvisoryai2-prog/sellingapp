import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useToast } from '../App.jsx';

export default function Cart() {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [address, setAddress] = useState('');
  const toast = useToast();
  const nav = useNavigate();

  const load = () => api.getCart().then(setCart).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const update = async (productId, qty) => {
    try { const c = await api.updateCartItem(productId, qty); setCart(c); }
    catch (e) { toast('❌ ' + e.message); }
  };

  const checkout = async () => {
    if (!address.trim()) { toast('Please enter delivery address'); return; }
    setOrdering(true);
    try {
      await api.createOrder({ address });
      toast('✅ Order placed successfully!');
      nav('/orders');
    } catch (e) {
      toast('❌ ' + e.message);
    } finally { setOrdering(false); }
  };

  const total = cart.items?.reduce((s, i) => s + i.unit_price * i.quantity, 0) || 0;

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Your Cart</h1>

      {!cart.items?.length ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ fontSize: 64 }}>🛒</div>
          <p style={{ fontSize: 20, fontWeight: 600, margin: '16px 0 8px' }}>Your cart is empty</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Browse Products</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cart.items.map(item => (
              <div key={item.product_id} className="card" style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'center' }}>
                <img src={item.image_url || 'https://via.placeholder.com/80'}
                  alt={item.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }}
                  onError={e => { e.target.src = 'https://via.placeholder.com/80'; }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.name}</p>
                  <p style={{ color: '#e53935', fontWeight: 700 }}>₹{Number(item.unit_price).toLocaleString('en-IN')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => update(item.product_id, item.quantity - 1)}
                    style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #e0e0e0', background: 'white', fontWeight: 700, cursor: 'pointer' }}>−</button>
                  <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => update(item.product_id, item.quantity + 1)}
                    style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #e0e0e0', background: 'white', fontWeight: 700, cursor: 'pointer' }}>+</button>
                </div>
                <div style={{ textAlign: 'right', minWidth: 80 }}>
                  <p style={{ fontWeight: 700 }}>₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}</p>
                  <button onClick={() => update(item.product_id, 0)} style={{ color: '#e53935', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20, height: 'fit-content' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
              <span>Items ({cart.items.length})</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontWeight: 700, fontSize: 18, borderTop: '1px solid #e0e0e0', paddingTop: 12 }}>
              <span>Total</span>
              <span style={{ color: '#e53935' }}>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <textarea value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Enter delivery address..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, minHeight: 80, resize: 'vertical', marginBottom: 12 }} />
            <button className="btn btn-primary btn-full" onClick={checkout} disabled={ordering}>
              {ordering ? 'Placing Order...' : '✅ Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
