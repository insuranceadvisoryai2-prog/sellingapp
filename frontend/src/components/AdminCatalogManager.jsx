import React, { useMemo, useState } from 'react';
import { Edit3, Save, Search, Trash2, X, IndianRupee, Image as ImageIcon, ExternalLink } from 'lucide-react';
import API_URL from '../api';
const emptyEdit = {
  rewrittenTitle: '',
  price: 0,
  originalPrice: '',
  specialOfferPrice: 0,
  subcategory: '',
  parentCategory: '',
  sellingDescription: '',
  description: '',
  imagesText: '',
  specsText: '{}',
};

function productToEdit(product) {
  return {
    rewrittenTitle: product.rewrittenTitle || '',
    price: product.price || 0,
    originalPrice: product.originalPrice || '',
    specialOfferPrice: product.specialOfferPrice || 0,
    subcategory: product.subcategory || '',
    parentCategory: product.parentCategory || '',
    sellingDescription: product.sellingDescription || '',
    description: product.description || '',
    imagesText: (product.images || []).join('\n'),
    specsText: JSON.stringify(product.specifications || {}, null, 2),
  };
}

export default function AdminCatalogManager({ products, subcategories, onProductsChange }) {
  const [query, setQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredProducts = useMemo(() => {
    const term = query.toLowerCase().trim();
    if (!term) return products;
    return products.filter(product => {
      const searchable = [
        product.rewrittenTitle,
        product.originalTitle,
        product.subcategory,
        product.parentCategory,
        product.price,
      ].join(' ').toLowerCase();
      return searchable.includes(term);
    });
  }, [products, query]);

  const startEdit = (product) => {
    setError('');
    setSuccess('');
    setEditingProduct(product);
    setEditForm(productToEdit(product));
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditForm(emptyEdit);
    setError('');
  };

  const updateField = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const buildPayload = () => {
    let specifications = {};
    try {
      specifications = editForm.specsText.trim() ? JSON.parse(editForm.specsText) : {};
    } catch (err) {
      throw new Error('Specifications must be valid JSON.');
    }

    return {
      rewrittenTitle: editForm.rewrittenTitle.trim(),
      price: Number(editForm.price),
      originalPrice: editForm.originalPrice,
      specialOfferPrice: Number(editForm.specialOfferPrice),
      subcategory: editForm.subcategory,
      parentCategory: editForm.parentCategory,
      sellingDescription: editForm.sellingDescription,
      description: editForm.description,
      images: editForm.imagesText.split('\n').map(url => url.trim()).filter(Boolean),
      specifications,
    };
  };

  const saveEdit = async () => {
    if (!editingProduct) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = buildPayload();
      if (!payload.rewrittenTitle) throw new Error('Product title is required.');
      if (!Number.isFinite(payload.price) || payload.price < 0) throw new Error('Price must be a valid number.');

      const res = await fetch(`${API_URL}/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product.');

      setSuccess('Catalog product updated.');
      setEditingProduct(data.product);
      setEditForm(productToEdit(data.product));
      if (onProductsChange) await onProductsChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    const confirmed = window.confirm(`Delete "${product.rewrittenTitle}" from the catalog?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/products/${product.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product.');
      if (editingProduct?.id === product.id) cancelEdit();
      setSuccess('Product deleted from catalog.');
      if (onProductsChange) await onProductsChange();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand-pink" />
              Catalog Manager
            </h2>
            <p className="text-xs text-slate-400">{filteredProducts.length} of {products.length} listings</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs"
            />
          </div>
        </div>

        {(error || success) && (
          <div className={`rounded-xl p-3 text-xs border ${error ? 'bg-red-950/30 text-red-300 border-red-500/20' : 'bg-emerald-950/30 text-emerald-300 border-emerald-500/20'}`}>
            {error || success}
          </div>
        )}

        <div className="space-y-3">
          {filteredProducts.map(product => (
            <div key={product.id} className="glass-panel rounded-2xl border border-white/5 p-4 flex flex-col gap-4 md:flex-row md:items-center">
              <img
                src={product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'}
                alt={product.rewrittenTitle}
                className="w-full h-36 md:w-24 md:h-24 object-cover rounded-xl border border-white/5 bg-dark-900"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-brand-pink/10 text-brand-pink border border-brand-pink/20 font-bold">
                    {product.subcategory || 'Uncategorized'}
                  </span>
                  <span className="text-[10px] text-slate-500">{product.id}</span>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{product.rewrittenTitle}</h3>
                <div className="flex items-center gap-2 text-sm text-white font-bold">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  {Number(product.price || 0).toLocaleString('en-IN')}
                  {product.specialOfferPrice > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      Offer: ₹{Number(product.specialOfferPrice).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex md:flex-col gap-2 shrink-0">
                {product.originalUrl && (
                  <a
                    href={product.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20 border border-brand-pink/20 text-xs font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Source
                  </a>
                )}
                <button
                  onClick={() => startEdit(product)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-dark-800 text-slate-200 hover:text-white border border-white/5 text-xs font-bold"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => deleteProduct(product)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-950/30 text-red-300 hover:text-red-200 border border-red-500/20 text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="glass-panel rounded-2xl border border-white/5 p-5 h-fit xl:sticky xl:top-28">
        {editingProduct ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-white">Edit Listing</h3>
              <button onClick={cancelEdit} className="p-2 rounded-lg bg-dark-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400 font-bold">Title</span>
              <input value={editForm.rewrittenTitle} onChange={(e) => updateField('rewrittenTitle', e.target.value)} className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white" />
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 font-bold">Selling Price</span>
                <input type="number" value={editForm.price} onChange={(e) => updateField('price', e.target.value)} className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 font-bold">MRP / Original</span>
                <input value={editForm.originalPrice} onChange={(e) => updateField('originalPrice', e.target.value)} className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-amber-400 font-bold">Special Offer ₹</span>
                <input type="number" value={editForm.specialOfferPrice} onChange={(e) => updateField('specialOfferPrice', e.target.value)} className="w-full glass-input rounded-xl px-3 py-2 text-sm text-amber-300 border-amber-500/20" />
                <span className="text-[9px] text-slate-500">Set 0 to disable</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 font-bold">Subcategory</span>
                <select value={editForm.subcategory} onChange={(e) => updateField('subcategory', e.target.value)} className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white">
                  {subcategories.map(cat => <option key={cat} value={cat} className="bg-dark-900">{cat}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400 font-bold">Parent</span>
                <input value={editForm.parentCategory} onChange={(e) => updateField('parentCategory', e.target.value)} className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white" />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400 font-bold">Selling Description</span>
              <textarea value={editForm.sellingDescription} onChange={(e) => updateField('sellingDescription', e.target.value)} rows={3} className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white resize-none" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400 font-bold">Original Description</span>
              <textarea value={editForm.description} onChange={(e) => updateField('description', e.target.value)} rows={3} className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white resize-none" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400 font-bold flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Images</span>
              <textarea value={editForm.imagesText} onChange={(e) => updateField('imagesText', e.target.value)} rows={4} className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white resize-none" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400 font-bold">Specifications JSON</span>
              <textarea value={editForm.specsText} onChange={(e) => updateField('specsText', e.target.value)} rows={5} className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono resize-none" />
            </label>

            <button
              onClick={saveEdit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <Edit3 className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Select a product</h3>
            <p className="text-xs text-slate-500">Edit price, copy, category, images, and specification data.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
