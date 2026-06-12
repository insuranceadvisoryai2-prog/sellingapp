// Orders.jsx
import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getOrders().then(setOrders).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>My Orders</h1>
      {!orders.length ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ fontSize: 64 }}>📦</div>
          <p style={{ fontSize: 18, fontWeight: 600, margin: '16px 0' }}>No orders yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(o => (
            <div key={o.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>Order #{o.id}</p>
                  <p style={{ color: '#757575', fontSize: 13, marginTop: 4 }}>{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {o.address && <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>📍 {o.address}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#e53935' }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</p>
                  <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: o.status === 'pending' ? '#fff8e1' : o.status === 'delivered' ? '#e8f5e9' : '#e3f2fd',
                    color: o.status === 'pending' ? '#f9a825' : o.status === 'delivered' ? '#2e7d32' : '#1565c0' }}>
                    {o.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
