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

const PAYMENT_METHODS = [
  {
    id: 'cod',
    icon: '💵',
    title: 'Cash on Delivery',
    subtitle: 'Pay when your order arrives',
    badge: 'Most Popular',
    badgeColor: '#43a047',
  },
  {
    id: 'upi',
    icon: '📱',
    title: 'UPI Payment',
    subtitle: 'PhonePe, GPay, Paytm, BHIM',
    badge: 'Instant',
    badgeColor: '#1565c0',
  },
  {
    id: 'bank_transfer',
    icon: '🏦',
    title: 'Bank Transfer / NEFT',
    subtitle: 'Direct bank transfer',
    badge: null,
    badgeColor: null,
  },
  {
    id: 'card',
    icon: '💳',
    title: 'Credit / Debit Card',
    subtitle: 'Visa, Mastercard, RuPay',
    badge: null,
    badgeColor: null,
  },
];

const EMPTY_DETAILS = {
  full_name:'', mobile:'', alt_mobile:'', email:'',
  address_line:'', street:'', landmark:'', pincode:'', state:'',
};

export default function Cart() {
  const [cart, setCart]           = useState({ items:[] });
  const [loading, setLoading]     = useState(true);
  const [step, setStep]           = useState('cart'); // cart | details | payment | confirm
  const [details, setDetails]     = useState(EMPTY_DETAILS);
  const [paymentMethod, setPayment] = useState('cod');
  const [errors, setErrors]       = useState({});
  const [ordering, setOrdering]   = useState(false);
  const toast  = useToast();
  const nav    = useNavigate();

  const load = () => api.getCart().then(setCart).catch(()=>{}).finally(()=>setLoading(false));
  useEffect(() => { load(); }, []);

  const update = async (productId, qty) => {
    try { const c = await api.updateCartItem(productId, qty); setCart(c); }
    catch (e) { toast('❌ '+e.message); }
  };

  const total = cart.items?.reduce((s,i) => s + i.unit_price * i.quantity, 0) || 0;

  const validate = () => {
    const e = {};
    if (!details.full_name.trim())    e.full_name    = 'Full name is required';
    if (!details.mobile.trim())       e.mobile       = 'Mobile number is required';
    else if (!/^[6-9]\d{9}$/.test(details.mobile.replace(/\s/g,''))) e.mobile = 'Enter valid 10-digit number';
    if (details.alt_mobile && !/^[6-9]\d{9}$/.test(details.alt_mobile.replace(/\s/g,''))) e.alt_mobile = 'Enter valid 10-digit number';
    if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) e.email = 'Enter valid email';
    if (!details.address_line.trim()) e.address_line = 'Address is required';
    if (!details.pincode.trim())      e.pincode      = 'Pincode is required';
    else if (!/^\d{6}$/.test(details.pincode)) e.pincode = 'Enter valid 6-digit pincode';
    if (!details.state)               e.state        = 'Please select state';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setDetails(d => ({ ...d, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  };

  const placeOrder = async () => {
    setOrdering(true);
    try {
      const addressStr = [
        details.address_line, details.street,
        details.landmark ? `Landmark: ${details.landmark}` : '',
        details.pincode, details.state,
      ].filter(Boolean).join(', ');

      const pm = PAYMENT_METHODS.find(p => p.id === paymentMethod);

      await api.createOrder({
        address: addressStr,
        notes: `Payment: ${pm?.title}`,
        customer_name: details.full_name,
        customer_mobile: details.mobile + (details.alt_mobile ? ' / ' + details.alt_mobile : ''),
        customer_email: details.email || '',
        payment_method: paymentMethod,
      });
      toast('✅ Order placed successfully!');
      nav('/orders');
    } catch (e) { toast('❌ '+e.message); }
    finally { setOrdering(false); }
  };

  if (loading) return <div className="spinner" style={{ marginTop:80 }} />;

  // ── ORDER SUMMARY SIDEBAR (reused across steps) ──────────────────────────
  const OrderSummary = ({ showButton, buttonText, onButton, disabled }) => (
    <div className="card" style={{ padding:20, height:'fit-content', position:'sticky', top:80 }}>
      <h3 style={{ fontWeight:700, marginBottom:16 }}>Order Summary</h3>
      {cart.items?.slice(0,3).map(item => (
        <div key={item.product_id} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'center' }}>
          <img src={item.image_url||'https://via.placeholder.com/40'} alt=""
            style={{ width:40, height:40, objectFit:'cover', borderRadius:6, flexShrink:0 }}
            onError={e=>{e.target.src='https://via.placeholder.com/40';}} />
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</p>
            <p style={{ fontSize:11, color:'#757575' }}>Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}</p>
          </div>
          <p style={{ fontSize:13, fontWeight:700, flexShrink:0 }}>₹{(item.unit_price*item.quantity).toLocaleString('en-IN')}</p>
        </div>
      ))}
      {cart.items?.length > 3 && <p style={{ fontSize:12, color:'#757575', marginBottom:10 }}>+{cart.items.length-3} more items</p>}
      <div style={{ borderTop:'1px solid #e0e0e0', paddingTop:12, marginTop:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
          <span style={{ color:'#757575' }}>Subtotal</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
          <span style={{ color:'#757575' }}>Delivery</span>
          <span style={{ color:'#43a047', fontWeight:600 }}>FREE</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:18, borderTop:'1px solid #e0e0e0', paddingTop:10, marginTop:6 }}>
          <span>Total</span>
          <span style={{ color:'#e53935' }}>₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
      {showButton && (
        <button onClick={onButton} disabled={disabled}
          style={{ width:'100%', padding:'14px', background: disabled ? '#bdbdbd' : '#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor: disabled ? 'not-allowed' : 'pointer', marginTop:16 }}>
          {buttonText}
        </button>
      )}
    </div>
  );

  // ── STEP INDICATOR ────────────────────────────────────────────────────────
  const StepBar = () => {
    const steps = [
      { key:'cart', label:'Cart' },
      { key:'details', label:'Details' },
      { key:'payment', label:'Payment' },
      { key:'confirm', label:'Confirm' },
    ];
    const current = steps.findIndex(s => s.key === step);
    return (
      <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
        {steps.map((s, i) => (
          <div key={s.key} style={{ display:'flex', alignItems:'center', flex: i < steps.length-1 ? 1 : 0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13,
                background: i <= current ? '#e53935' : '#e0e0e0', color: i <= current ? 'white' : '#9e9e9e' }}>
                {i < current ? '✓' : i+1}
              </div>
              <span style={{ fontSize:11, fontWeight:600, marginTop:4, color: i <= current ? '#e53935' : '#9e9e9e' }}>{s.label}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{ flex:1, height:2, background: i < current ? '#e53935' : '#e0e0e0', margin:'0 6px', marginBottom:16 }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const LS = { fontWeight:600, fontSize:13, display:'block', marginBottom:6, color:'#424242' };
  const IS = (err) => ({ width:'100%', padding:'11px 14px', borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none', border: err ? '1.5px solid #e53935' : '1px solid #e0e0e0', background: err ? '#fff8f8' : 'white' });
  const ES = { color:'#e53935', fontSize:12, marginTop:4, fontWeight:500 };

  // ── CART STEP ─────────────────────────────────────────────────────────────
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
                  <button onClick={()=>update(item.product_id,item.quantity-1)} style={{ width:28,height:28,borderRadius:4,border:'1px solid #e0e0e0',background:'white',fontWeight:700,cursor:'pointer' }}>−</button>
                  <span style={{ fontWeight:700, minWidth:24, textAlign:'center' }}>{item.quantity}</span>
                  <button onClick={()=>update(item.product_id,item.quantity+1)} style={{ width:28,height:28,borderRadius:4,border:'1px solid #e0e0e0',background:'white',fontWeight:700,cursor:'pointer' }}>+</button>
                </div>
                <div style={{ textAlign:'right', minWidth:90 }}>
                  <p style={{ fontWeight:700 }}>₹{(item.unit_price*item.quantity).toLocaleString('en-IN')}</p>
                  <button onClick={()=>update(item.product_id,0)} style={{ color:'#e53935',background:'none',border:'none',fontSize:12,cursor:'pointer',marginTop:4 }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <OrderSummary showButton buttonText="Proceed to Checkout →" onButton={()=>{setStep('details');window.scrollTo(0,0);}} />
        </div>
      )}
    </div>
  );

  // ── DETAILS STEP ──────────────────────────────────────────────────────────
  if (step === 'details') return (
    <div className="container" style={{ padding:'32px 16px', maxWidth:960 }}>
      <button onClick={()=>setStep('cart')} style={{ background:'none',border:'none',color:'#e53935',fontWeight:600,marginBottom:20,cursor:'pointer',fontSize:14 }}>← Back to Cart</button>
      <StepBar />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24 }}>
        <div className="card" style={{ padding:28 }}>
          <h2 style={{ fontWeight:800, fontSize:18, marginBottom:20, color:'#e53935' }}>📋 Delivery Details</h2>

          <h3 style={{ fontWeight:700, fontSize:14, marginBottom:14, color:'#424242' }}>Personal Information</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={LS}>Full Name *</label>
              <input name="full_name" value={details.full_name} onChange={handleDetailsChange} placeholder="Enter your full name" style={IS(errors.full_name)}/>
              {errors.full_name && <p style={ES}>{errors.full_name}</p>}
            </div>
            <div>
              <label style={LS}>Mobile Number *</label>
              <input name="mobile" value={details.mobile} onChange={handleDetailsChange} placeholder="10-digit number" maxLength={10} style={IS(errors.mobile)}/>
              {errors.mobile && <p style={ES}>{errors.mobile}</p>}
            </div>
            <div>
              <label style={LS}>Alternate Mobile <span style={{color:'#9e9e9e',fontWeight:400}}>(optional)</span></label>
              <input name="alt_mobile" value={details.alt_mobile} onChange={handleDetailsChange} placeholder="Alternate number" maxLength={10} style={IS(errors.alt_mobile)}/>
              {errors.alt_mobile && <p style={ES}>{errors.alt_mobile}</p>}
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={LS}>Email <span style={{color:'#9e9e9e',fontWeight:400}}>(optional)</span></label>
              <input name="email" type="email" value={details.email} onChange={handleDetailsChange} placeholder="your@email.com" style={IS(errors.email)}/>
              {errors.email && <p style={ES}>{errors.email}</p>}
            </div>
          </div>

          <h3 style={{ fontWeight:700, fontSize:14, marginBottom:14, color:'#424242', borderTop:'1px solid #f0f0f0', paddingTop:16 }}>Delivery Address</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={LS}>House / Flat / Building No. *</label>
              <input name="address_line" value={details.address_line} onChange={handleDetailsChange} placeholder="e.g. Flat 101, Sunrise Apartments" style={IS(errors.address_line)}/>
              {errors.address_line && <p style={ES}>{errors.address_line}</p>}
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={LS}>Street / Area / Colony</label>
              <input name="street" value={details.street} onChange={handleDetailsChange} placeholder="e.g. MG Road, Koramangala" style={IS()}/>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={LS}>Landmark <span style={{color:'#9e9e9e',fontWeight:400}}>(optional)</span></label>
              <input name="landmark" value={details.landmark} onChange={handleDetailsChange} placeholder="e.g. Near City Mall" style={IS()}/>
            </div>
            <div>
              <label style={LS}>Pincode *</label>
              <input name="pincode" value={details.pincode} onChange={handleDetailsChange} placeholder="6-digit pincode" maxLength={6} style={IS(errors.pincode)}/>
              {errors.pincode && <p style={ES}>{errors.pincode}</p>}
            </div>
            <div>
              <label style={LS}>State *</label>
              <select name="state" value={details.state} onChange={handleDetailsChange} style={IS(errors.state)}>
                <option value="">Select State</option>
                {INDIA_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p style={ES}>{errors.state}</p>}
            </div>
          </div>

          <button onClick={()=>{ if(validate()){setStep('payment');window.scrollTo(0,0);}else{toast('❌ Please fix the errors');}}}
            style={{ width:'100%', padding:'14px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor:'pointer', marginTop:24 }}>
            Continue to Payment →
          </button>
        </div>
        <OrderSummary />
      </div>
    </div>
  );

  // ── PAYMENT STEP ──────────────────────────────────────────────────────────
  if (step === 'payment') return (
    <div className="container" style={{ padding:'32px 16px', maxWidth:960 }}>
      <button onClick={()=>setStep('details')} style={{ background:'none',border:'none',color:'#e53935',fontWeight:600,marginBottom:20,cursor:'pointer',fontSize:14 }}>← Edit Details</button>
      <StepBar />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24 }}>
        <div className="card" style={{ padding:28 }}>
          <h2 style={{ fontWeight:800, fontSize:18, marginBottom:6 }}>💳 Select Payment Method</h2>
          <p style={{ color:'#757575', fontSize:13, marginBottom:24 }}>Choose how you'd like to pay</p>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {PAYMENT_METHODS.map(pm => (
              <div key={pm.id} onClick={() => setPayment(pm.id)}
                style={{ border: paymentMethod===pm.id ? '2px solid #e53935' : '1.5px solid #e0e0e0',
                  borderRadius:10, padding:'16px 18px', cursor:'pointer', background: paymentMethod===pm.id ? '#fff8f8' : 'white',
                  transition:'all .15s', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ fontSize:28, flexShrink:0 }}>{pm.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <p style={{ fontWeight:700, fontSize:15, color: paymentMethod===pm.id ? '#e53935' : '#212121' }}>{pm.title}</p>
                    {pm.badge && (
                      <span style={{ background: pm.badgeColor, color:'white', fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:700 }}>
                        {pm.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize:13, color:'#757575', marginTop:2 }}>{pm.subtitle}</p>
                </div>
                <div style={{ width:20, height:20, borderRadius:'50%', border: paymentMethod===pm.id ? '6px solid #e53935' : '2px solid #e0e0e0', flexShrink:0, transition:'all .15s' }} />
              </div>
            ))}
          </div>

          {/* UPI details */}
          {paymentMethod === 'upi' && (
            <div style={{ background:'#e3f2fd', borderRadius:8, padding:16, marginTop:16 }}>
              <p style={{ fontWeight:700, color:'#1565c0', marginBottom:6 }}>📱 UPI Payment Instructions</p>
              <p style={{ fontSize:13, color:'#1a237e' }}>After placing the order, you'll receive our UPI ID on your mobile number. Please transfer the amount and share the screenshot with us.</p>
            </div>
          )}
          {paymentMethod === 'bank_transfer' && (
            <div style={{ background:'#e8f5e9', borderRadius:8, padding:16, marginTop:16 }}>
              <p style={{ fontWeight:700, color:'#1b5e20', marginBottom:6 }}>🏦 Bank Transfer Instructions</p>
              <p style={{ fontSize:13, color:'#1b5e20' }}>Bank details will be shared via SMS after order placement. Transfer the amount and your order will be confirmed within 24 hours.</p>
            </div>
          )}
          {paymentMethod === 'cod' && (
            <div style={{ background:'#e8f5e9', borderRadius:8, padding:16, marginTop:16 }}>
              <p style={{ fontWeight:700, color:'#1b5e20', marginBottom:6 }}>💵 Cash on Delivery</p>
              <p style={{ fontSize:13, color:'#1b5e20' }}>Pay cash when your order is delivered. No advance payment needed!</p>
            </div>
          )}
          {paymentMethod === 'card' && (
            <div style={{ background:'#fff8e1', borderRadius:8, padding:16, marginTop:16 }}>
              <p style={{ fontWeight:700, color:'#f57f17', marginBottom:6 }}>💳 Card Payment</p>
              <p style={{ fontSize:13, color:'#795548' }}>A payment link will be sent to your mobile after order placement. Complete payment to confirm your order.</p>
            </div>
          )}

          <button onClick={()=>{setStep('confirm');window.scrollTo(0,0);}}
            style={{ width:'100%', padding:'14px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor:'pointer', marginTop:24 }}>
            Review Order →
          </button>
        </div>
        <OrderSummary />
      </div>
    </div>
  );

  // ── CONFIRM STEP ──────────────────────────────────────────────────────────
  const selectedPM = PAYMENT_METHODS.find(p => p.id === paymentMethod);
  return (
    <div className="container" style={{ padding:'32px 16px', maxWidth:960 }}>
      <button onClick={()=>setStep('payment')} style={{ background:'none',border:'none',color:'#e53935',fontWeight:600,marginBottom:20,cursor:'pointer',fontSize:14 }}>← Change Payment</button>
      <StepBar />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24 }}>
        <div>
          {/* Delivery info card */}
          <div className="card" style={{ padding:20, marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ fontWeight:700, fontSize:15 }}>📍 Delivery To</h3>
              <button onClick={()=>setStep('details')} style={{ background:'none',border:'1px solid #e53935',color:'#e53935',padding:'4px 12px',borderRadius:6,fontSize:12,cursor:'pointer',fontWeight:600 }}>Edit</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:14 }}>
              <div><span style={{color:'#757575',fontSize:12}}>Name</span><p style={{fontWeight:700,marginTop:2}}>{details.full_name}</p></div>
              <div><span style={{color:'#757575',fontSize:12}}>Mobile</span><p style={{fontWeight:700,marginTop:2}}>{details.mobile}{details.alt_mobile&&' / '+details.alt_mobile}</p></div>
              {details.email&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#757575',fontSize:12}}>Email</span><p style={{fontWeight:600,marginTop:2}}>{details.email}</p></div>}
              <div style={{gridColumn:'1/-1'}}><span style={{color:'#757575',fontSize:12}}>Address</span><p style={{fontWeight:600,marginTop:2}}>{[details.address_line,details.street,details.landmark,details.pincode,details.state].filter(Boolean).join(', ')}</p></div>
            </div>
          </div>

          {/* Payment method card */}
          <div className="card" style={{ padding:20, marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ fontWeight:700, fontSize:15 }}>💳 Payment Method</h3>
              <button onClick={()=>setStep('payment')} style={{ background:'none',border:'1px solid #e53935',color:'#e53935',padding:'4px 12px',borderRadius:6,fontSize:12,cursor:'pointer',fontWeight:600 }}>Change</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:28 }}>{selectedPM?.icon}</span>
              <div>
                <p style={{ fontWeight:700, fontSize:15 }}>{selectedPM?.title}</p>
                <p style={{ fontSize:13, color:'#757575' }}>{selectedPM?.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Items card */}
          <div className="card" style={{ padding:20 }}>
            <h3 style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>📦 Order Items ({cart.items?.length})</h3>
            {cart.items?.map(item=>(
              <div key={item.product_id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid #f5f5f5', alignItems:'center' }}>
                <img src={item.image_url||'https://via.placeholder.com/50'} alt="" style={{ width:50,height:50,objectFit:'cover',borderRadius:6 }} onError={e=>{e.target.src='https://via.placeholder.com/50';}}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, fontSize:13 }}>{item.name}</p>
                  <p style={{ fontSize:12, color:'#757575' }}>Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}</p>
                </div>
                <p style={{ fontWeight:700 }}>₹{(item.unit_price*item.quantity).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <OrderSummary
            showButton
            buttonText={ordering ? '⏳ Placing Order...' : `🎉 Place Order — ₹${total.toLocaleString('en-IN')}`}
            onButton={placeOrder}
            disabled={ordering}
          />
          <p style={{ fontSize:12, color:'#9e9e9e', marginTop:10, textAlign:'center' }}>
            By placing this order you agree to our terms and conditions
          </p>
        </div>
      </div>
    </div>
  );
}
