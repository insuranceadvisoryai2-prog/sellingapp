import { useState, useEffect, useRef } from 'react';
import { api, browserScrapeAndSave } from '../utils/api.js';
import { useToast } from '../App.jsx';

const EMPTY = {
  name:'', description:'', price:'', original_price:'', discount_pct:'',
  category:'', subcategory:'', brand:'', stock:'999', unit:'piece',
  min_order:'1', source_url:'', images:'', is_published:true,
};

function isUrl(s) { return s.startsWith('http://') || s.startsWith('https://'); }

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function AdminDashboard() {
  const [tab, setTab]                   = useState('scraper');
  const [allProducts, setAllProducts]   = useState([]);
  const [pendingProducts, setPending]   = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [jobs, setJobs]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [editingProduct, setEditing]    = useState(null);
  const [form, setForm]                 = useState(EMPTY);
  const [saving, setSaving]             = useState(false);
  const [deviceImages, setDeviceImages] = useState([]);
  const [urlImagePreview, setUrlPreview]= useState([]);
  const [approvingAll, setApprovingAll] = useState(false);

  // Scraper panel state
  const [scrapeUrl, setScrapeUrl]   = useState('');
  const [showSidePanel, setShowPanel] = useState(false);

  const fileInputRef = useRef();
  const toast = useToast();

  const loadPending = () => api.adminGetProducts(1,'pending').then(setPending).catch(()=>{});
  const loadAll     = () => { setLoading(true); api.adminGetProducts(1,'').then(setAllProducts).finally(()=>setLoading(false)); };
  const loadCount   = () => api.adminPendingCount().then(r=>setPendingCount(r.count)).catch(()=>{});
  const loadJobs    = () => api.adminScrapeJobs().then(setJobs).catch(()=>{});

  useEffect(() => { loadPending(); loadAll(); loadCount(); loadJobs(); }, []);

  useEffect(() => {
    const urls = form.images ? form.images.split(',').map(s=>s.trim()).filter(Boolean) : [];
    setUrlPreview(urls);
  }, [form.images]);

  const openAddForm = (prefill = {}) => {
    setEditing(null);
    setForm({ ...EMPTY, ...prefill });
    setDeviceImages([]);
    setShowForm(true);
    window.scrollTo(0,0);
  };

  const openEditForm = (p) => {
    setEditing(p);
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
    setDeviceImages(Array.isArray(p.images) ? p.images.filter(i=>i.startsWith('data:')) : []);
    setShowForm(true); setTab('products'); window.scrollTo(0,0);
  };

  const handleFormChange = (e) => {
    const {name,value,type,checked} = e.target;
    setForm(f=>({...f,[name]:type==='checkbox'?checked:value}));
  };

  const handleDeviceImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const b64s = await Promise.all(files.map(fileToBase64));
      setDeviceImages(prev=>[...prev,...b64s]);
      toast(`✅ ${files.length} image(s) added`);
    } catch { toast('❌ Failed to load images'); }
  };

  const allImages = [...deviceImages, ...urlImagePreview];

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
        approval_status: 'approved',
        is_published: form.is_published,
      };
      if (editingProduct) { await api.adminUpdateProduct(editingProduct.id, payload); toast('✅ Updated!'); }
      else { await api.adminCreateProduct(payload); toast('✅ Product added!'); }
      setShowForm(false); setEditing(null); setForm(EMPTY); setDeviceImages([]);
      loadAll(); loadCount();
    } catch (err) { toast('❌ '+err.message); }
    finally { setSaving(false); }
  };

  const approve = async (id) => {
    await api.adminApprove(id); toast('✅ Approved!');
    loadPending(); loadAll(); loadCount();
  };
  const reject = async (id) => {
    await api.adminReject(id); toast('⛔ Rejected');
    loadPending(); loadAll(); loadCount();
  };
  const approveAll = async () => {
    if (!confirm(`Approve all ${pendingCount} pending products?`)) return;
    setApprovingAll(true);
    try { const r = await api.adminApproveAll(); toast(`✅ ${r.approved} products live!`); loadPending(); loadAll(); loadCount(); }
    catch { toast('❌ Failed'); }
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

  // Open side panel with Meesho URL + pre-fill source_url in form
  const openSidePanel = () => {
    if (!isUrl(scrapeUrl)) { toast('Please enter a valid URL'); return; }
    setShowPanel(true);
    // Pre-fill source_url in the add form
    openAddForm({ source_url: scrapeUrl });
    setTab('products');
  };

  const L = { fontWeight:600, fontSize:13, display:'block', marginBottom:6, color:'#424242' };
  const I = { width:'100%', padding:'11px 14px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none' };

  const tabs = [
    { key:'pending', label: pendingCount>0 ? `⏳ Pending (${pendingCount})` : '⏳ Pending' },
    { key:'scraper', label:'🔗 Import' },
    { key:'products', label:`📦 Products (${allProducts.length})` },
    { key:'jobs', label:`📋 Jobs` },
  ];

  return (
    <div style={{ display:'flex', minHeight:'calc(100vh - 60px)' }}>

      {/* ── SIDE PANEL: embedded product reference ── */}
      {showSidePanel && (
        <div style={{ width:420, flexShrink:0, borderRight:'2px solid #e0e0e0', background:'#fafafa', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'12px 16px', background:'#e53935', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:14 }}>📋 Product Reference</span>
            <button onClick={()=>setShowPanel(false)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'white', padding:'4px 10px', borderRadius:6, cursor:'pointer', fontWeight:700 }}>✕ Close</button>
          </div>
          <div style={{ padding:'10px 14px', background:'#fff8e1', borderBottom:'1px solid #ffe082' }}>
            <p style={{ fontSize:12, color:'#795548', fontWeight:600 }}>Copy details from the page below into the form on the right →</p>
          </div>
          <iframe
            src={scrapeUrl}
            style={{ flex:1, border:'none', width:'100%' }}
            title="Product Reference"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
          <div style={{ padding:12, background:'white', borderTop:'1px solid #e0e0e0' }}>
            <a href={scrapeUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:12, color:'#1565c0', fontWeight:600 }}>🔗 Open in new tab ↗</a>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, padding:'24px 20px', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:800 }}>🛠 Admin Dashboard</h1>
          {pendingCount > 0 && (
            <span style={{ background:'#e53935', color:'white', padding:'5px 14px', borderRadius:20, fontSize:13, fontWeight:700 }}>
              🔔 {pendingCount} pending
            </span>
          )}
        </div>

        {/* ── PRODUCT FORM ── */}
        {showForm && (
          <div style={{ background:'white', borderRadius:12, padding:24, marginBottom:24, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', border:'2px solid #e53935' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontWeight:800, fontSize:18 }}>{editingProduct?'✏️ Edit Product':'➕ Add New Product'}</h2>
              <button onClick={()=>{setShowForm(false);setEditing(null);setDeviceImages([]);setShowPanel(false);}}
                style={{ background:'#f5f5f5', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontWeight:700 }}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={L}>Product Name *</label>
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Cotton Kurti Wholesale Pack" style={I} />
              </div>

              <div style={{ gridColumn:'1/-1' }}>
                <label style={L}>Description</label>
                <textarea name="description" value={form.description} onChange={handleFormChange}
                  placeholder="Product description..." rows={3} style={{...I,resize:'vertical'}} />
              </div>

              <div>
                <label style={L}>Selling Price (₹) *</label>
                <input name="price" type="number" value={form.price} onChange={handleFormChange} placeholder="299" style={I} />
              </div>
              <div>
                <label style={L}>Original / MRP (₹)</label>
                <input name="original_price" type="number" value={form.original_price} onChange={handleFormChange} placeholder="499" style={I} />
              </div>

              <div>
                <label style={L}>Category</label>
                <input name="category" value={form.category} onChange={handleFormChange} placeholder="e.g. Sarees, Shoes" style={I} />
              </div>
              <div>
                <label style={L}>Brand / Supplier</label>
                <input name="brand" value={form.brand} onChange={handleFormChange} placeholder="e.g. XYZ Textiles" style={I} />
              </div>

              <div>
                <label style={L}>Stock</label>
                <input name="stock" type="number" value={form.stock} onChange={handleFormChange} style={I} />
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
                <label style={L}>Min. Order Qty</label>
                <input name="min_order" type="number" value={form.min_order} onChange={handleFormChange} style={I} />
              </div>
              <div>
                <label style={L}>Subcategory</label>
                <input name="subcategory" value={form.subcategory} onChange={handleFormChange} style={I} />
              </div>

              <div style={{ gridColumn:'1/-1' }}>
                <label style={L}>
                  🔗 Source Link <span style={{ color:'#e53935', fontSize:11 }}>(Admin only)</span>
                </label>
                <input name="source_url" value={form.source_url} onChange={handleFormChange}
                  placeholder="https://www.meesho.com/..." style={{...I, borderColor:'#ff6f00'}} />
              </div>

              {/* Device image upload */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={L}>📱 Upload from Device</label>
                <div onClick={()=>fileInputRef.current?.click()}
                  style={{ border:'2px dashed #e0e0e0', borderRadius:8, padding:16, textAlign:'center', cursor:'pointer', background:'#fafafa' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#e53935';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#e0e0e0';}}>
                  <div style={{ fontSize:28, marginBottom:4 }}>📷</div>
                  <p style={{ fontWeight:600, fontSize:13 }}>Click to upload images</p>
                  <p style={{ fontSize:11, color:'#757575' }}>JPG, PNG, WEBP — multiple allowed</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleDeviceImages} style={{ display:'none' }} />
              </div>

              <div style={{ gridColumn:'1/-1' }}>
                <label style={L}>🌐 Image URLs (comma-separated)</label>
                <textarea name="images" value={form.images} onChange={handleFormChange}
                  placeholder="https://img1.jpg, https://img2.jpg" rows={2} style={{...I,resize:'vertical'}} />
              </div>

              {allImages.length > 0 && (
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={L}>Preview ({allImages.length} images)</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {allImages.map((url,i) => (
                      <div key={i} style={{ position:'relative' }}>
                        <img src={url} alt="" style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:i===0?'3px solid #e53935':'1px solid #e0e0e0' }}
                          onError={e=>{e.target.style.opacity='0.3';}} />
                        {i===0 && <span style={{ position:'absolute',bottom:2,left:2,background:'#e53935',color:'white',fontSize:8,padding:'1px 4px',borderRadius:4,fontWeight:700 }}>MAIN</span>}
                        {url.startsWith('data:') && (
                          <button onClick={()=>setDeviceImages(d=>d.filter((_,j)=>j!==deviceImages.indexOf(url)))}
                            style={{ position:'absolute',top:-5,right:-5,background:'#e53935',color:'white',border:'none',borderRadius:'50%',width:16,height:16,fontSize:9,cursor:'pointer',fontWeight:700 }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" name="is_published" checked={form.is_published} onChange={handleFormChange} id="pub" style={{ width:16,height:16 }} />
                <label htmlFor="pub" style={{ fontWeight:600, cursor:'pointer', fontSize:14 }}>Publish immediately</label>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button onClick={()=>{setShowForm(false);setEditing(null);setDeviceImages([]);setShowPanel(false);}}
                style={{ padding:'11px 22px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', fontWeight:600, cursor:'pointer' }}>Cancel</button>
              <button onClick={saveProduct} disabled={saving}
                style={{ padding:'11px 28px', borderRadius:8, background:'#e53935', color:'white', fontWeight:700, border:'none', cursor:'pointer', fontSize:15 }}>
                {saving?'⏳ Saving...':editingProduct?'✅ Update':'➕ Add Product'}
              </button>
            </div>
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'2px solid #e0e0e0', flexWrap:'wrap' }}>
          {tabs.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{ padding:'9px 16px', border:'none', background:'none', fontWeight:700, fontSize:13, cursor:'pointer',
                color:tab===t.key?'#e53935':'#757575',
                borderBottom:tab===t.key?'2px solid #e53935':'2px solid transparent', marginBottom:-2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── IMPORT TAB ── */}
        {tab==='scraper' && (
          <div style={{ maxWidth:600 }}>
            <div className="card" style={{ padding:24, marginBottom:16 }}>
              <h2 style={{ fontWeight:700, marginBottom:6, fontSize:18 }}>🔗 Import Product by URL</h2>
              <p style={{ color:'#757575', fontSize:13, marginBottom:20 }}>
                Paste any product URL. We'll open it in a side panel so you can copy the details into the form.
              </p>

              <label style={L}>Product URL</label>
              <input value={scrapeUrl} onChange={e=>setScrapeUrl(e.target.value)}
                placeholder="https://www.meesho.com/product/p/xxxxx"
                style={{...I, marginBottom:12}}
                onKeyDown={e=>e.key==='Enter'&&openSidePanel()} />

              <button onClick={openSidePanel}
                style={{ padding:'12px 28px', background: isUrl(scrapeUrl)?'#e53935':'#bdbdbd', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor:isUrl(scrapeUrl)?'pointer':'not-allowed' }}>
                📋 Open Side Panel + Add Form
              </button>
            </div>

            {/* How it works */}
            <div style={{ background:'#e8f5e9', borderRadius:10, padding:20, marginBottom:16 }}>
              <p style={{ fontWeight:700, color:'#2e7d32', marginBottom:10, fontSize:15 }}>✅ How to add a product in 60 seconds:</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  ['1','Copy the product URL from the website'],
                  ['2','Paste above → click Open Side Panel'],
                  ['3','Product page opens on the left side'],
                  ['4','Fill in the form on the right from what you see'],
                  ['5','Paste image URLs or upload from your device'],
                  ['6','Click Add Product → done!'],
                ].map(([n, text]) => (
                  <div key={n} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ background:'#e53935', color:'white', width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{n}</span>
                    <span style={{ fontSize:13, color:'#1b5e20' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'#fff8e1', borderRadius:10, padding:16 }}>
              <p style={{ fontWeight:700, color:'#f57f17', marginBottom:6 }}>➕ Or add completely manually:</p>
              <button onClick={()=>openAddForm()}
                style={{ padding:'9px 20px', background:'#ff6f00', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>
                ➕ Add Product Manually (no URL needed)
              </button>
            </div>
          </div>
        )}

        {/* ── PENDING TAB ── */}
        {tab==='pending' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <p style={{ color:'#757575' }}>{pendingProducts.length} awaiting approval</p>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{loadPending();loadCount();}} style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600, fontSize:13 }}>🔄</button>
                {pendingProducts.length > 0 && (
                  <button onClick={approveAll} disabled={approvingAll}
                    style={{ padding:'7px 18px', borderRadius:8, background:'#43a047', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                    {approvingAll?'⏳...':'✅ Approve All ('+pendingProducts.length+')'}
                  </button>
                )}
              </div>
            </div>

            {pendingProducts.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#757575' }}>
                <div style={{ fontSize:48 }}>✅</div>
                <p style={{ fontWeight:600, marginTop:12 }}>No pending products</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                {pendingProducts.map(p=>(
                  <div key={p.id} className="card" style={{ overflow:'hidden', border:'2px solid #fff8e1' }}>
                    <div style={{ position:'relative', paddingTop:'65%', background:'#f5f5f5' }}>
                      <img src={p.image_url||'https://via.placeholder.com/280x180?text=No+Image'} alt=""
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
                        onError={e=>{e.target.src='https://via.placeholder.com/280x180?text=No+Image';}} />
                      <span style={{ position:'absolute',top:6,left:6,background:'#f57f17',color:'white',fontSize:10,padding:'2px 7px',borderRadius:5,fontWeight:700 }}>PENDING</span>
                    </div>
                    <div style={{ padding:12 }}>
                      <p style={{ fontWeight:700, fontSize:13, marginBottom:3, lineHeight:1.4 }}>{p.name}</p>
                      <p style={{ fontSize:11, color:'#757575', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description||'—'}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ fontWeight:800, color:'#e53935' }}>₹{Number(p.price).toLocaleString('en-IN')}</span>
                        {p.original_price>p.price&&<span style={{ fontSize:11, color:'#9e9e9e', textDecoration:'line-through' }}>₹{Number(p.original_price).toLocaleString('en-IN')}</span>}
                      </div>
                      {p.source_url&&(
                        <a href={p.source_url} target="_blank" rel="noopener noreferrer"
                          style={{ display:'block', fontSize:11, color:'#1565c0', fontWeight:600, marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          🔗 Source ↗
                        </a>
                      )}
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>approve(p.id)} style={{ flex:1, padding:'8px', background:'#43a047', color:'white', border:'none', borderRadius:7, fontWeight:700, cursor:'pointer', fontSize:12 }}>✅ Approve</button>
                        <button onClick={()=>reject(p.id)}  style={{ flex:1, padding:'8px', background:'#e53935', color:'white', border:'none', borderRadius:7, fontWeight:700, cursor:'pointer', fontSize:12 }}>✕ Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ALL PRODUCTS TAB ── */}
        {tab==='products' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <p style={{ color:'#757575', fontSize:13 }}>{allProducts.length} products</p>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={loadAll} style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600, fontSize:13 }}>🔄</button>
                <button onClick={()=>openAddForm()} style={{ padding:'7px 18px', borderRadius:8, background:'#e53935', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontSize:13 }}>➕ Add</button>
              </div>
            </div>
            {loading ? <div className="spinner"/> : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', background:'white', borderRadius:8, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
                  <thead>
                    <tr style={{ background:'#f5f5f5' }}>
                      {['Img','Product','Price','Category','Source','Status','Actions'].map(h=>(
                        <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'#757575', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allProducts.map((p,i)=>(
                      <tr key={p.id} style={{ borderTop:'1px solid #f0f0f0', background:i%2?'#fafafa':'white' }}>
                        <td style={{ padding:'8px 12px' }}>
                          <div style={{ position:'relative', width:50, height:50 }}>
                            <img src={p.image_url||'https://via.placeholder.com/50?text=?'} alt=""
                              style={{ width:50, height:50, objectFit:'cover', borderRadius:5 }}
                              onError={e=>{e.target.src='https://via.placeholder.com/50?text=?';}} />
                            {Array.isArray(p.images)&&p.images.length>1&&(
                              <span style={{ position:'absolute',bottom:-3,right:-3,background:'#1565c0',color:'white',fontSize:8,padding:'1px 3px',borderRadius:6,fontWeight:700 }}>+{p.images.length-1}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding:'8px 12px', maxWidth:180 }}>
                          <p style={{ fontWeight:700, fontSize:12, marginBottom:1 }}>{p.name}</p>
                          <p style={{ fontSize:10, color:'#757575', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:170 }}>{p.description||'—'}</p>
                          {p.brand&&<p style={{ fontSize:10, color:'#1565c0' }}>🏷 {p.brand}</p>}
                        </td>
                        <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                          <p style={{ fontWeight:700, color:'#e53935', fontSize:13 }}>₹{Number(p.price).toLocaleString('en-IN')}</p>
                          {p.original_price>p.price&&<p style={{ fontSize:10, color:'#9e9e9e', textDecoration:'line-through' }}>₹{Number(p.original_price).toLocaleString('en-IN')}</p>}
                        </td>
                        <td style={{ padding:'8px 12px', fontSize:11 }}>{p.category||'—'}</td>
                        <td style={{ padding:'8px 12px' }}>
                          {p.source_url?(
                            <a href={p.source_url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:11, color:'#1565c0', fontWeight:600, whiteSpace:'nowrap' }}>🔗 Source ↗</a>
                          ):<span style={{ color:'#bdbdbd', fontSize:11 }}>—</span>}
                        </td>
                        <td style={{ padding:'8px 12px' }}>
                          <button onClick={()=>togglePublish(p)}
                            style={{ padding:'3px 8px', borderRadius:10, border:'none', cursor:'pointer', fontSize:10, fontWeight:700,
                              background:p.is_published?'#e8f5e9':'#ffebee', color:p.is_published?'#2e7d32':'#c62828' }}>
                            {p.is_published?'✅ Live':'⛔ Hidden'}
                          </button>
                        </td>
                        <td style={{ padding:'8px 12px' }}>
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={()=>openEditForm(p)} style={{ padding:'4px 8px', borderRadius:5, background:'#e3f2fd', color:'#1565c0', border:'none', cursor:'pointer', fontWeight:700, fontSize:11 }}>✏️</button>
                            <button onClick={()=>deleteProduct(p.id,p.name)} style={{ padding:'4px 8px', borderRadius:5, background:'#ffebee', color:'#c62828', border:'none', cursor:'pointer', fontWeight:700, fontSize:11 }}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!allProducts.length&&!loading&&(
                  <div style={{ textAlign:'center', padding:50, color:'#757575' }}>
                    <div style={{ fontSize:40 }}>📦</div>
                    <p style={{ fontWeight:600, marginTop:10 }}>No products yet</p>
                    <button onClick={()=>openAddForm()} style={{ marginTop:12, padding:'9px 22px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>➕ Add First Product</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── JOBS TAB ── */}
        {tab==='jobs' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <p style={{ color:'#757575', fontSize:13 }}>{jobs.length} import jobs</p>
              <button onClick={loadJobs} style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600, fontSize:13 }}>🔄</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {jobs.map(j=>(
                <div key={j.id} className="card" style={{ padding:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>"{j.query}"</p>
                    <p style={{ fontSize:11, color:'#757575' }}>{new Date(j.started_at).toLocaleString('en-IN')}</p>
                    {j.error&&<p style={{ fontSize:11, color:'#e53935', marginTop:3 }}>⚠️ {j.error}</p>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:700,
                      background:j.status==='completed'?'#e8f5e9':j.status==='failed'?'#ffebee':'#fff8e1',
                      color:j.status==='completed'?'#2e7d32':j.status==='failed'?'#c62828':'#f57f17' }}>
                      {j.status.toUpperCase()}
                    </span>
                    {j.products_found>0&&<p style={{ fontSize:12, fontWeight:700, marginTop:4, color:'#2e7d32' }}>✅ {j.products_found} saved</p>}
                  </div>
                </div>
              ))}
              {!jobs.length&&<div style={{ textAlign:'center', padding:50, color:'#757575' }}>No jobs yet.</div>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
