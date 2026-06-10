import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useToast } from '../App.jsx';

const EMPTY_PRODUCT = {
  name: '', description: '', price: '', original_price: '',
  discount_pct: '', category: '', subcategory: '', brand: '',
  stock: '999', unit: 'piece', min_order: '1',
  image_url: '', images: '', is_published: true,
};

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

  const loadProducts = () => {
    setLoading(true);
    api.adminGetProducts().then(setProducts).catch(() => toast('❌ Failed to load products')).finally(() => setLoading(false));
  };
  const loadJobs = () => api.adminScrapeJobs().then(setJobs).catch(() => {});

  useEffect(() => { loadProducts(); loadJobs(); }, []);

  // Update image preview when images field changes
  useEffect(() => {
    const urls = form.images
      ? form.images.split(',').map(s => s.trim()).filter(Boolean)
      : form.image_url ? [form.image_url] : [];
    setImagePreview(urls);
  }, [form.images, form.image_url]);

  const openAddForm = () => {
    setEditingProduct(null);
    setForm(EMPTY_PRODUCT);
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    const imgs = Array.isArray(product.images) ? product.images : [];
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      original_price: product.original_price || '',
      discount_pct: product.discount_pct || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      stock: product.stock || '999',
      unit: product.unit || 'piece',
      min_order: product.min_order || '1',
      image_url: product.image_url || '',
      images: imgs.join(', '),
      is_published: product.is_published !== false,
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { toast('❌ Product name is required'); return; }
    if (!form.price || isNaN(form.price)) { toast('❌ Valid price is required'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : parseFloat(form.price),
        discount_pct: parseInt(form.discount_pct) || 0,
        stock: parseInt(form.stock) || 999,
        min_order: parseInt(form.min_order) || 1,
        images: form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      if (editingProduct) {
        await api.adminUpdateProduct(editingProduct.id, payload);
        toast('✅ Product updated!');
      } else {
        await api.adminCreateProduct(payload);
        toast('✅ Product created!');
      }
      setShowForm(false);
      setEditingProduct(null);
      setForm(EMPTY_PRODUCT);
      loadProducts();
    } catch (err) {
      toast('❌ ' + err.message);
    } finally { setSaving(false); }
  };

  const deleteProduct = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await api.adminDeleteProduct(id); toast('🗑 Product deleted'); loadProducts(); }
    catch { toast('❌ Failed to delete'); }
  };

  const togglePublish = async (product) => {
    try {
      await api.adminUpdateProduct(product.id, { is_published: !product.is_published });
      toast(product.is_published ? '⛔ Product hidden' : '✅ Product published');
      loadProducts();
    } catch { toast('❌ Failed to update'); }
  };

  const startScrape = async () => {
    if (!scrapeQuery.trim()) { toast('Enter a search query'); return; }
    if (!scrapeSites.length) { toast('Select at least one site'); return; }
    setScraping(true);
    try {
      const r = await api.adminScrape(scrapeQuery, scrapeSites);
      toast(`✅ Scrape started! Job #${r.jobId} — products appear in ~1 min`);
      setScrapeQuery('');
      setTimeout(() => { loadJobs(); loadProducts(); }, 30000);
      setTimeout(() => { loadJobs(); loadProducts(); }, 90000);
    } catch (e) { toast('❌ ' + e.message); }
    finally { setScraping(false); }
  };

  return (
    <div className="container" style={{ padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>🛠 Admin Dashboard</h1>
        <span style={{ background: '#e53935', color: 'white', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>ADMIN</span>
      </div>

      {/* ── ADD/EDIT PRODUCT FORM ────────────────────────────────── */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, padding: 28, marginBottom: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '2px solid #e53935' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontWeight: 800, fontSize: 20 }}>
              {editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingProduct(null); }}
              style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700 }}>
              ✕ Cancel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Product Name */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Product Name *</label>
              <input name="name" value={form.name} onChange={handleFormChange}
                placeholder="e.g. Cotton Saree Wholesale Pack"
                style={inputStyle} />
            </div>

            {/* Description */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Description</label>
              <textarea name="description" value={form.description} onChange={handleFormChange}
                placeholder="Detailed product description for customers..."
                rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Price */}
            <div>
              <label style={labelStyle}>Selling Price (₹) *</label>
              <input name="price" type="number" value={form.price} onChange={handleFormChange}
                placeholder="e.g. 299" style={inputStyle} />
            </div>

            {/* Original Price */}
            <div>
              <label style={labelStyle}>Original/MRP Price (₹)</label>
              <input name="original_price" type="number" value={form.original_price} onChange={handleFormChange}
                placeholder="e.g. 499 (shows strikethrough)" style={inputStyle} />
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>Category</label>
              <input name="category" value={form.category} onChange={handleFormChange}
                placeholder="e.g. Sarees, Electronics, Toys" style={inputStyle} />
            </div>

            {/* Brand */}
            <div>
              <label style={labelStyle}>Brand / Supplier</label>
              <input name="brand" value={form.brand} onChange={handleFormChange}
                placeholder="e.g. XYZ Textiles" style={inputStyle} />
            </div>

            {/* Stock */}
            <div>
              <label style={labelStyle}>Stock Quantity</label>
              <input name="stock" type="number" value={form.stock} onChange={handleFormChange}
                placeholder="999" style={inputStyle} />
            </div>

            {/* Unit */}
            <div>
              <label style={labelStyle}>Unit</label>
              <select name="unit" value={form.unit} onChange={handleFormChange} style={inputStyle}>
                {['piece','pieces','set','dozen','kg','gram','meter','litre','box','pack','bundle'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Min Order */}
            <div>
              <label style={labelStyle}>Minimum Order Quantity</label>
              <input name="min_order" type="number" value={form.min_order} onChange={handleFormChange}
                placeholder="1" style={inputStyle} />
            </div>

            {/* Subcategory */}
            <div>
              <label style={labelStyle}>Subcategory</label>
              <input name="subcategory" value={form.subcategory} onChange={handleFormChange}
                placeholder="e.g. Cotton Sarees" style={inputStyle} />
            </div>

            {/* Images */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Product Images (comma-separated URLs)</label>
              <textarea name="images" value={form.images} onChange={handleFormChange}
                placeholder="https://image1.jpg, https://image2.jpg, https://image3.jpg"
                rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              <p style={{ fontSize: 12, color: '#757575', marginTop: 4 }}>
                First image will be the main/cover image. You can add multiple URLs separated by commas.
              </p>
            </div>

            {/* Image Preview */}
            {imagePreview.length > 0 && (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Image Preview</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {imagePreview.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt={`preview ${i+1}`}
                        style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: i===0 ? '3px solid #e53935' : '1px solid #e0e0e0' }}
                        onError={e => { e.target.style.display='none'; }} />
                      {i===0 && <span style={{ position:'absolute', bottom:4, left:4, background:'#e53935', color:'white', fontSize:9, padding:'1px 5px', borderRadius:4, fontWeight:700 }}>MAIN</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Published toggle */}
            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" name="is_published" checked={form.is_published} onChange={handleFormChange}
                id="is_published" style={{ width: 18, height: 18 }} />
              <label htmlFor="is_published" style={{ fontWeight: 600, cursor: 'pointer' }}>
                Publish immediately (visible to customers)
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditingProduct(null); }}
              style={{ padding: '12px 24px', borderRadius: 8, border: '1px solid #e0e0e0', background: 'white', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={saveProduct} disabled={saving}
              style={{ padding: '12px 32px', borderRadius: 8, background: '#e53935', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15 }}>
              {saving ? '⏳ Saving...' : editingProduct ? '✅ Update Product' : '➕ Add Product'}
            </button>
          </div>
        </div>
      )}

      {/* ── TABS ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e0e0e0' }}>
        {['scraper','products','jobs'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              color: tab===t ? '#e53935' : '#757575', borderBottom: tab===t ? '2px solid #e53935' : '2px solid transparent', marginBottom: -2 }}>
            {t==='scraper' ? '🔍 Scraper' : t==='products' ? `📦 Products (${products.length})` : `📋 Jobs (${jobs.length})`}
          </button>
        ))}
      </div>

      {/* ── SCRAPER TAB ─────────────────────────────────────────── */}
      {tab==='scraper' && (
        <div className="card" style={{ padding: 28, maxWidth: 600 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 20 }}>Scrape Products Automatically</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Search Query</label>
            <input value={scrapeQuery} onChange={e => setScrapeQuery(e.target.value)}
              placeholder="e.g. cotton sarees, mobile accessories, toys..."
              style={inputStyle} onKeyDown={e => e.key==='Enter' && startScrape()} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Sources</label>
            <div style={{ display: 'flex', gap: 16 }}>
              {['meesho','indiamart'].map(site => (
                <label key={site} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontWeight:600 }}>
                  <input type="checkbox" checked={scrapeSites.includes(site)}
                    onChange={e => setScrapeSites(s => e.target.checked ? [...s,site] : s.filter(x=>x!==site))} />
                  {site==='meesho' ? '🛍 Meesho' : '🏭 IndiaMart'}
                </label>
              ))}
            </div>
          </div>
          <button onClick={startScrape} disabled={scraping}
            style={{ padding:'12px 28px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:15, cursor:'pointer' }}>
            {scraping ? '⏳ Starting...' : '🚀 Start Scraping'}
          </button>
          <div style={{ background:'#fff8e1', borderRadius:8, padding:14, marginTop:16 }}>
            <p style={{ fontSize:13, color:'#f57f17', fontWeight:600 }}>⚠️ Note</p>
            <p style={{ fontSize:12, color:'#795548', marginTop:4 }}>
              If live scraping is blocked by Meesho/IndiaMart, sample products will be generated automatically so your store always gets filled. Check Jobs tab for status.
            </p>
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ────────────────────────────────────────── */}
      {tab==='products' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ color:'#757575' }}>{products.length} products total</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={loadProducts} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600 }}>
                🔄 Refresh
              </button>
              <button onClick={openAddForm}
                style={{ padding:'8px 20px', borderRadius:8, background:'#e53935', color:'white', border:'none', cursor:'pointer', fontWeight:700 }}>
                ➕ Add Product Manually
              </button>
            </div>
          </div>

          {loading ? <div className="spinner" /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', background:'white', borderRadius:8, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background:'#f5f5f5' }}>
                    {['Image','Name & Description','Price','Category','Source','Status','Actions'].map(h => (
                      <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:12, fontWeight:700, color:'#757575', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id} style={{ borderTop:'1px solid #f0f0f0', background: i%2?'#fafafa':'white' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ position:'relative', width:60, height:60 }}>
                          <img src={p.image_url||'https://via.placeholder.com/60'} alt=""
                            style={{ width:60, height:60, objectFit:'cover', borderRadius:6 }}
                            onError={e => { e.target.src='https://via.placeholder.com/60'; }} />
                          {Array.isArray(p.images) && p.images.length > 1 && (
                            <span style={{ position:'absolute', bottom:-4, right:-4, background:'#1565c0', color:'white', fontSize:9, padding:'1px 4px', borderRadius:8, fontWeight:700 }}>
                              +{p.images.length-1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', maxWidth:220 }}>
                        <p style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{p.name}</p>
                        <p style={{ fontSize:11, color:'#757575', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>
                          {p.description || '—'}
                        </p>
                        {p.brand && <p style={{ fontSize:11, color:'#1565c0', marginTop:2 }}>{p.brand}</p>}
                      </td>
                      <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                        <p style={{ fontWeight:700, color:'#e53935' }}>₹{Number(p.price).toLocaleString('en-IN')}</p>
                        {p.original_price > p.price && (
                          <p style={{ fontSize:11, color:'#9e9e9e', textDecoration:'line-through' }}>₹{Number(p.original_price).toLocaleString('en-IN')}</p>
                        )}
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{p.category||'—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#e3f2fd', color:'#1565c0', fontWeight:700, textTransform:'capitalize' }}>
                          {p.source_site||'manual'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={() => togglePublish(p)}
                          style={{ padding:'4px 10px', borderRadius:12, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                            background: p.is_published?'#e8f5e9':'#ffebee', color: p.is_published?'#2e7d32':'#c62828' }}>
                          {p.is_published ? '✅ Live' : '⛔ Hidden'}
                        </button>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => { openEditForm(p); setTab('products'); }}
                            style={{ padding:'5px 10px', borderRadius:6, background:'#e3f2fd', color:'#1565c0', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => deleteProduct(p.id, p.name)}
                            style={{ padding:'5px 10px', borderRadius:6, background:'#ffebee', color:'#c62828', border:'none', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!products.length && !loading && (
                <div style={{ textAlign:'center', padding:60, color:'#757575' }}>
                  <div style={{ fontSize:48 }}>📦</div>
                  <p style={{ fontWeight:600, marginTop:12 }}>No products yet</p>
                  <button onClick={openAddForm} style={{ marginTop:16, padding:'10px 24px', background:'#e53935', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>
                    ➕ Add Your First Product
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── JOBS TAB ─────────────────────────────────────────────── */}
      {tab==='jobs' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <p style={{ color:'#757575' }}>{jobs.length} scrape jobs</p>
            <button onClick={loadJobs} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e0e0e0', background:'white', cursor:'pointer', fontWeight:600 }}>🔄 Refresh</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {jobs.map(j => (
              <div key={j.id} className="card" style={{ padding:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontWeight:700 }}>"{j.query}" on {j.site}</p>
                  <p style={{ fontSize:12, color:'#757575', marginTop:4 }}>{new Date(j.started_at).toLocaleString('en-IN')}</p>
                  {j.error && <p style={{ fontSize:12, color:'#e53935', marginTop:4 }}>⚠️ {j.error}</p>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ padding:'4px 12px', borderRadius:12, fontSize:12, fontWeight:700,
                    background: j.status==='completed'?'#e8f5e9':j.status==='failed'?'#ffebee':'#fff8e1',
                    color: j.status==='completed'?'#2e7d32':j.status==='failed'?'#c62828':'#f57f17' }}>
                    {j.status.toUpperCase()}
                  </span>
                  {j.products_found > 0 && <p style={{ fontSize:13, fontWeight:700, marginTop:6, color:'#2e7d32' }}>✅ {j.products_found} products saved</p>}
                </div>
              </div>
            ))}
            {!jobs.length && <div style={{ textAlign:'center', padding:60, color:'#757575' }}>No scrape jobs yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontWeight:600, fontSize:13, display:'block', marginBottom:6, color:'#424242' };
const inputStyle = { width:'100%', padding:'11px 14px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, outline:'none', fontFamily:'inherit' };
