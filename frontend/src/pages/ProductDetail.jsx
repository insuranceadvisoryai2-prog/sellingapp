import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth, useToast } from '../App.jsx';

export default function ProductDetail() {
  const { id }    = useParams();
  const { user }  = useAuth();
  const toast     = useToast();
  const nav       = useNavigate();
  const [product, setProduct]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selImg, setSelImg]     = useState(0);
  const [qty, setQty]           = useState(1);
  const [zoomed, setZoomed]     = useState(false);
  const [adding, setAdding]     = useState(false);

  useEffect(() => {
    api.getProduct(id)
      .then(p => { setProduct(p); setSelImg(0); })
      .catch(() => nav('/products'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!product) return null;

  // Build images array — handle both string URLs and base64
  const images = (() => {
    let imgs = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      imgs = product.images.filter(Boolean);
    }
    if (product.image_url && !imgs.includes(product.image_url)) {
      imgs.unshift(product.image_url);
    }
    // deduplicate
    return [...new Set(imgs)].filter(Boolean);
  })();

  const mainImg = images[selImg] || images[0] || 'https://via.placeholder.com/500?text=No+Image';
  const discount = product.discount_pct || (product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100) : 0);

  const addToCart = async () => {
    if (!user) { toast('Please login to add to cart'); nav('/login'); return; }
    setAdding(true);
    try { await api.addToCart(product.id, qty); toast('✅ Added to cart!'); }
    catch (e) { toast('❌ ' + e.message); }
    finally { setAdding(false); }
  };

  const buyNow = async () => {
    if (!user) { toast('Please login first'); nav('/login'); return; }
    setAdding(true);
    try {
      await api.addToCart(product.id, qty);
      nav('/cart');
    } catch (e) { toast('❌ ' + e.message); setAdding(false); }
  };

  // Parse description into paragraphs / bullet points
  const renderDescription = (desc) => {
    if (!desc) return null;
    const lines = desc.split(/\n/).filter(l => l.trim());
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
        return (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
            <span style={{ color:'#e53935', fontWeight:700, flexShrink:0 }}>•</span>
            <span style={{ fontSize:14, color:'#424242', lineHeight:1.6 }}>{trimmed.replace(/^[-•*]\s*/,'')}</span>
          </div>
        );
      }
      return <p key={i} style={{ fontSize:14, color:'#424242', lineHeight:1.7, marginBottom:8 }}>{trimmed}</p>;
    });
  };

  return (
    <div className="container" style={{ padding:'24px 16px', maxWidth:1100 }}>
      {/* Back */}
      <button onClick={() => nav(-1)} style={{ background:'none', border:'none', color:'#e53935', fontWeight:600, marginBottom:20, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:4 }}>
        ← Back
      </button>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:32 }}>

        {/* ── LEFT: Images ── */}
        <div>
          {/* Main image */}
          <div style={{ position:'relative', background:'#f8f8f8', borderRadius:12, overflow:'hidden', marginBottom:12, cursor:'zoom-in' }}
            onClick={() => setZoomed(true)}>
            <img src={mainImg} alt={product.name}
              style={{ width:'100%', aspectRatio:'1', objectFit:'contain', display:'block', padding:8 }}
              onError={e => { e.target.src='https://via.placeholder.com/500?text=No+Image'; }} />
            {discount > 0 && (
              <span style={{ position:'absolute', top:12, left:12, background:'#e53935', color:'white', fontSize:13, fontWeight:800, padding:'4px 10px', borderRadius:6 }}>
                {discount}% OFF
              </span>
            )}
            <span style={{ position:'absolute', bottom:10, right:10, background:'rgba(0,0,0,0.4)', color:'white', fontSize:11, padding:'3px 8px', borderRadius:4 }}>
              🔍 Click to zoom
            </span>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelImg(i)}
                  style={{ width:72, height:72, borderRadius:8, overflow:'hidden', padding:2, cursor:'pointer', border: i===selImg ? '2px solid #e53935' : '2px solid #e0e0e0', background:'white' }}>
                  <img src={img} alt={`view ${i+1}`}
                    style={{ width:'100%', height:'100%', objectFit:'contain' }}
                    onError={e => { e.target.src='https://via.placeholder.com/72?text=?'; }} />
                </button>
              ))}
            </div>
          )}
          {images.length > 1 && (
            <p style={{ fontSize:12, color:'#9e9e9e', marginTop:8 }}>{images.length} images · click to switch</p>
          )}
        </div>

        {/* ── RIGHT: Product Info ── */}
        <div>
          {product.brand && (
            <p style={{ fontSize:13, color:'#1565c0', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>{product.brand}</p>
          )}
          <h1 style={{ fontSize:22, fontWeight:800, lineHeight:1.35, marginBottom:12, color:'#212121' }}>{product.name}</h1>

          {/* Price block */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <span style={{ fontSize:32, fontWeight:900, color:'#e53935' }}>
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
            {product.original_price > product.price && (
              <span style={{ fontSize:18, color:'#9e9e9e', textDecoration:'line-through', marginBottom:4 }}>
                ₹{Number(product.original_price).toLocaleString('en-IN')}
              </span>
            )}
            {discount > 0 && (
              <span style={{ background:'#e8f5e9', color:'#2e7d32', fontSize:14, fontWeight:800, padding:'3px 10px', borderRadius:6, marginBottom:4 }}>
                {discount}% OFF
              </span>
            )}
          </div>
          {product.original_price > product.price && (
            <p style={{ fontSize:13, color:'#43a047', fontWeight:600, marginBottom:16 }}>
              You save ₹{(Number(product.original_price) - Number(product.price)).toLocaleString('en-IN')}!
            </p>
          )}

          {/* Badges */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
            {product.category && <span style={{ background:'#fff3e0', color:'#e65100', fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:20 }}>{product.category}</span>}
            {product.min_order > 1 && <span style={{ background:'#e3f2fd', color:'#1565c0', fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:20 }}>Min. {product.min_order} {product.unit || 'pieces'}</span>}
            {product.stock < 50 && <span style={{ background:'#ffebee', color:'#c62828', fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:20 }}>Only {product.stock} left!</span>}
          </div>

          {/* Quantity */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
            <span style={{ fontWeight:700, fontSize:14 }}>Quantity:</span>
            <div style={{ display:'flex', alignItems:'center', border:'1px solid #e0e0e0', borderRadius:8, overflow:'hidden' }}>
              <button onClick={() => setQty(q => Math.max(product.min_order || 1, q-1))}
                style={{ width:38, height:38, background:'#f5f5f5', border:'none', fontSize:20, cursor:'pointer', fontWeight:700 }}>−</button>
              <span style={{ width:48, textAlign:'center', fontWeight:700, fontSize:16 }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q+1))}
                style={{ width:38, height:38, background:'#f5f5f5', border:'none', fontSize:20, cursor:'pointer', fontWeight:700 }}>+</button>
            </div>
            <span style={{ fontSize:13, color:'#757575' }}>({product.stock} in stock)</span>
          </div>

          {/* CTA Buttons */}
          <div style={{ display:'flex', gap:12, marginBottom:24 }}>
            <button onClick={addToCart} disabled={adding}
              style={{ flex:1, padding:'14px', background:'white', color:'#e53935', border:'2px solid #e53935', borderRadius:10, fontWeight:800, fontSize:15, cursor:'pointer', transition:'all .2s' }}
              onMouseEnter={e=>{e.target.style.background='#fff5f5';}}
              onMouseLeave={e=>{e.target.style.background='white';}}>
              🛒 Add to Cart
            </button>
            <button onClick={buyNow} disabled={adding}
              style={{ flex:1, padding:'14px', background:'#e53935', color:'white', border:'none', borderRadius:10, fontWeight:800, fontSize:15, cursor:'pointer', boxShadow:'0 4px 12px rgba(229,57,53,0.35)', transition:'all .2s' }}
              onMouseEnter={e=>{e.target.style.background='#c62828';}}
              onMouseLeave={e=>{e.target.style.background='#e53935';}}>
              ⚡ Buy Now
            </button>
          </div>

          {/* Guarantees */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
            {[
              ['🚚','Fast Delivery','Pan-India shipping'],
              ['🔒','Secure Payment','100% safe checkout'],
              ['↩️','Easy Returns','Hassle-free returns'],
              ['💎','Quality Assured','Verified products'],
            ].map(([icon,title,sub])=>(
              <div key={title} style={{ background:'#f8f8f8', borderRadius:8, padding:'10px 12px', display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ fontSize:18 }}>{icon}</span>
                <div>
                  <p style={{ fontWeight:700, fontSize:12 }}>{title}</p>
                  <p style={{ fontSize:11, color:'#757575' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DESCRIPTION SECTION ── */}
      {product.description && (
        <div style={{ marginTop:32, background:'white', borderRadius:12, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:20, color:'#212121', borderBottom:'2px solid #f0f0f0', paddingBottom:12 }}>
            📋 Product Description
          </h2>
          <div>{renderDescription(product.description)}</div>
        </div>
      )}

      {/* ── SPECIFICATIONS ── */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <div style={{ marginTop:20, background:'white', borderRadius:12, padding:28, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:20, color:'#212121', borderBottom:'2px solid #f0f0f0', paddingBottom:12 }}>
            📐 Specifications
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:0 }}>
            {Object.entries(product.specifications).map(([key, val], i) => (
              <div key={key} style={{ display:'flex', gap:0, borderBottom:'1px solid #f5f5f5', background: i%2===0?'#fafafa':'white' }}>
                <div style={{ padding:'10px 16px', fontWeight:700, fontSize:13, color:'#555', minWidth:140, background:'#f5f5f5' }}>{key}</div>
                <div style={{ padding:'10px 16px', fontSize:13, color:'#212121', flex:1 }}>{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ZOOM MODAL ── */}
      {zoomed && (
        <div onClick={() => setZoomed(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out' }}>
          <div style={{ position:'relative', maxWidth:'90vw', maxHeight:'90vh' }}>
            <img src={mainImg} alt="zoom"
              style={{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8 }} />
            <button onClick={() => setZoomed(false)}
              style={{ position:'absolute', top:-12, right:-12, background:'white', border:'none', borderRadius:'50%', width:32, height:32, fontSize:16, cursor:'pointer', fontWeight:900, boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>✕</button>
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button onClick={e=>{e.stopPropagation();setSelImg(i=>Math.max(0,i-1));}}
                  style={{ position:'absolute', left:-50, top:'50%', transform:'translateY(-50%)', background:'white', border:'none', borderRadius:'50%', width:40, height:40, fontSize:20, cursor:'pointer', fontWeight:900 }}>‹</button>
                <button onClick={e=>{e.stopPropagation();setSelImg(i=>Math.min(images.length-1,i+1));}}
                  style={{ position:'absolute', right:-50, top:'50%', transform:'translateY(-50%)', background:'white', border:'none', borderRadius:'50%', width:40, height:40, fontSize:20, cursor:'pointer', fontWeight:900 }}>›</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
