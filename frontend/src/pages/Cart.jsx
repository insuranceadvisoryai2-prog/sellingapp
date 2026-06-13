import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useToast } from '../App.jsx';

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli','Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const EMPTY_DETAILS = {
  full_name:'', mobile:'', alt_mobile:'', email:'',
  address_line:'', street:'', landmark:'', pincode:'', state:'',
};

export default function Cart() {
  const [cart, setCart]       = useState({ items:[] });
  const [loading, setLoading] = useState(true);
  const [step, setStep]       = useState('cart'); // 'cart' | 'details' | 'confirm'
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [errors, setErrors]   = useState({});
  const [ordering, setOrdering] = useState(false);
  const toast  = useToast();
  const nav    = useNavigate();

  const load = () => api.getCart().then(setCart).catch(()=>{}).finally(()=>setLoading(false));
  useEffect(() => { load(); }, []);

  const update = async (productId, qty) => {
    try { const c = await api.updateCartItem(productId, qty); setCart(c); }
    catch (e) { toast('❌ '+e.message); }
  };

  const total = cart.items?.reduce((s,i) => s + i.unit_price * i.quantity, 0) || 0;

  // ── Validate customer details ──
  const validate = () => {
    const e = {};
    if (!details.full_name.trim())     e.full_name    = 'Full name is required';
    if (!details.mobile.trim())        e.mobile       = 'Mobile number is required';
    else if (!/^[6-9]\d{9}$/.test(details.mobile.replace(/\s/g,''))) e.mobile = 'Enter valid 10-digit mobile number';
    if (details.alt_mobile && !/^[6-9]\d{9}$/.test(details.alt_mobile.replace(/\s/g,''))) e.alt_mobile = 'Enter valid 10-digit number';
    if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) e.email = 'Enter valid email address';
    if (!details.address_line.trim())  e.address_line = 'Address is required';
    if (!details.pincode.trim())       e.pincode      = 'Pincode is required';
    else if (!/^\d{6}$/.test(details.pincode)) e.pincode = 'Enter valid 6-digit pincode';
    if (!details.state)                e.state        = 'Please select state';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setDetails(d => ({ ...d, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  };

  const proceedToDetails = () => {
    if (!cart.items?.length) { toast('Cart is empty'); return; }
    setStep('details');
    window.scrollTo(0,0);
  };

  const proceedToConfirm = () => {
    if (!validate()) { toast('❌ Please fix the errors below'); return; }
    setStep('confirm');
    window.scrollTo(0,0);
  };

  const placeOrder = async () => {
    setOrdering(true);
    try {
      const addressStr = [
        details.address_line,
        details.street,
        details.landmark ? `Landmark: ${details.landmark}` : '',
        details.pincode,
        details.state,
      ].filter(Boolean).join(', ');

      await api.createOrder({
        address: addressStr,
        notes: `Customer: ${details.full_name} | Mobile: ${details.mobile}${details.alt_mobile?' / '+details.alt_mobile:''} | Email: ${details.email||'N/A'}`,
        customer_name:   details.full_name,
        customer_mobile: details.mobile,
        customer_email:  details.email,
      });
      toast('✅ Order placed successfully!');
      nav('/orders');
    } catch (e) { toast('❌ '+e.message); }
    finally { setOrdering(false); }
  };

  if (loading) return <div className="spinner" style={{ marginTop:80 }} />;

  // ── STEP: CART ──────────────────────────────────────────────────────────────
  if (step === 'cart') return (
    <div className="container" style={{ padding:'32px 16px', maxWidth:960 }}>
      <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>🛒 Your Cart</h1>
      {!cart.items?.length ? (
        <div style={{ textAlign:'center', padding:80 }}>
          <div style={{ fontSize:64 }}>🛒</div>
          <p style={{ fontSize:20, fontWeight:600, margin:'16px 0 8px' }}>Your cart is empty</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop:16, display:'inline-flex' }}>Browse Products</Link>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {cart.items.map(item=>(
              <div key={item.product_id} className="card" style={{ display:'flex', gap:16, padding:16, alignItems:'center' }}>
                <img src={item.image_url||'https://via.placeholder.com/80'} alt={item.name}
                  style={{ width:80, height:80, objectFit:'cover', borderRadius:6 }}
                  onError={e=>{e.target.src='https://via.placeholder.com/80';}} />
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{item.name}</p>
                  <p style={{ color:'#e53935', fontWeight:700 }}>₹{Number(item.unit_price).toLocaleString('en-IN')}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={()=>update(item.product_id, item.quantity-1)}
                    style={{ width:28, height:28, borderRadius:4, border:'1px solid #e0e0e0', background:'white', fontWeight:700, cursor:'pointer' }}>−</button>
                  <span style={{ fontWeight:700, minWidth:24, textAlign:'center' }}>{item.quantity}</span>
                  <button onClick={()=>update(item.product_id, item.quantity+1)}
                    style={{ width:28, height:28, borderRadius:4, border:'1px solid #e0e0e0', background:'white', fontWeight:700, cursor:'pointer' }}>+</button>
                </div>
                <div style={{ textAlign:'right', minWidth:90 }}>
                  <p style={{ fontWeight:700 }}>₹{(item.unit_price*item.quantity).toLocaleString('en-IN')}</p>
                  <button onClick={()=>update(item.product_id,0)} style={{ color:'#e53935', background:'none', border:'none', fontSize:12, cursor:'pointer', marginTop:4 }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:20, height:'fit-content' }}>
            <h3 style={{ fontWeight:700, marginBottom:16 }}>Order Summary</h3>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:14 }}>
              <span>Items ({cart.items.length})</span><span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20, fontWeight:700, fontSize:18, borderTop:'1px solid #e0e0e0', paddingTop:12 }}>
              <span>Total</span><span style={{ color:'#e53935' }}>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <button className="btn btn-primary btn-full" onClick={proceedToDetails} style={{ padding:14, fontSize:16 }}>
              Proceed to Checkout →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── STEP: CUSTOMER DETAILS ──────────────────────────────────────────────────
  if (step === 'details') return (
    <div className="container" style={{ padding:'32px 16px', maxWidth:700 }}>
      <button onClick={()=>setStep('cart')} style={{ background:'none', border:'none', color:'#e53935', fontWeight:600, marginBottom:20, cursor:'pointer', fontSize:14 }}>
        ← Back to Cart
      </button>
      <h1 style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>📋 Delivery Details</h1>
      <p style={{ color:'#757575', marginBottom:28 }}>Please fill in your details for delivery</p>

      <div className="card" style={{ padding:28 }}>
        <h3 style={{ fontWeight:700, marginBottom:20, fontSize:16, color:'#e53935' }}>Personal Information</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>

          {/* Full Name */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={LS}>Full Name *</label>
            <input name="full_name" value={details.full_name} onChange={handleDetailsChange}
              placeholder="Enter your full name" style={IS(errors.full_name)} />
            {errors.full_name && <p style={ES}>{errors.full_name}</p>}
          </div>

          {/* Mobile */}
          <div>
            <label style={LS}>Mobile Number *</label>
            <input name="mobile" value={details.mobile} onChange={handleDetailsChange}
              placeholder="10-digit mobile number" maxLength={10} style={IS(errors.mobile)} />
            {errors.mobile && <p style={ES}>{errors.mobile}</p>}
          </div>

          {/* Alternate Mobile */}
          <div>
            <label style={LS}>Alternate Mobile <span style={{ color:'#9e9e9e', fontWeight:400 }}>(optional)</span></label>
            <input name="alt_mobile" value={details.alt_mobile} onChange={handleDetailsChange}
              placeholder="Alternate number" maxLength={10} style={IS(errors.alt_mobile)} />
            {errors.alt_mobile && <p style={ES}>{errors.alt_mobile}</p>}
          </div>

          {/* Email */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={LS}>Email Address <span style={{ color:'#9e9e9e', fontWeight:400 }}>(optional)</span></label>
            <input name="email" type="email" value={details.email} onChange={handleDetailsChange}
              placeholder="your@email.com" style={IS(errors.email)} />
            {errors.email && <p style={ES}>{errors.email}</p>}
          </div>
        </div>

        <h3 style={{ fontWeight:700, marginBottom:20, fontSize:16, color:'#e53935', borderTop:'1px solid #f0f0f0', paddingTop:20 }}>Delivery Address</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Address Line */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={LS}>House / Flat / Building No. *</label>
            <input name="address_line" value={details.address_line} onChange={handleDetailsChange}
              placeholder="e.g. Flat 101, Sunrise Apartments" style={IS(errors.address_line)} />
            {errors.address_line && <p style={ES}>{errors.address_line}</p>}
          </div>

          {/* Street */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={LS}>Street / Area / Colony</label>
            <input name="street" value={details.street} onChange={handleDetailsChange}
              placeholder="e.g. MG Road, Koramangala" style={IS()} />
          </div>

          {/* Landmark */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={LS}>Landmark <span style={{ color:'#9e9e9e', fontWeight:400 }}>(optional)</span></label>
            <input name="landmark" value={details.landmark} onChange={handleDetailsChange}
              placeholder="e.g. Near City Mall, Opp. Bus Stand" style={IS()} />
          </div>

          {/* Pincode */}
          <div>
            <label style={LS}>Pincode *</label>
            <input name="pincode" value={details.pincode} onChange={handleDetailsChange}
              placeholder="6-digit pincode" maxLength={6} style={IS(errors.pincode)} />
            {errors.pincode && <p style={ES}>{errors.pincode}</p>}
          </div>

          {/* State */}
          <div>
            <label style={LS}>State *</label>
            <select name="state" value={details.state} onChange={handleDetailsChange} style={IS(errors.state)}>
              <option value="">Select State</option>
              {INDIA_STATES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state && <p style={ES}>{errors.state}</p>}
          </div>
        </div>

        <button onClick={proceedToConfirm}
          style={{ width:'100%', padding:'15px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:16, cursor:'pointer', marginTop:28 }}>
          Review Order →
        </button>
      </div>
    </div>
  );

  // ── STEP: CONFIRM ORDER ─────────────────────────────────────────────────────
  return (
    <div className="container" style={{ padding:'32px 16px', maxWidth:700 }}>
      <button onClick={()=>setStep('details')} style={{ background:'none', border:'none', color:'#e53935', fontWeight:600, marginBottom:20, cursor:'pointer', fontSize:14 }}>
        ← Edit Details
      </button>
      <h1 style={{ fontSize:24, fontWeight:700, marginBottom:24 }}>✅ Confirm Your Order</h1>

      {/* Delivery Info */}
      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <h3 style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>📍 Delivery Information</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:14 }}>
          <div><span style={{ color:'#757575' }}>Name</span><p style={{ fontWeight:600, marginTop:2 }}>{details.full_name}</p></div>
          <div><span style={{ color:'#757575' }}>Mobile</span><p style={{ fontWeight:600, marginTop:2 }}>{details.mobile}{details.alt_mobile&&` / ${details.alt_mobile}`}</p></div>
          {details.email&&<div style={{ gridColumn:'1/-1' }}><span style={{ color:'#757575' }}>Email</span><p style={{ fontWeight:600, marginTop:2 }}>{details.email}</p></div>}
          <div style={{ gridColumn:'1/-1' }}>
            <span style={{ color:'#757575' }}>Address</span>
            <p style={{ fontWeight:600, marginTop:2 }}>
              {[details.address_line, details.street, details.landmark, details.pincode, details.state].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <h3 style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>📦 Order Items</h3>
        {cart.items.map(item=>(
          <div key={item.product_id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid #f5f5f5', alignItems:'center' }}>
            <img src={item.image_url||'https://via.placeholder.com/50'} alt="" style={{ width:50, height:50, objectFit:'cover', borderRadius:6 }} onError={e=>{e.target.src='https://via.placeholder.com/50';}} />
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:600, fontSize:13 }}>{item.name}</p>
              <p style={{ fontSize:12, color:'#757575' }}>Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}</p>
            </div>
            <p style={{ fontWeight:700 }}>₹{(item.unit_price*item.quantity).toLocaleString('en-IN')}</p>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', paddingTop:14, fontWeight:800, fontSize:18 }}>
          <span>Total</span><span style={{ color:'#e53935' }}>₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <button onClick={placeOrder} disabled={ordering}
        style={{ width:'100%', padding:16, background:'#43a047', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:17, cursor:ordering?'wait':'pointer' }}>
        {ordering ? '⏳ Placing Order...' : '🎉 Place Order'}
      </button>
    </div>
  );
}

// Style helpers
const LS = { fontWeight:600, fontSize:13, display:'block', marginBottom:6, color:'#424242' };
const IS = (err) => ({
  width:'100%', padding:'11px 14px', borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none',
  border: err ? '1.5px solid #e53935' : '1px solid #e0e0e0',
  background: err ? '#fff8f8' : 'white',
});
const ES = { color:'#e53935', fontSize:12, marginTop:4, fontWeight:500 };
