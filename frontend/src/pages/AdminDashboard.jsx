import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useToast } from '../App.jsx';

const EMPTY_PRODUCT = {
  name: '', description: '', price: '', original_price: '',
  discount_pct: '', category: '', subcategory: '', brand: '',
  stock: '999', unit: 'piece', min_order: '1',
  image_url: '', images: '', is_published: true,
};

function isUrl(s) {
  return s.startsWith('http://') || s.startsWith('https://') || s.includes('meesho.com') || s.includes('indiamart.com');
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('scraper');
  const [products, setProducts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [scrapeQuery, setScrapeQuery] = useState('');
  const [scrapeSites, setScrapeSites] = useState(['meesho', 'indiamart']);
  const [scraping, setScraping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);
  const toast = useToast();

  const inputIsUrl = isUrl(scrapeQuery);

  const loadProducts = () => {
    setLoading(true);
    api.adminGetProducts().then(setProducts).catch(() => toast('❌ Failed')).finally(() => setLoading(false));
  };
  const loadJobs = () => api.adminScrapeJobs().then(setJobs).catch(() => {});

  useEffect(() => { loadProducts(); loadJobs(); }, []);

  useEffect(() => {
    const urls = form.images
      ? form.images.split(',').map(s => s.trim()).filter(Boolean)
      : form.image_url ? [form.image_url] : [];
    setImagePreview(urls);
  }, [form.images, form.image_url]);

  const openAddForm = () => { setEditingProduct(null); setForm(EMPTY_PRODUCT); setShowForm(true); window.scrollTo(0,0); };
  const openEditForm = (p) => {
    setEditingProduct(p);
    const imgs = Array.isArray(p.images) ? p.images : [];
    setForm({
      name: p.name||'', description: p.description||'',
      price: p.price||'', original_price: p.original_price||'',
      discount_pct: p.discount_pct||'', category: p.category||'',
      subcategory: p.subcategory||'', brand: p.brand||'',
      stock: p.stock||'999', unit: p.unit||'piece', min_order: p.min_order||'1',
      image_url: p.image_url||'', images: imgs.join(', '),
      is_published: p.is_published !== false,
    });
    setShowForm(true); setTab('products'); window.scrollTo(0,0);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type==='checkbox' ? checked : value }));
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { toast('❌ Product name required'); return; }
    if (!form.price || isNaN(form.price)) { toast('❌ Valid price required'); return; }
    setSaving(true);
    try {
      const imageArr = form.images ? form.images.split(',').map(s=>s.trim()).filter(Boolean) : [];
      const payload = {
        ...form,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : parseFloat(form.price),
        discount_pct: parseInt(form.discount_pct)||0,
        stock: parseInt(form.stock)||999,
        min_order: parseInt(form.min_order)||1,
        images: imageArr,
        image_url: imageArr[0] || form.image_url || '',
      };
      if (editingProduct) { await api.adminUpdateProduct(editingProduct.id, payload); toast('✅ Product updated!'); }
      else { await api.adminCreateProduct(payload); toast('✅ Product added!'); }
      setShowForm(false); setEditingProduct(null); setForm(EMPTY_PRODUCT); loadProducts();
    } catch (err) { toast('❌ '+err.message); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.adminDeleteProduct(id); toast('🗑 Deleted'); loadProducts();
  };

  const togglePublish = async (p) => {
    await api.adminUpdateProduct(p.id, { is_published: !p.is_published });
    toast(p.is_published ? '⛔ Hidden' : '✅ Published'); loadProducts();
  };

  const startScrape = async () => {
    if (!scrapeQuery.trim()) { toast('Enter a URL or keyword'); return; }
    setScraping(true);
    try {
      const r = await api.adminScrape(scrapeQuery, inputIsUrl ? ['meesho'] : scrapeSites);
      toast(`✅ Scrape started! Job #${r.jobId}`);
      setScrapeQuery('');
      setTimeout(() => { loadJobs(); loadProducts(); }, 15000);
      setTimeout(() => { loadJobs(); loadProducts(); }, 45000);
    } catch (e) { toast('❌ '+e.message); }
    finally { setScraping(false); }
  };

  const L = { fontWeight:600, fontSize:13, display:'block', marginBottom:6, color:'#424242' };
  const I = { width:'100%', padding:'11px 14px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none' };

  return (
    <div className="container" style={{ padding:'24px 16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800 }}>🛠 Admin Dashboard</h1>
        <span style={{ background:'#e53935', color:'white', padding:'4px 12px', borderRadius:12, fontSize:12, fontWeight:700 }}>ADMIN</span>
      </div>

      {/* ── ADD / EDIT FORM ── */}
      {showForm && (
        <div style={{ background:'white', borderRadius:12, padding:28, marginBottom:28, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', border:'2px solid #e53935' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <h2 style={{ fontWeight:800, fontSize:20 }}>{editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
            <button onClick={() => { setShowForm(false); setEditingProduct(null); }}
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
                placeholder="Detailed product description for customers..." rows={4} style={{ ...I, resize:'vertical' }} />
            </div>

            <div>
              <label style={L}>Selling Price (₹) *</label>
              <input name="price" type="number" value={form.price} onChange={handleFormChange} placeholder="299" style={I} />
            </div>
            <div>
              <label style={L}>Original / MRP Price (₹)</label>
              <input name="original_price" type="number" value={form.original_price} onChange={handleFormChange} placeholder="499 (shows as strikethrough)" style={I} />
            </div>

            <div>
              <label style={L}>Category</label>
              <input name="category" value={form.category} onChange={handleFormChange} placeholder="e.g. Sarees, Electronics, Toys" style={I} />
            </div>
            <div>
              <label style={L}>Brand / Supplier</label>
              <input name="brand" value={form.brand} onChange={handleFormChange} placeholder="e.g. XYZ Textiles" style={I} />
            </div>

            <div>
              <label style={L}>Stock Quantity</label>
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
              <label style={L}>Minimum Order Quantity</label>
              <input name="min_order" type="number" value={form.min_order} onChange={handleFormChange} placeholder="1" style={I} />
            </div>
            <div>
              <label style={L}>Subcategory</label>
              <input name="subcategory" value={form.subcategory} onChange={handleFormChange} placeholder="e.g. Cotton Sarees" style={I} />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={L}>Product Images — paste comma-separated URLs</label>
              <textarea name="images" value={form.images} onChange={handleFormChange}
                placeholder="https://image1.jpg, https://image2.jpg, https://image3.jpg"
                rows={2} style={{ ...I, resize:'vertical' }} />
              <p style={{ fontSize:12, color:'#757575', marginTop:4 }}>First URL = main/cover image. Add as many as you want separated by commas.</p>
            </div>

            {imagePreview.length > 0 && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={L}>Preview ({imagePreview.length} image{imagePreview.length>1?'s':''})</label>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {imagePreview.map((url,i) => (
                    <div key={i} style={{ position:'relative' }}>
                      <img src={url} alt={`img${i+1}`}
                        style={{ width:100, height:100, objectFit:'cover', borderRadius:8, border: i===0?'3px solid #e53935':'1px solid #e0e0e0' }}
                        onError={e=>{e.target.style.opacity='0.3';}} />
                      {i===0 && <span style={{ position:'absolute',bottom:4,left:4,background:'#e53935',color:'white',fontSize:9,padding:'1px 5px',borderRadius:4,fontWeight:700 }}>MAIN</span>}
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
            <button onClick={()=>{setShowForm(false);setEditingProduct(null);}}
              style={{ padding:'12px 24px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', fontWeight:600, cursor:'pointer' }}>Cancel</button>
            <button onClick={saveProduct} disabled={saving}
              style={{ padding:'12px 32px', borderRadius:8, background:'#e53935', color:'white', fontWeight:700, border:'none', cursor:'pointer', fontSize:15 }}>
              {saving ? '⏳ Saving...' : editingProduct ? '✅ Update Product' : '➕ Add Product'}
            </button>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'2px solid #e0e0e0' }}>
        {['scraper','products','jobs'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'10px 20px', border:'none', background:'none', fontWeight:700, fontSize:14, cursor:'pointer',
              color:tab===t?'#e53935':'#757575', borderBottom:tab===t?'2px solid #e53935':'2px solid transparent', marginBottom:-2 }}>
            {t==='scraper'?'🔍 Scraper':t==='products'?`📦 Products (${products.length})`:`📋 Jobs (${jobs.length})`}
          </button>
        ))}
      </div>

      {/* ── SCRAPER TAB ── */}
      {tab==='scraper' && (
        <div style={{ maxWidth:640 }}>
          <div className="card" style={{ padding:28, marginBottom:20 }}>
            <h2 style={{ fontWeight:700, marginBottom:6 }}>🔍 Scrape Products</h2>
            <p style={{ color:'#757575', fontSize:13, marginBottom:20 }}>Paste a product URL or type a keyword to scrape products automatically.</p>

            <div style={{ marginBottom:16 }}>
              <label style={L}>
                {inputIsUrl ? '🔗 Product URL detected' : '🔑 Search Keyword'}
              </label>
              <input value={scrapeQuery} onChange={e=>setScrapeQuery(e.target.value)}
                placeholder="Paste URL: https://www.meesho.com/... or keyword: cotton sarees"
                style={{ ...I, borderColor: inputIsUrl?'#1565c0':'#e0e0e0', background: inputIsUrl?'#e3f2fd':'white' }}
                onKeyDown={e=>e.key==='Enter'&&startScrape()} />
            </div>

            {/* Show mode indicator */}
            {scrapeQuery && (
              <div style={{ background: inputIsUrl?'#e3f2fd':'#e8f5e9', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
                {inputIsUrl ? (
                  <p>🔗 <strong>URL Mode:</strong> Will scrape this specific product page</p>
                ) : (
                  <p>🔑 <strong>Keyword Mode:</strong> Will search for "{scrapeQuery}" on selected sites</p>
                )}
              </div>
            )}

            {/* Sites selector — only show for keyword mode */}
            {!inputIsUrl && (
              <div style={{ marginBottom:20 }}>
                <label style={L}>Sources</label>
                <div style={{ display:'flex', gap:16 }}>
                  {['meesho','indiamart'].map(site=>(
                    <label key={site} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontWeight:600, background:'#f5f5f5', padding:'8px 16px', borderRadius:8,
                      border: scrapeSites.includes(site)?'2px solid #e53935':'2px solid transparent' }}>
                      <input type="checkbox" checked={scrapeSites.includes(site)}
                        onChange={e=>setScrapeSites(s=>e.target.checked?[...s,site]:s.filter(x=>x!==site))} />
                      {site==='meesho'?'🛍 Meesho':'🏭 IndiaMart'}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button onClick={startScrape} disabled={scraping||!scrapeQuery.trim()}
              style={{ padding:'13px 32px', background: scraping||!scrapeQuery.trim()?'#bdbdbd':'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor: scraping?'wait':'pointer' }}>
              {scraping ? '⏳ Scraping...' : inputIsUrl ? '🚀 Scrape This Product' : '🚀 Start Scraping'}
            </button>
          </div>

          <div style={{ background:'#fff8e1', borderRadius:8, padding:16 }}>
            <p style={{ fontWeight:700, color:'#f57f17', marginBottom:6 }}>💡 Tips</p>
            <ul style={{ fontSize:13, color:'#795548', paddingLeft:16, lineHeight:1.8 }}>
              <li>Paste a <strong>Meesho or IndiaMart product URL</strong> to import that exact product</li>
              <li>Type a <strong>keyword</strong> like "cotton sarees" to get multiple products</li>
              <li>If scraping is blocked, <strong>sample products</strong> are generated automatically</li>
              <li>Check <strong>Jobs tab</strong> for status after starting a scrape</li>
              <li>Use <strong>Add Product Manually</strong> for full control over product details</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {tab==='products' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ color:'#757575' }}>{products.length} products</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={loadProducts} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600 }}>🔄 Refresh</button>
              <button onClick={openAddForm} style={{ padding:'8px 20px', borderRadius:8, background:'#e53935', color:'white', border:'none', cursor:'pointer', fontWeight:700 }}>➕ Add Manually</button>
            </div>
          </div>

          {loading ? <div className="spinner"/> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', background:'white', borderRadius:8, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background:'#f5f5f5' }}>
                    {['Image','Product','Price','Category','Source','Status','Actions'].map(h=>(
                      <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:12, fontWeight:700, color:'#757575', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p,i)=>(
                    <tr key={p.id} style={{ borderTop:'1px solid #f0f0f0', background:i%2?'#fafafa':'white' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ position:'relative', width:60, height:60 }}>
                          <img src={p.image_url||'https://via.placeholder.com/60?text=No+Img'} alt=""
                            style={{ width:60, height:60, objectFit:'cover', borderRadius:6 }}
                            onError={e=>{e.target.src='https://via.placeholder.com/60?text=No+Img';}} />
                          {Array.isArray(p.images)&&p.images.length>1&&(
                            <span style={{ position:'absolute',bottom:-4,right:-4,background:'#1565c0',color:'white',fontSize:9,padding:'1px 4px',borderRadius:8,fontWeight:700 }}>+{p.images.length-1}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', maxWidth:220 }}>
                        <p style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{p.name}</p>
                        <p style={{ fontSize:11, color:'#757575', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{p.description||'—'}</p>
                        {p.brand&&<p style={{ fontSize:11, color:'#1565c0', marginTop:2 }}>🏷 {p.brand}</p>}
                      </td>
                      <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                        <p style={{ fontWeight:700, color:'#e53935' }}>₹{Number(p.price).toLocaleString('en-IN')}</p>
                        {p.original_price>p.price&&<p style={{ fontSize:11, color:'#9e9e9e', textDecoration:'line-through' }}>₹{Number(p.original_price).toLocaleString('en-IN')}</p>}
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{p.category||'—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#e3f2fd', color:'#1565c0', fontWeight:700, textTransform:'capitalize' }}>{p.source_site||'manual'}</span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={()=>togglePublish(p)}
                          style={{ padding:'4px 10px', borderRadius:12, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                            background:p.is_published?'#e8f5e9':'#ffebee', color:p.is_published?'#2e7d32':'#c62828' }}>
                          {p.is_published?'✅ Live':'⛔ Hidden'}
                        </button>
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
              {!products.length&&!loading&&(
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
            <button onClick={loadJobs} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600 }}>🔄 Refresh</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {jobs.map(j=>(
              <div key={j.id} className="card" style={{ padding:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontWeight:700, fontSize:14 }}>"{j.query}"</p>
                  <p style={{ fontSize:12, color:'#757575', marginTop:2 }}>on {j.site} · {new Date(j.started_at).toLocaleString('en-IN')}</p>
                  {j.error&&<p style={{ fontSize:12, color:'#e53935', marginTop:4 }}>⚠️ {j.error}</p>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ padding:'4px 12px', borderRadius:12, fontSize:12, fontWeight:700,
                    background:j.status==='completed'?'#e8f5e9':j.status==='failed'?'#ffebee':'#fff8e1',
                    color:j.status==='completed'?'#2e7d32':j.status==='failed'?'#c62828':'#f57f17' }}>
                    {j.status.toUpperCase()}
                  </span>
                  {j.products_found>0&&<p style={{ fontSize:13, fontWeight:700, marginTop:6, color:'#2e7d32' }}>✅ {j.products_found} products saved</p>}
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
