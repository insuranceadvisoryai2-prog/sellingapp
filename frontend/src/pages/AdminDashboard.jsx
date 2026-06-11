import { useState, useEffect, useRef } from 'react';
import { scrapeMeeshoProduct } from '../utils/meeshoScraper.js';
import { browserScrapeAndSave } from '../utils/api.js';
import { api } from '../utils/api.js';
import { useToast } from '../App.jsx';

const EMPTY = {
  name:'', description:'', price:'', original_price:'', discount_pct:'',
  category:'', subcategory:'', brand:'', stock:'999', unit:'piece',
  min_order:'1', source_url:'', images:'', is_published:true,
};

function isUrl(s) { return s.startsWith('http://') || s.startsWith('https://'); }

// Convert file to base64 data URL
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('pending');
  const [allProducts, setAllProducts] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [scrapeQuery, setScrapeQuery] = useState('');
  const [scrapeSites, setScrapeSites] = useState(['meesho', 'indiamart']);
  const [scraping, setScraping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deviceImages, setDeviceImages] = useState([]); // base64 from device
  const [urlImagePreview, setUrlImagePreview] = useState([]);
  const [approvingAll, setApprovingAll] = useState(false);
  const [scrapePreview, setScrapePreview] = useState(null);
  const [scrapeError, setScrapeError] = useState('');
  const fileInputRef = useRef();
  const toast = useToast();

  const inputIsUrl = isUrl(scrapeQuery);

  const loadPending = () => api.adminGetProducts(1,'pending').then(setPendingProducts).catch(()=>{});
  const loadAll = () => { setLoading(true); api.adminGetProducts(1,'').then(setAllProducts).finally(()=>setLoading(false)); };
  const loadCount = () => api.adminPendingCount().then(r=>setPendingCount(r.count)).catch(()=>{});
  const loadJobs = () => api.adminScrapeJobs().then(setJobs).catch(()=>{});

  useEffect(() => { loadPending(); loadAll(); loadCount(); loadJobs(); }, []);

  // URL image preview
  useEffect(() => {
    const urls = form.images ? form.images.split(',').map(s=>s.trim()).filter(Boolean) : [];
    setUrlImagePreview(urls);
  }, [form.images]);

  // Device image upload handler
  const handleDeviceImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const base64s = await Promise.all(files.map(fileToBase64));
      setDeviceImages(prev => [...prev, ...base64s]);
      toast(`✅ ${files.length} image(s) added`);
    } catch { toast('❌ Failed to load images'); }
  };

  const removeDeviceImage = (idx) => setDeviceImages(prev => prev.filter((_,i)=>i!==idx));

  const openAddForm = () => {
    setEditingProduct(null); setForm(EMPTY);
    setDeviceImages([]); setUrlImagePreview([]);
    setShowForm(true); window.scrollTo(0,0);
  };

  const openEditForm = (p) => {
    setEditingProduct(p);
    const imgs = Array.isArray(p.images) ? p.images.filter(i=>!i.startsWith('data:')) : [];
    setForm({
      name:p.name||'', description:p.description||'',
      price:p.price||'', original_price:p.original_price||'',
      discount_pct:p.discount_pct||'', category:p.category||'',
      subcategory:p.subcategory||'', brand:p.brand||'',
      stock:p.stock||'999', unit:p.unit||'piece', min_order:p.min_order||'1',
      source_url:p.source_url||'', images:imgs.join(', '),
      is_published:p.is_published!==false,
    });
    // Restore device images (base64 ones)
    const b64 = Array.isArray(p.images) ? p.images.filter(i=>i.startsWith('data:')) : [];
    setDeviceImages(b64);
    setShowForm(true); setTab('products'); window.scrollTo(0,0);
  };

  const handleFormChange = (e) => {
    const {name,value,type,checked} = e.target;
    setForm(f=>({...f,[name]:type==='checkbox'?checked:value}));
  };

  const allImages = [...deviceImages, ...urlImagePreview]; // device images first

  const saveProduct = async () => {
    if (!form.name.trim()) { toast('❌ Product name required'); return; }
    if (!form.price || isNaN(form.price)) { toast('❌ Valid price required'); return; }
    setSaving(true);
    try {
      const urlImgs = form.images ? form.images.split(',').map(s=>s.trim()).filter(Boolean) : [];
      const payload = {
        ...form,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : parseFloat(form.price),
        discount_pct: parseInt(form.discount_pct)||0,
        stock: parseInt(form.stock)||999,
        min_order: parseInt(form.min_order)||1,
        images: [...deviceImages, ...urlImgs],
        image_url: deviceImages[0] || urlImgs[0] || '',
        image_base64: deviceImages,
        approval_status: 'approved', // manual = auto approved
        is_published: form.is_published,
      };
      if (editingProduct) { await api.adminUpdateProduct(editingProduct.id, payload); toast('✅ Product updated!'); }
      else { await api.adminCreateProduct(payload); toast('✅ Product added!'); }
      setShowForm(false); setEditingProduct(null); setForm(EMPTY); setDeviceImages([]);
      loadAll(); loadCount();
    } catch (err) { toast('❌ '+err.message); }
    finally { setSaving(false); }
  };

  const approve = async (id) => {
    await api.adminApprove(id); toast('✅ Approved & published!');
    loadPending(); loadAll(); loadCount();
  };
  const reject = async (id) => {
    await api.adminReject(id); toast('⛔ Product rejected');
    loadPending(); loadAll(); loadCount();
  };
  const approveAll = async () => {
    if (!confirm(`Approve all ${pendingCount} pending products? They will go live immediately.`)) return;
    setApprovingAll(true);
    try {
      const r = await api.adminApproveAll();
      toast(`✅ ${r.approved} products approved and live!`);
      loadPending(); loadAll(); loadCount();
    } catch { toast('❌ Failed'); }
    finally { setApprovingAll(false); }
  };
  const deleteProduct = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.adminDeleteProduct(id); toast('🗑 Deleted'); loadAll(); loadCount();
  };
  const togglePublish = async (p) => {
    await api.adminUpdateProduct(p.id, { is_published: !p.is_published });
    toast(p.is_published?'⛔ Hidden':'✅ Live'); loadAll();
  };

  const startScrape = async () => {
    if (!scrapeQuery.trim() || !inputIsUrl) { toast('Please enter a valid URL'); return; }
    setScraping(true); setScrapeError(''); setScrapePreview(null);
    try {
      // Browser-side scraping — bypasses server IP blocks
      const product = await scrapeMeeshoProduct(scrapeQuery);
      setScrapePreview({ ...product, source_url: scrapeQuery });
      toast('✅ Product extracted! Review and save below.');
    } catch (e) {
      setScrapeError(e.message);
      toast('❌ Could not extract: ' + e.message);
    }
    finally { setScraping(false); }
  };

  const saveScrapedProduct = async () => {
    if (!scrapePreview) return;
    setScraping(true);
    try {
      await browserScrapeAndSave({ ...scrapePreview, source_url: scrapeQuery });
      toast('✅ Saved to Pending! Go to Pending tab to approve.');
      setScrapePreview(null); setScrapeQuery(''); setScrapeError('');
      loadPending(); loadCount();
    } catch (e) { toast('❌ Save failed: ' + e.message); }
    finally { setScraping(false); }
  };

  const L = { fontWeight:600, fontSize:13, display:'block', marginBottom:6, color:'#424242' };
  const I = { width:'100%', padding:'11px 14px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none' };

  const tabs = [
    { key:'pending', label: pendingCount>0 ? `⏳ Pending (${pendingCount})` : '⏳ Pending' },
    { key:'scraper', label:'🔍 Scraper' },
    { key:'products', label:`📦 All Products (${allProducts.length})` },
    { key:'jobs', label:`📋 Jobs (${jobs.length})` },
  ];

  return (
    <div className="container" style={{ padding:'24px 16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800 }}>🛠 Admin Dashboard</h1>
        {pendingCount > 0 && (
          <span style={{ background:'#e53935', color:'white', padding:'6px 16px', borderRadius:20, fontSize:13, fontWeight:700, animation:'pulse 2s infinite' }}>
            🔔 {pendingCount} awaiting approval
          </span>
        )}
      </div>

      {/* ── PRODUCT FORM ── */}
      {showForm && (
        <div style={{ background:'white', borderRadius:12, padding:28, marginBottom:28, boxShadow:'0 4px 20px rgba(0,0,0,0.15)', border:'2px solid #e53935' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <h2 style={{ fontWeight:800, fontSize:20 }}>{editingProduct?'✏️ Edit Product':'➕ Add New Product'}</h2>
            <button onClick={()=>{setShowForm(false);setEditingProduct(null);setDeviceImages([]);}}
              style={{ background:'#f5f5f5', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:700 }}>✕ Cancel</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={L}>Product Name *</label>
              <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Cotton Kurti Wholesale Pack" style={I} />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={L}>Description</label>
              <textarea name="description" value={form.description} onChange={handleFormChange}
                placeholder="Detailed product description..." rows={4} style={{...I,resize:'vertical'}} />
            </div>

            <div>
              <label style={L}>Selling Price (₹) *</label>
              <input name="price" type="number" value={form.price} onChange={handleFormChange} placeholder="299" style={I} />
            </div>
            <div>
              <label style={L}>Original / MRP Price (₹)</label>
              <input name="original_price" type="number" value={form.original_price} onChange={handleFormChange} placeholder="499" style={I} />
            </div>

            <div>
              <label style={L}>Category</label>
              <input name="category" value={form.category} onChange={handleFormChange} placeholder="e.g. Sarees, Shoes, Toys" style={I} />
            </div>
            <div>
              <label style={L}>Brand / Supplier</label>
              <input name="brand" value={form.brand} onChange={handleFormChange} placeholder="e.g. XYZ Textiles" style={I} />
            </div>

            <div>
              <label style={L}>Stock</label>
              <input name="stock" type="number" value={form.stock} onChange={handleFormChange} placeholder="999" style={I} />
            </div>
            <div>
              <label style={L}>Unit</label>
              <select name="unit" value={form.unit} onChange={handleFormChange} style={I}>
                {['piece','pieces','set','dozen','kg','gram','meter','litre','box','pack','bundle'].map(u=>(
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={L}>Min. Order Quantity</label>
              <input name="min_order" type="number" value={form.min_order} onChange={handleFormChange} placeholder="1" style={I} />
            </div>
            <div>
              <label style={L}>Subcategory</label>
              <input name="subcategory" value={form.subcategory} onChange={handleFormChange} placeholder="e.g. Cotton Sarees" style={I} />
            </div>

            {/* Source Link — admin only field */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={L}>
                🔗 Source Link <span style={{ color:'#e53935', fontSize:11, fontWeight:600 }}>(Admin only — not visible to customers)</span>
              </label>
              <input name="source_url" value={form.source_url} onChange={handleFormChange}
                placeholder="https://www.meesho.com/... or https://www.indiamart.com/..."
                style={{...I, borderColor:'#ff6f00'}} />
              <p style={{ fontSize:12, color:'#757575', marginTop:4 }}>Opens original product page in new tab. Only you can see this.</p>
            </div>

            {/* Device image upload */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={L}>📱 Upload Images from Device</label>
              <div
                onClick={()=>fileInputRef.current?.click()}
                style={{ border:'2px dashed #e0e0e0', borderRadius:8, padding:'20px', textAlign:'center', cursor:'pointer', background:'#fafafa', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#e53935';e.currentTarget.style.background='#fff8f8';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e0e0e0';e.currentTarget.style.background='#fafafa';}}
              >
                <div style={{ fontSize:32, marginBottom:6 }}>📷</div>
                <p style={{ fontWeight:600, color:'#424242' }}>Click to upload from device</p>
                <p style={{ fontSize:12, color:'#757575', marginTop:4 }}>JPG, PNG, WEBP — multiple files allowed</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleDeviceImages}
                style={{ display:'none' }} />
            </div>

            {/* URL images */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={L}>🌐 Image URLs (comma-separated)</label>
              <textarea name="images" value={form.images} onChange={handleFormChange}
                placeholder="https://image1.jpg, https://image2.jpg" rows={2} style={{...I,resize:'vertical'}} />
            </div>

            {/* Combined image preview */}
            {allImages.length > 0 && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={L}>Preview ({allImages.length} image{allImages.length>1?'s':''})</label>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {allImages.map((url,i) => (
                    <div key={i} style={{ position:'relative' }}>
                      <img src={url} alt={`img${i+1}`}
                        style={{ width:90, height:90, objectFit:'cover', borderRadius:8,
                          border: i===0?'3px solid #e53935':'1px solid #e0e0e0' }}
                        onError={e=>{e.target.style.opacity='0.3';}} />
                      {i===0 && <span style={{ position:'absolute',bottom:2,left:2,background:'#e53935',color:'white',fontSize:8,padding:'1px 4px',borderRadius:4,fontWeight:700 }}>MAIN</span>}
                      {url.startsWith('data:') && (
                        <button onClick={()=>removeDeviceImage(deviceImages.indexOf(url))}
                          style={{ position:'absolute',top:-6,right:-6,background:'#e53935',color:'white',border:'none',borderRadius:'50%',width:18,height:18,fontSize:10,cursor:'pointer',fontWeight:700 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:10 }}>
              <input type="checkbox" name="is_published" checked={form.is_published} onChange={handleFormChange} id="pub" style={{ width:18,height:18 }} />
              <label htmlFor="pub" style={{ fontWeight:600, cursor:'pointer' }}>Publish immediately (visible to customers)</label>
            </div>
          </div>

          <div style={{ display:'flex', gap:12, marginTop:24, justifyContent:'flex-end' }}>
            <button onClick={()=>{setShowForm(false);setEditingProduct(null);setDeviceImages([]);}}
              style={{ padding:'12px 24px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', fontWeight:600, cursor:'pointer' }}>Cancel</button>
            <button onClick={saveProduct} disabled={saving}
              style={{ padding:'12px 32px', borderRadius:8, background:'#e53935', color:'white', fontWeight:700, border:'none', cursor:'pointer', fontSize:15 }}>
              {saving?'⏳ Saving...':editingProduct?'✅ Update Product':'➕ Add Product'}
            </button>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'2px solid #e0e0e0', flexWrap:'wrap' }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ padding:'10px 18px', border:'none', background:'none', fontWeight:700, fontSize:14, cursor:'pointer',
              color:tab===t.key?'#e53935':'#757575',
              borderBottom:tab===t.key?'2px solid #e53935':'2px solid transparent', marginBottom:-2,
              position:'relative' }}>
            {t.label}
            {t.key==='pending' && pendingCount>0 && (
              <span style={{ position:'absolute',top:4,right:4,width:8,height:8,background:'#e53935',borderRadius:'50%' }}/>
            )}
          </button>
        ))}
      </div>

      {/* ── PENDING APPROVAL TAB ── */}
      {tab==='pending' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ color:'#757575' }}>{pendingProducts.length} products awaiting your approval</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{loadPending();loadCount();}} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600 }}>🔄</button>
              {pendingProducts.length > 0 && (
                <button onClick={approveAll} disabled={approvingAll}
                  style={{ padding:'8px 20px', borderRadius:8, background:'#43a047', color:'white', border:'none', cursor:'pointer', fontWeight:700 }}>
                  {approvingAll?'⏳ Approving...':'✅ Approve All ('+pendingProducts.length+')'}
                </button>
              )}
            </div>
          </div>

          {pendingProducts.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'#757575' }}>
              <div style={{ fontSize:48 }}>✅</div>
              <p style={{ fontWeight:600, marginTop:12 }}>No products pending approval</p>
              <p style={{ fontSize:13, marginTop:6 }}>Scraped products will appear here for your review</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
              {pendingProducts.map(p => (
                <div key={p.id} className="card" style={{ overflow:'hidden', border:'2px solid #fff8e1' }}>
                  <div style={{ position:'relative', paddingTop:'70%', background:'#f5f5f5' }}>
                    <img src={p.image_url||'https://via.placeholder.com/300x200?text=No+Image'} alt=""
                      style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
                      onError={e=>{e.target.src='https://via.placeholder.com/300x200?text=No+Image';}} />
                    <span style={{ position:'absolute',top:8,left:8,background:'#f57f17',color:'white',fontSize:11,padding:'3px 8px',borderRadius:6,fontWeight:700 }}>PENDING</span>
                    <span style={{ position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.6)',color:'white',fontSize:10,padding:'2px 6px',borderRadius:4,textTransform:'capitalize' }}>{p.source_site||'manual'}</span>
                  </div>
                  <div style={{ padding:14 }}>
                    <p style={{ fontWeight:700, fontSize:14, marginBottom:4, lineHeight:1.4 }}>{p.name}</p>
                    <p style={{ fontSize:12, color:'#757575', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description||'—'}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <span style={{ fontWeight:800, color:'#e53935', fontSize:16 }}>₹{Number(p.price).toLocaleString('en-IN')}</span>
                      {p.original_price>p.price && <span style={{ fontSize:12, color:'#9e9e9e', textDecoration:'line-through' }}>₹{Number(p.original_price).toLocaleString('en-IN')}</span>}
                    </div>
                    {p.source_url && (
                      <a href={p.source_url} target="_blank" rel="noopener noreferrer"
                        style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#1565c0', marginBottom:10, fontWeight:600 }}>
                        🔗 View original source ↗
                      </a>
                    )}
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>approve(p.id)}
                        style={{ flex:1, padding:'9px', background:'#43a047', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>
                        ✅ Approve
                      </button>
                      <button onClick={()=>reject(p.id)}
                        style={{ flex:1, padding:'9px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SCRAPER TAB ── */}
      {tab==='scraper' && (
        <div style={{ maxWidth:680 }}>
          <div className="card" style={{ padding:28, marginBottom:20 }}>
            <h2 style={{ fontWeight:700, marginBottom:6 }}>🔗 Import Product by URL</h2>
            <p style={{ color:'#757575', fontSize:13, marginBottom:20 }}>
              Paste a product page URL. Your browser fetches it directly — no server blocks.
              Product goes to <strong>Pending</strong> tab for your approval before going live.
            </p>

            <div style={{ marginBottom:8 }}>
              <label style={L}>Product URL</label>
              <input value={scrapeQuery} onChange={e=>setScrapeQuery(e.target.value)}
                placeholder="https://www.meesho.com/product-name/p/xxxxxx"
                style={{...I, borderColor: scrapeQuery&&!inputIsUrl?'#e53935': scrapeQuery?'#43a047':'#e0e0e0',
                  background: scrapeQuery&&!inputIsUrl?'#fff8f8': scrapeQuery?'#f1f8f1':'white'}}
                onKeyDown={e=>e.key==='Enter'&&startScrape()} />
              {scrapeQuery && !inputIsUrl && <p style={{ fontSize:12, color:'#e53935', marginTop:4 }}>⚠️ Must be a valid https:// URL</p>}
              {scrapeQuery && inputIsUrl && <p style={{ fontSize:12, color:'#43a047', marginTop:4, fontWeight:600 }}>✅ URL ready to import</p>}
            </div>

            {/* Scraped preview */}
            {scrapePreview && (
              <div style={{ background:'#f1f8f1', border:'1px solid #a5d6a7', borderRadius:10, padding:16, marginBottom:16 }}>
                <p style={{ fontWeight:700, color:'#2e7d32', marginBottom:12 }}>✅ Product extracted — review before saving:</p>
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  {scrapePreview.image_url && (
                    <img src={scrapePreview.image_url} alt="" style={{ width:80, height:80, objectFit:'cover', borderRadius:8, flexShrink:0 }}
                      onError={e=>{e.target.style.display='none';}} />
                  )}
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{scrapePreview.name}</p>
                    <p style={{ fontSize:13, color:'#555', marginBottom:6 }}>{scrapePreview.description?.slice(0,120)}{scrapePreview.description?.length>120?'...':''}</p>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:800, color:'#e53935' }}>₹{scrapePreview.price?.toLocaleString('en-IN')}</span>
                      {scrapePreview.original_price > scrapePreview.price && <span style={{ color:'#9e9e9e', textDecoration:'line-through', fontSize:13 }}>₹{scrapePreview.original_price?.toLocaleString('en-IN')}</span>}
                      {scrapePreview.category && <span style={{ background:'#e3f2fd', color:'#1565c0', padding:'2px 8px', borderRadius:10, fontSize:12, fontWeight:600 }}>{scrapePreview.category}</span>}
                      {scrapePreview.brand && <span style={{ fontSize:12, color:'#555' }}>🏷 {scrapePreview.brand}</span>}
                    </div>
                    {scrapePreview.images?.length > 1 && <p style={{ fontSize:12, color:'#757575', marginTop:4 }}>{scrapePreview.images.length} images found</p>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, marginTop:14 }}>
                  <button onClick={saveScrapedProduct} disabled={scraping}
                    style={{ flex:1, padding:'10px', background:'#43a047', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>
                    {scraping?'⏳ Saving...':'💾 Save to Pending'}
                  </button>
                  <button onClick={()=>{setScrapePreview(null);setScrapeQuery('');}}
                    style={{ padding:'10px 16px', background:'#f5f5f5', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}

            {!scrapePreview && (
              <button onClick={startScrape} disabled={scraping||!inputIsUrl}
                style={{ padding:'13px 32px', background:scraping||!inputIsUrl?'#bdbdbd':'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor:!inputIsUrl||scraping?'not-allowed':'pointer' }}>
                {scraping?'⏳ Extracting product...':'🚀 Import Product'}
              </button>
            )}

            {scrapeError && (
              <div style={{ background:'#ffebee', border:'1px solid #ef9a9a', borderRadius:8, padding:14, marginTop:14 }}>
                <p style={{ color:'#c62828', fontWeight:700, marginBottom:4 }}>❌ Import failed</p>
                <p style={{ color:'#c62828', fontSize:13 }}>{scrapeError}</p>
                <p style={{ color:'#757575', fontSize:12, marginTop:8 }}>→ Add this product manually instead using the button below</p>
              </div>
            )}

            <div style={{ background:'#e3f2fd', borderRadius:8, padding:14, marginTop:16 }}>
              <p style={{ fontWeight:700, color:'#1565c0', marginBottom:8 }}>How to import:</p>
              <ol style={{ fontSize:13, color:'#1a237e', paddingLeft:16, lineHeight:2 }}>
                <li>Open the product page in another tab</li>
                <li>Copy the full URL from address bar</li>
                <li>Paste here → click Import</li>
                <li>Review extracted data → Save to Pending</li>
                <li>Go to <strong>Pending</strong> tab → Approve to publish</li>
              </ol>
            </div>
          </div>

          <div style={{ background:'#fff8e1', borderRadius:8, padding:16 }}>
            <p style={{ fontWeight:700, color:'#f57f17', marginBottom:6 }}>📝 Add product manually</p>
            <p style={{ fontSize:13, color:'#795548', marginBottom:10 }}>Full control — name, price, images, description:</p>
            <button onClick={()=>{openAddForm();setTab('products');}}
              style={{ padding:'9px 20px', background:'#ff6f00', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>
              ➕ Add Product Manually
            </button>
          </div>
        </div>
      )}

      {/* ── ALL PRODUCTS TAB ── */}
      {tab==='products' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ color:'#757575' }}>{allProducts.length} products</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={loadAll} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600 }}>🔄</button>
              <button onClick={openAddForm} style={{ padding:'8px 20px', borderRadius:8, background:'#e53935', color:'white', border:'none', cursor:'pointer', fontWeight:700 }}>➕ Add Manually</button>
            </div>
          </div>
          {loading ? <div className="spinner"/> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', background:'white', borderRadius:8, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background:'#f5f5f5' }}>
                    {['Image','Product','Price','Category','Source Link','Status','Actions'].map(h=>(
                      <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:12, fontWeight:700, color:'#757575', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((p,i)=>(
                    <tr key={p.id} style={{ borderTop:'1px solid #f0f0f0', background:i%2?'#fafafa':'white' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ position:'relative', width:56, height:56 }}>
                          <img src={p.image_url||'https://via.placeholder.com/56?text=?'} alt=""
                            style={{ width:56, height:56, objectFit:'cover', borderRadius:6 }}
                            onError={e=>{e.target.src='https://via.placeholder.com/56?text=?';}} />
                          {Array.isArray(p.images)&&p.images.length>1&&(
                            <span style={{ position:'absolute',bottom:-4,right:-4,background:'#1565c0',color:'white',fontSize:9,padding:'1px 4px',borderRadius:8,fontWeight:700 }}>+{p.images.length-1}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', maxWidth:200 }}>
                        <p style={{ fontWeight:700, fontSize:13 }}>{p.name}</p>
                        <p style={{ fontSize:11, color:'#757575', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:190 }}>{p.description||'—'}</p>
                        {p.brand&&<p style={{ fontSize:11, color:'#1565c0', marginTop:2 }}>🏷 {p.brand}</p>}
                      </td>
                      <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                        <p style={{ fontWeight:700, color:'#e53935' }}>₹{Number(p.price).toLocaleString('en-IN')}</p>
                        {p.original_price>p.price&&<p style={{ fontSize:11, color:'#9e9e9e', textDecoration:'line-through' }}>₹{Number(p.original_price).toLocaleString('en-IN')}</p>}
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{p.category||'—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        {p.source_url ? (
                          <a href={p.source_url} target="_blank" rel="noopener noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'#1565c0', fontWeight:600, whiteSpace:'nowrap' }}>
                            🔗 View Source ↗
                          </a>
                        ) : <span style={{ color:'#bdbdbd', fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          <button onClick={()=>togglePublish(p)}
                            style={{ padding:'3px 10px', borderRadius:10, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                              background:p.is_published?'#e8f5e9':'#ffebee', color:p.is_published?'#2e7d32':'#c62828' }}>
                            {p.is_published?'✅ Live':'⛔ Hidden'}
                          </button>
                          <span style={{ fontSize:10, color: p.approval_status==='approved'?'#2e7d32':p.approval_status==='rejected'?'#c62828':'#f57f17', fontWeight:700, textTransform:'uppercase' }}>
                            {p.approval_status}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={()=>openEditForm(p)} style={{ padding:'5px 10px', borderRadius:6, background:'#e3f2fd', color:'#1565c0', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>✏️</button>
                          <button onClick={()=>deleteProduct(p.id,p.name)} style={{ padding:'5px 10px', borderRadius:6, background:'#ffebee', color:'#c62828', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!allProducts.length&&!loading&&(
                <div style={{ textAlign:'center', padding:60, color:'#757575' }}>
                  <div style={{ fontSize:48 }}>📦</div>
                  <p style={{ fontWeight:600, marginTop:12 }}>No products yet</p>
                  <button onClick={openAddForm} style={{ marginTop:16, padding:'10px 24px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>➕ Add First Product</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── JOBS TAB ── */}
      {tab==='jobs' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <p style={{ color:'#757575' }}>{jobs.length} jobs</p>
            <button onClick={loadJobs} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600 }}>🔄</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {jobs.map(j=>(
              <div key={j.id} className="card" style={{ padding:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontWeight:700 }}>"{j.query}"</p>
                  <p style={{ fontSize:12, color:'#757575', marginTop:2 }}>on {j.site} · {new Date(j.started_at).toLocaleString('en-IN')}</p>
                  {j.error&&<p style={{ fontSize:12, color:'#e53935', marginTop:4 }}>⚠️ {j.error}</p>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ padding:'4px 12px', borderRadius:12, fontSize:12, fontWeight:700,
                    background:j.status==='completed'?'#e8f5e9':j.status==='failed'?'#ffebee':'#fff8e1',
                    color:j.status==='completed'?'#2e7d32':j.status==='failed'?'#c62828':'#f57f17' }}>
                    {j.status.toUpperCase()}
                  </span>
                  {j.products_found>0&&<p style={{ fontSize:13, fontWeight:700, marginTop:6, color:'#2e7d32' }}>✅ {j.products_found} pending approval</p>}
                </div>
              </div>
            ))}
            {!jobs.length&&<div style={{ textAlign:'center', padding:60, color:'#757575' }}>No jobs yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
