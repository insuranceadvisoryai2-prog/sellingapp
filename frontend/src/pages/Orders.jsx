import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, updateOrderStatus } from '../utils/api.js';
import { useAuth, useToast } from '../App.jsx';

const STATUS_CONFIG = {
  pending:    { label:'Pending',    bg:'#fff8e1', color:'#f57f17', icon:'⏳' },
  confirmed:  { label:'Confirmed',  bg:'#e3f2fd', color:'#1565c0', icon:'✅' },
  processing: { label:'Processing', bg:'#f3e5f5', color:'#6a1b9a', icon:'⚙️' },
  shipped:    { label:'Shipped',    bg:'#e8f5e9', color:'#2e7d32', icon:'🚚' },
  delivered:  { label:'Delivered',  bg:'#e8f5e9', color:'#1b5e20', icon:'📦' },
  cancelled:  { label:'Cancelled',  bg:'#ffebee', color:'#c62828', icon:'❌' },
};

const PAYMENT_ICONS = {
  cod: '💵', upi: '📱', bank_transfer: '🏦', card: '💳',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ background:cfg.bg, color:cfg.color, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── ADMIN ORDER CARD ──────────────────────────────────────────────────────────
function AdminOrderCard({ order, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems]       = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [updating, setUpdating] = useState(false);
  const toast = useToast();

  const loadItems = async () => {
    if (items.length) { setExpanded(e=>!e); return; }
    setLoadingItems(true);
    try {
      const data = await api.getOrder(order.id);
      setItems(data.items || []);
      setExpanded(true);
    } catch { toast('❌ Failed to load order items'); }
    finally { setLoadingItems(false); }
  };

  const changeStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      toast(`✅ Status updated to ${newStatus}`);
      onStatusChange();
    } catch(e) { toast('❌ '+e.message); }
    finally { setUpdating(false); }
  };

  // Parse customer info from fields
  const customerName   = order.customer_name   || order.username || '—';
  const customerMobile = order.customer_mobile  || '—';
  const customerEmail  = order.customer_email   || order.user_email || '—';
  const paymentMethod  = order.payment_method   || 'cod';
  const address        = order.address          || '—';

  return (
    <div style={{ background:'white', borderRadius:12, boxShadow:'0 2px 10px rgba(0,0,0,0.08)', overflow:'hidden', border:'1px solid #f0f0f0' }}>

      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #f5f5f5', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <span style={{ fontWeight:800, fontSize:15 }}>Order #{order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <p style={{ fontSize:12, color:'#9e9e9e' }}>
            {new Date(order.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontWeight:800, fontSize:20, color:'#e53935' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
          <span style={{ fontSize:12, color:'#757575' }}>{PAYMENT_ICONS[paymentMethod]} {paymentMethod.replace('_',' ').toUpperCase()}</span>
        </div>
      </div>

      {/* Customer Details — Admin Only */}
      <div style={{ padding:'14px 20px', background:'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#9e9e9e', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Customer Information</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
          <div>
            <p style={{ fontSize:11, color:'#9e9e9e' }}>Name</p>
            <p style={{ fontWeight:700, fontSize:14 }}>👤 {customerName}</p>
          </div>
          <div>
            <p style={{ fontSize:11, color:'#9e9e9e' }}>Mobile</p>
            <p style={{ fontWeight:700, fontSize:14 }}>📞 {customerMobile}</p>
          </div>
          <div>
            <p style={{ fontSize:11, color:'#9e9e9e' }}>Email</p>
            <p style={{ fontSize:13, color:'#555' }}>✉️ {customerEmail}</p>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <p style={{ fontSize:11, color:'#9e9e9e' }}>Delivery Address</p>
            <p style={{ fontSize:13, color:'#333', lineHeight:1.5 }}>📍 {address}</p>
          </div>
        </div>
      </div>

      {/* Status Update */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#555' }}>Update Status:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} disabled={updating || order.status===key}
            onClick={() => changeStatus(key)}
            style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor: order.status===key?'default':'pointer',
              background: order.status===key ? cfg.bg : '#f5f5f5',
              color: order.status===key ? cfg.color : '#757575',
              fontWeight: order.status===key ? 800 : 500,
              fontSize:12, opacity: updating?0.6:1 }}>
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {/* Order Items toggle */}
      <div style={{ padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={loadItems} style={{ background:'none', border:'none', color:'#1565c0', fontWeight:700, cursor:'pointer', fontSize:13 }}>
          {loadingItems ? '⏳ Loading...' : expanded ? '▲ Hide Order Items' : `▼ View Order Items (${order.item_count||''})`}
        </button>
        {order.notes && <span style={{ fontSize:12, color:'#757575' }}>Note: {order.notes}</span>}
      </div>

      {/* Expanded Items — Admin sees source_url */}
      {expanded && items.length > 0 && (
        <div style={{ padding:'0 20px 16px', borderTop:'1px solid #f5f5f5' }}>
          {items.map((item, i) => {
            const img = item.product_image || item.live_image || '';
            const source = item.product_source_url || item.live_source || '';
            return (
              <div key={i} style={{ display:'flex', gap:14, padding:'12px 0', borderBottom: i<items.length-1?'1px solid #f5f5f5':'none', alignItems:'center' }}>
                {/* Product image */}
                <div style={{ width:64, height:64, flexShrink:0, borderRadius:8, overflow:'hidden', background:'#f5f5f5', border:'1px solid #e0e0e0' }}>
                  {img ? (
                    <img src={img} alt={item.product_name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none';}}/>
                  ) : (
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>📦</div>
                  )}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{item.product_name}</p>
                  <p style={{ fontSize:12, color:'#757575' }}>
                    Qty: <strong>{item.quantity}</strong> × ₹{Number(item.unit_price).toLocaleString('en-IN')} = <strong>₹{(item.quantity * item.unit_price).toLocaleString('en-IN')}</strong>
                  </p>
                  {/* Source link — admin only */}
                  {source && (
                    <a href={source} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:11, color:'#1565c0', fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, marginTop:4 }}>
                      🔗 View Source Product ↗
                    </a>
                  )}
                </div>

                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontWeight:800, fontSize:15, color:'#e53935' }}>₹{(item.quantity * item.unit_price).toLocaleString('en-IN')}</p>
                </div>
              </div>
            );
          })}
          {/* Order total */}
          <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:12, borderTop:'2px solid #f0f0f0', marginTop:8 }}>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:12, color:'#757575' }}>Order Total</p>
              <p style={{ fontWeight:900, fontSize:20, color:'#e53935' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CUSTOMER ORDER CARD ───────────────────────────────────────────────────────
function CustomerOrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems]       = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const toast = useToast();

  const loadItems = async () => {
    if (items.length) { setExpanded(e=>!e); return; }
    setLoadingItems(true);
    try {
      const data = await api.getOrder(order.id);
      setItems(data.items || []);
      setExpanded(true);
    } catch { toast('❌ Failed'); }
    finally { setLoadingItems(false); }
  };

  return (
    <div style={{ background:'white', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', overflow:'hidden', border:'1px solid #f0f0f0' }}>

      {/* Header */}
      <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <span style={{ fontWeight:800, fontSize:15 }}>Order #{order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <p style={{ fontSize:12, color:'#9e9e9e' }}>
            Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
          </p>
          {order.address && (
            <p style={{ fontSize:12, color:'#555', marginTop:4 }}>📍 {order.address}</p>
          )}
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontWeight:800, fontSize:20, color:'#e53935' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
          {order.payment_method && (
            <p style={{ fontSize:12, color:'#757575', marginTop:2 }}>
              {PAYMENT_ICONS[order.payment_method]} {order.payment_method.replace('_',' ')}
            </p>
          )}
        </div>
      </div>

      {/* Status timeline */}
      <div style={{ padding:'0 20px 14px' }}>
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          {['pending','confirmed','processing','shipped','delivered'].map((s, i, arr) => {
            const statusOrder = ['pending','confirmed','processing','shipped','delivered','cancelled'];
            const currentIdx = statusOrder.indexOf(order.status);
            const stepIdx = statusOrder.indexOf(s);
            const done = order.status === 'cancelled' ? false : stepIdx <= currentIdx;
            const active = s === order.status;
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', flex: i<arr.length-1?1:0 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11,
                    background: done ? '#e53935' : '#f0f0f0', color: done ? 'white' : '#bdbdbd', fontWeight:800, border: active ? '3px solid #e53935' : 'none' }}>
                    {done ? '✓' : i+1}
                  </div>
                  <span style={{ fontSize:9, marginTop:3, color: done?'#e53935':'#bdbdbd', fontWeight:done?700:400, whiteSpace:'nowrap' }}>{cfg.label}</span>
                </div>
                {i<arr.length-1 && <div style={{ flex:1, height:2, background: done && stepIdx < currentIdx ? '#e53935' : '#f0f0f0', margin:'0 3px', marginBottom:16 }}/>}
              </div>
            );
          })}
        </div>
        {order.status === 'cancelled' && (
          <p style={{ fontSize:12, color:'#c62828', marginTop:8, fontWeight:600 }}>❌ This order was cancelled</p>
        )}
      </div>

      {/* View items toggle */}
      <div style={{ padding:'10px 20px', borderTop:'1px solid #f5f5f5' }}>
        <button onClick={loadItems} style={{ background:'none', border:'none', color:'#1565c0', fontWeight:700, cursor:'pointer', fontSize:13 }}>
          {loadingItems ? '⏳ Loading...' : expanded ? '▲ Hide Items' : '▼ View Items'}
        </button>
      </div>

      {/* Items — customer view, no source links */}
      {expanded && items.length > 0 && (
        <div style={{ padding:'0 20px 16px', borderTop:'1px solid #f5f5f5' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display:'flex', gap:14, padding:'12px 0', borderBottom: i<items.length-1?'1px solid #f5f5f5':'none', alignItems:'center' }}>
              <div style={{ width:60, height:60, flexShrink:0, borderRadius:8, overflow:'hidden', background:'#f5f5f5' }}>
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none';}}/>
                ) : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📦</div>}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:14 }}>{item.product_name}</p>
                <p style={{ fontSize:12, color:'#757575', marginTop:2 }}>Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}</p>
              </div>
              <p style={{ fontWeight:800, color:'#e53935', fontSize:15 }}>₹{(item.quantity * item.unit_price).toLocaleString('en-IN')}</p>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:12, borderTop:'1px solid #f0f0f0', marginTop:4 }}>
            <span style={{ fontSize:13, color:'#757575' }}>Total Amount</span>
            <span style={{ fontWeight:900, fontSize:18, color:'#e53935' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN ORDERS PAGE ──────────────────────────────────────────────────────────
export default function Orders() {
  const { user }           = useAuth();
  const nav                = useNavigate();
  const toast              = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const isAdmin = user?.role === 'admin';

  const load = () => {
    setLoading(true);
    api.getOrders()
      .then(setOrders)
      .catch(() => toast('❌ Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container" style={{ padding:'32px 16px', maxWidth: isAdmin ? 1000 : 800 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800 }}>
            {isAdmin ? '📋 All Orders' : '📦 My Orders'}
          </h1>
          <p style={{ color:'#757575', fontSize:13, marginTop:4 }}>
            {isAdmin ? `${orders.length} total orders` : `${orders.length} order${orders.length!==1?'s':''} placed`}
          </p>
        </div>
        <button onClick={load} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600, fontSize:13 }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats (admin only) */}
      {isAdmin && orders.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:24 }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} onClick={() => setFilter(filter===key?'all':key)}
              style={{ background: filter===key ? cfg.bg : 'white', border: `1px solid ${filter===key ? cfg.color : '#e0e0e0'}`,
                borderRadius:10, padding:'12px 14px', cursor:'pointer', transition:'all .15s', textAlign:'center' }}>
              <p style={{ fontSize:20, marginBottom:4 }}>{cfg.icon}</p>
              <p style={{ fontWeight:900, fontSize:18, color: filter===key ? cfg.color : '#212121' }}>{statusCounts[key]||0}</p>
              <p style={{ fontSize:11, color:'#9e9e9e', marginTop:2 }}>{cfg.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs (customer) */}
      {!isAdmin && (
        <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
          {['all','pending','confirmed','shipped','delivered','cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filter===s?'#e53935':'#e0e0e0'}`,
                background: filter===s ? '#e53935' : 'white', color: filter===s ? 'white' : '#555',
                fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize' }}>
              {s === 'all' ? 'All Orders' : STATUS_CONFIG[s]?.icon + ' ' + STATUS_CONFIG[s]?.label}
              {s !== 'all' && statusCounts[s] ? ` (${statusCounts[s]})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="spinner" style={{ marginTop:60 }} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:80, color:'#757575' }}>
          <div style={{ fontSize:64, marginBottom:16 }}>📭</div>
          <p style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>
            {orders.length === 0 ? 'No orders yet' : `No ${filter} orders`}
          </p>
          {orders.length === 0 && !isAdmin && (
            <button onClick={() => nav('/products')}
              style={{ marginTop:16, padding:'12px 28px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:15 }}>
              Start Shopping
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {filtered.map(order => isAdmin
            ? <AdminOrderCard key={order.id} order={order} onStatusChange={load} />
            : <CustomerOrderCard key={order.id} order={order} />
          )}
        </div>
      )}
    </div>
  );
}
