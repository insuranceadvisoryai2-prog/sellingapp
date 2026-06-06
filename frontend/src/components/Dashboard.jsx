import React, { useState, useEffect } from 'react';
import { 
  Link2, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, 
  ArrowRight, ShieldAlert, Edit3, Save, ExternalLink, DownloadCloud 
} from 'lucide-react';
import API_URL from '../api';

export default function Dashboard({ onPublishSuccess, subcategories }) {
  const [url, setUrl] = useState('');
  const [loadingStep, setLoadingStep] = useState(null); // 'scraping' | 'rewriting' | null
  const [error, setError] = useState(null);
  const [scrapedData, setScrapedData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [editedTitle, setEditedTitle] = useState('');
  const [editedDesc, setEditedDesc] = useState('');
  const [editedSubcat, setEditedSubcat] = useState('');
  const [editedPrice, setEditedPrice] = useState(0);
  const [editedImages, setEditedImages] = useState([]);

  // Sync edit form states when new data is generated
  useEffect(() => {
    if (scrapedData) {
      setEditedPrice(scrapedData.price || 0);
      setEditedImages(scrapedData.images || []);
    }
  }, [scrapedData]);

  useEffect(() => {
    if (aiData) {
      setEditedTitle(aiData.rewritten_title || '');
      setEditedDesc(aiData.selling_description || '');
      setEditedSubcat(aiData.subcategory || '');
    }
  }, [aiData]);

  const handleScrapeAndRewrite = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setError(null);
    setSuccessMsg(null);
    setScrapedData(null);
    setAiData(null);
    setLoadingStep('scraping');

    try {
      // Step 1: Scrape product page
      const scrapeRes = await fetch(`${API_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!scrapeRes.ok) {
        const errData = await scrapeRes.json();
        throw new Error(errData.error || 'Failed to fetch product data.');
      }

      const scraped = await scrapeRes.json();
      setScrapedData(scraped);

      // Step 2: Optimize listing
      setLoadingStep('rewriting');
      const rewriteRes = await fetch(`${API_URL}/api/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: scraped.title, description: scraped.description })
      });

      if (!rewriteRes.ok) {
        const errData = await rewriteRes.json();
        throw new Error(errData.error || 'Listing optimization failed.');
      }

      const ai = await rewriteRes.json();
      setAiData(ai);
      setLoadingStep(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoadingStep(null);
    }
  };

  const handlePublish = async () => {
    if (!scrapedData || !editedTitle) return;
    setError(null);
    setSuccessMsg(null);

    const payload = {
      originalUrl: url,
      originalTitle: scrapedData.title,
      rewrittenTitle: editedTitle,
      price: Number(editedPrice),
      originalPrice: scrapedData.originalPrice,
      description: scrapedData.description,
      sellingDescription: editedDesc,
      images: editedImages.length > 0 ? editedImages : scrapedData.images,
      specifications: scrapedData.specifications,
      subcategory: editedSubcat,
      parentCategory: aiData?.parent_category || 'Other'
    };

    try {
      const res = await fetch(`${API_URL}/api/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to publish listing.');
      }

      setSuccessMsg('Product successfully published to your catalog!');
      // Reset dashboard states
      setUrl('');
      setScrapedData(null);
      setAiData(null);
      // Callback to refresh catalog grid counts
      if (onPublishSuccess) onPublishSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Search/URL Pasting Panel */}
      <div className="glass-panel rounded-3xl p-8 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-pink/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-violet/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans sm:text-4xl bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
                <DownloadCloud className="w-8 h-8 text-brand-pink" />
                Republish Supplier Products
              </h2>
              <p className="text-sm text-slate-400">
                Paste a product link from the Supplier. We'll fetch it, optimize the listing automatically, auto-categorize it, and add it to your premium product catalog.
              </p>
            </div>
          </div>

          <form onSubmit={handleScrapeAndRewrite} className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
            <div className="relative flex-grow">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Supplier product URL here (e.g. https://www.supplier.com/...)"
                className="w-full pl-12 pr-4 py-4 rounded-2xl glass-input text-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loadingStep !== null}
              className="px-8 py-4 bg-gradient-to-r from-brand-violet to-brand-pink hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-brand-violet/25 flex items-center justify-center gap-2"
            >
              {loadingStep ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Fetch & Optimize</span>
                </>
              )}
            </button>
          </form>

          {/* Loading stage tracker */}
          {loadingStep && (
            <div className="flex flex-col items-center justify-center gap-3 pt-4 text-sm font-medium">
              <div className="flex items-center gap-2 text-slate-300">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-pink" />
                {loadingStep === 'scraping' && <span>Fetching Supplier page source...</span>}
                {loadingStep === 'rewriting' && <span>Optimizing product listing...</span>}
              </div>
              <div className="w-64 bg-dark-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-brand-violet to-brand-pink transition-all duration-500`}
                  style={{ width: loadingStep === 'scraping' ? '50%' : '90%' }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/20 max-w-3xl mx-auto">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300">
                  <span className="font-bold">Error:</span> {error}
                </div>
              </div>
              
              <div className="pt-3 border-t border-red-500/20 mt-2">
                <p className="text-xs text-slate-300 mb-3 font-semibold">The supplier's anti-bot system is blocking our requests. To bypass this, paste the product page's HTML below:</p>
                <p className="text-[10px] text-slate-400 mb-3">Instructions: Open the supplier product page in your browser, press <kbd className="bg-dark-800 px-1 py-0.5 rounded">Ctrl+U</kbd> (or right-click "View Page Source"), press <kbd className="bg-dark-800 px-1 py-0.5 rounded">Ctrl+A</kbd> to select all, copy, and paste here.</p>
                <div className="flex gap-2">
                  <textarea 
                    id="htmlPaste"
                    placeholder="Paste page source HTML here..."
                    className="w-full h-24 p-3 rounded-xl glass-input text-white text-[10px] font-mono"
                  ></textarea>
                  <button 
                    onClick={async () => {
                      const html = document.getElementById('htmlPaste').value;
                      if (!html) return;
                      setLoadingStep('scraping');
                      setError(null);
                      try {
                        const res = await fetch(`${API_URL}/api/parse-html`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ html })
                        });
                        if (!res.ok) {
                          const errData = await res.json();
                          throw new Error(errData.error || 'Failed to parse HTML.');
                        }
                        const scraped = await res.json();
                        setScrapedData(scraped);

                        // Step 2: Trigger optimize step
                        setLoadingStep('rewriting');
                        const rewriteRes = await fetch(`${API_URL}/api/rewrite`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: scraped.title, description: scraped.description })
                        });
                        if (!rewriteRes.ok) {
                          const errData = await rewriteRes.json();
                          throw new Error(errData.error || 'Listing optimization failed.');
                        }
                        const ai = await rewriteRes.json();
                        setAiData(ai);
                        setLoadingStep(null);
                      } catch (err) {
                        setError(err.message);
                        setLoadingStep(null);
                      }
                    }}
                    className="px-4 bg-brand-pink hover:bg-brand-pink/90 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    Process HTML
                  </button>
                </div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 max-w-3xl mx-auto">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-300 font-medium">
                {successMsg}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor & Preview Workspace */}
      {scrapedData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand-pink" />
              Optimize Product Listing
            </h2>
            <span className="text-xs text-slate-400">Scrape complete. Verify original vs. optimized catalog listing below.</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Original Data Preview */}
            <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-6 opacity-75 bg-dark-900/40">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Original Supplier Data</span>
                <span className="text-xs px-2.5 py-1 bg-dark-800 text-slate-400 rounded-full">Scraped</span>
              </div>

              <div className="flex gap-4">
                {scrapedData.images && scrapedData.images[0] && (
                  <img
                    src={scrapedData.images[0]}
                    alt="Original"
                    className="w-24 h-24 object-cover rounded-xl border border-white/5"
                  />
                )}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-300">{scrapedData.title}</h3>
                  <p className="text-lg font-bold text-slate-200">{scrapedData.originalPrice || `₹${scrapedData.price}`}</p>
                  {scrapedData.category_hint && (
                    <span className="inline-block text-[10px] bg-dark-800 text-slate-400 px-2 py-0.5 rounded">
                      Category Tag: {scrapedData.category_hint}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
                <div className="bg-dark-950/40 p-4 rounded-xl text-xs text-slate-400 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-line">
                  {scrapedData.description || 'No description provided.'}
                </div>
              </div>

              {Object.keys(scrapedData.specifications).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Specifications</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(scrapedData.specifications).map(([key, val]) => (
                      <div key={key} className="bg-dark-950/20 p-2 rounded border border-white/5">
                        <span className="text-slate-500 block mb-0.5">{key}</span>
                        <span className="text-slate-300 font-medium truncate block">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Smart Optimized Listing editor */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6 relative bg-gradient-to-br from-dark-900 to-dark-800 shadow-2xl ring-1 ring-brand-purple/20">
              <div className="absolute -top-1.5 -right-1.5 px-3 py-1 bg-gradient-to-r from-brand-violet to-brand-pink rounded-full text-[10px] font-black uppercase tracking-widest shadow-md text-white">
                Smart Optimizer
              </div>
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-pink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Optimized Catalog Copy
                </span>
                <span className="text-xs text-slate-400">Editable before publishing</span>
              </div>

              {/* Title override */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Rewritten SEO Title</label>
                <input
                  type="text"
                  maxLength={70}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm font-semibold border-white/10"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Catchy, clear, search-friendly</span>
                  <span className={editedTitle.length > 65 ? 'text-brand-pink font-bold' : ''}>
                    {editedTitle.length}/70 chars
                  </span>
                </div>
              </div>

              {/* Description override */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Selling Description</label>
                <textarea
                  rows={3}
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-white text-xs leading-relaxed border-white/10 resize-none"
                />
                <span className="text-[10px] text-slate-500 block">2-sentence high-converting marketing pitch</span>
              </div>

              {/* Category selector override */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Assigned Subcategory</label>
                <select
                  value={editedSubcat}
                  onChange={(e) => setEditedSubcat(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm border-white/10 cursor-pointer"
                >
                  {subcategories.map(cat => (
                    <option key={cat} value={cat} className="bg-dark-900 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 block">Auto-categorized based on titles & tags</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Price override */}
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={editedPrice}
                    onChange={(e) => setEditedPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm font-semibold border-white/10"
                  />
                </div>

                {/* Images Section */}
                <div className="space-y-3 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Product Images ({editedImages.length} selected)</label>

                  {/* Scraped Meesho images — click to toggle */}
                  {scrapedData?.images?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-brand-pink font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>📦</span> Supplier Images — click to select / deselect
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {scrapedData.images.map((img, i) => {
                          const selected = editedImages.includes(img);
                          return (
                            <div
                              key={i}
                              onClick={() => selected
                                ? setEditedImages(editedImages.filter(x => x !== img))
                                : setEditedImages([...editedImages, img].slice(0, 8))
                              }
                              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${selected ? 'border-brand-pink ring-2 ring-brand-pink/40 scale-105' : 'border-white/10 opacity-50 hover:opacity-80 hover:border-white/30'}`}
                            >
                              <img src={img} className="w-full h-full object-cover" onError={e => { e.target.src='https://placehold.co/64x64/111/444?text=?'; }} />
                              {selected && (
                                <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand-pink rounded-full flex items-center justify-center">
                                  <span className="text-white text-[8px] font-black">✓</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manually added images (URL or local) */}
                  {editedImages.filter(img => !scrapedData?.images?.includes(img)).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Manually Added</p>
                      <div className="flex gap-2 flex-wrap">
                        {editedImages.filter(img => !scrapedData?.images?.includes(img)).map((img, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group shrink-0">
                            <img src={img} className="w-full h-full object-cover" onError={e => { e.target.src='https://placehold.co/64x64/111/444?text=?'; }} />
                            <button onClick={() => setEditedImages(editedImages.filter(x => x !== img))}
                              className="absolute inset-0 bg-red-500/80 items-center justify-center hidden group-hover:flex text-white font-bold text-[10px]">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add from URL */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      id="imgUrlInput"
                      placeholder="Paste any image URL and press Add..."
                      className="flex-1 px-3 py-2 rounded-xl glass-input text-white text-xs border-white/10"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('imgUrlInput');
                        const val = input?.value?.trim();
                        if (val && !editedImages.includes(val)) {
                          setEditedImages([...editedImages, val].slice(0, 8));
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-brand-violet hover:opacity-80 text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                    >+ Add URL</button>
                  </div>

                  {/* Local upload */}
                  <label className="flex items-center gap-2 w-full py-2 px-4 bg-dark-800 hover:bg-dark-700 border border-dashed border-white/20 rounded-xl cursor-pointer transition-all text-xs text-slate-400 hover:text-white">
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files).slice(0, 8 - editedImages.length);
                        Promise.all(files.map(f => new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(f); })))
                          .then(imgs => setEditedImages([...editedImages, ...imgs].slice(0, 8)));
                      }}
                    />
                    <span className="text-brand-pink font-black">↑</span> Upload from your device (up to 8 total)
                  </label>
                </div>
              </div>

              {/* Sticky bottom publish action */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>View original Supplier</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                
                <button
                  onClick={handlePublish}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publish to Catalog</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
