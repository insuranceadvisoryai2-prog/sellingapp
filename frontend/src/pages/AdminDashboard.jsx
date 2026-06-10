import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useToast } from '../App.jsx';

export default function AdminDashboard() {
  const [tab, setTab] = useState('scraper');
  const [products, setProducts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [scrapeQuery, setScrapeQuery] = useState('');
  const [scrapeSites, setScrapeSites] = useState(['meesho', 'indiamart']);
  const [scraping, setScraping] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadProducts = () => {
    setLoading(true);
    api.adminGetProducts().then(setProducts).finally(() => setLoading(false));
  };

  const loadJobs = () => api.adminScrapeJobs().then(setJobs).catch(() => {});

  useEffect(() => { loadJobs(); loadProducts(); }, []);

  const startScrape = async () => {
    if (!scrapeQuery.trim()) { toast('Enter a search query'); return; }
    if (!scrapeSites.length) { toast('Select at least one site'); return; }
    setScraping(true);
    try {
      const r = await api.adminScrape(scrapeQuery, scrapeSites);
      toast(`✅ Scrape started! Job #${r.jobId} — check jobs tab in ~1 min`);
      setScrapeQuery('');
      setTimeout(() => loadJobs(), 5000);
      setTimeout(() => { loadJobs(); loadProducts(); }, 60000);
    } catch (e) {
      toast('❌ ' + e.message);
    } finally { setScraping(false); }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.adminDeleteProduct(id);
    toast('Product deleted');
    loadProducts();
  };

  const togglePublish = async (product) => {
    await api.adminUpdateProduct(product.id, { is_published: !product.is_published });
    loadProducts();
  };

  const tabs = ['scraper', 'products', 'jobs'];

  return (
    <div className="container" style={{ padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>🛠 Admin Dashboard</h1>
        <span style={{ background: '#e53935', color: 'white', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>ADMIN</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e0e0e0' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', textTransform: 'capitalize',
              color: tab === t ? '#e53935' : '#757575', borderBottom: tab === t ? '2px solid #e53935' : '2px solid transparent', marginBottom: -2 }}>
            {t === 'scraper' ? '🔍 Scraper' : t === 'products' ? `📦 Products (${products.length})` : `📋 Jobs (${jobs.length})`}
          </button>
        ))}
      </div>

      {/* SCRAPER TAB */}
      {tab === 'scraper' && (
        <div className="card" style={{ padding: 28, maxWidth: 600 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 20 }}>Scrape Products</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>Search Query</label>
            <input value={scrapeQuery} onChange={e => setScrapeQuery(e.target.value)}
              placeholder="e.g. cotton sarees, mobile accessories, toys..."
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14 }}
              onKeyDown={e => e.key === 'Enter' && startScrape()} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>Sources</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['meesho', 'indiamart'].map(site => (
                <label key={site} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>
                  <input type="checkbox" checked={scrapeSites.includes(site)}
                    onChange={e => setScrapeSites(s => e.target.checked ? [...s, site] : s.filter(x => x !== site))} />
                  {site === 'meesho' ? '🛍 Meesho' : '🏭 IndiaMart'}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={startScrape} disabled={scraping} style={{ padding: '12px 28px', fontSize: 15 }}>
            {scraping ? '⏳ Starting scrape...' : '🚀 Start Scraping'}
          </button>
          <p style={{ color: '#757575', fontSize: 12, marginTop: 12 }}>
            Scraping runs in background. Products appear in store automatically. Check Jobs tab for status.
          </p>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ color: '#757575' }}>{products.length} total products</p>
            <button className="btn btn-primary btn-sm" onClick={loadProducts}>Refresh</button>
          </div>
          {loading ? <div className="spinner" /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    {['Image','Name','Price','Category','Source','Published','Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#757575', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0', background: i % 2 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <img src={p.image_url || 'https://via.placeholder.com/40'} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} onError={e => { e.target.src = 'https://via.placeholder.com/40'; }} />
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#e53935', whiteSpace: 'nowrap' }}>₹{Number(p.price).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#555' }}>{p.category || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#e3f2fd', color: '#1565c0', fontWeight: 700, textTransform: 'capitalize' }}>{p.source_site || 'manual'}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => togglePublish(p)} style={{ padding: '4px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          background: p.is_published ? '#e8f5e9' : '#ffebee', color: p.is_published ? '#2e7d32' : '#c62828' }}>
                          {p.is_published ? '✅ Live' : '⛔ Hidden'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => deleteProduct(p.id)} style={{ color: '#e53935', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* JOBS TAB */}
      {tab === 'jobs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ color: '#757575' }}>{jobs.length} scrape jobs</p>
            <button className="btn btn-primary btn-sm" onClick={loadJobs}>Refresh</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {jobs.map(j => (
              <div key={j.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700 }}>"{j.query}" on {j.site}</p>
                  <p style={{ fontSize: 12, color: '#757575', marginTop: 4 }}>{new Date(j.started_at).toLocaleString('en-IN')}</p>
                  {j.error && <p style={{ fontSize: 12, color: '#e53935', marginTop: 4 }}>Error: {j.error}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: j.status === 'completed' ? '#e8f5e9' : j.status === 'failed' ? '#ffebee' : '#fff8e1',
                    color: j.status === 'completed' ? '#2e7d32' : j.status === 'failed' ? '#c62828' : '#f57f17' }}>
                    {j.status.toUpperCase()}
                  </span>
                  {j.products_found > 0 && <p style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: '#2e7d32' }}>{j.products_found} products saved</p>}
                </div>
              </div>
            ))}
            {!jobs.length && <div style={{ textAlign: 'center', padding: 60, color: '#757575' }}>No scrape jobs yet. Start one in the Scraper tab.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
