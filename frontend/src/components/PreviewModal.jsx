import React, { useState } from 'react';
import { X, ExternalLink, IndianRupee, Tag, Info, ListFilter, ShoppingCart, Share2, Plus, Check } from 'lucide-react';

export default function PreviewModal({ product, isAdmin, onClose, onBuy, onAddToCart }) {
  if (!product) return null;

  const [activeImage, setActiveImage] = useState(
    product.images && product.images[0] 
      ? product.images[0] 
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = () => {
    if (onAddToCart) onAddToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
  };

  const handleShare = async () => {
    const shareData = {
      title: product.rewrittenTitle,
      text: `Check out ${product.rewrittenTitle} at our store!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-scale-in">
      {/* Modal Card wrapper */}
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col relative bg-dark-900/90 animate-scale-in">
        
        {/* Top Right Actions */}
        <div className="absolute right-6 top-6 z-10 flex gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-dark-800 hover:bg-brand-pink text-slate-400 hover:text-white border border-white/5 transition-all"
            title="Share Product"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white border border-white/5 transition-all"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Main Modal body Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left: Images Column */}
            <div className="space-y-4">
              <div 
                className="aspect-square bg-dark-950 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center cursor-zoom-in relative group"
                onClick={() => setIsZoomed(true)}
              >
                <img
                  src={activeImage}
                  alt={product.rewrittenTitle}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                  <span className="opacity-0 group-hover:opacity-100 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm transition-opacity">Click to zoom</span>
                </div>
              </div>

              {/* Gallery thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-2">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(img)}
                      className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImage === img ? 'border-brand-pink scale-95' : 'border-white/5 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`thumbnail-${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info Details Column */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Category Pill */}
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-brand-pink/15 text-brand-pink rounded-full border border-brand-pink/20">
                    <Tag className="w-3 h-3" />
                    {product.subcategory}
                  </span>
                  {product.parentCategory && (
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {product.parentCategory}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <h1 className="text-xl md:text-2xl font-black font-sans leading-tight text-white">
                    {product.rewrittenTitle}
                  </h1>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline text-white gap-2 flex-wrap">
                  <IndianRupee className="w-5 h-5 text-emerald-400 self-center shrink-0" />
                  {product.specialOfferPrice > 0 ? (
                    <>
                      <span className="text-2xl font-black tracking-tight text-amber-400">
                        {product.specialOfferPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-sm text-slate-500 line-through">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-bold">
                        Special Offer
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black tracking-tight text-emerald-400">
                        {product.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 line-through">
                        {product.originalPrice}
                      </span>
                    </>
                  )}
                </div>

                <div className="h-px bg-white/5 my-4"></div>

                {/* Copywriter Descriptions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-brand-pink" /> Why You'll Love This
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed bg-brand-pink/5 p-4 rounded-xl border border-brand-pink/10">
                    {product.sellingDescription || 'No rewritten pitch generated.'}
                  </p>
                </div>

                {/* Original Details */}
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Original Description</h4>
                  <div className="max-h-36 overflow-y-auto bg-dark-950/40 p-3 rounded-lg text-xs text-slate-400 whitespace-pre-line leading-normal">
                    {product.description || 'No original description available.'}
                  </div>
                </div>

                {/* Admin Only: Source Link */}
                {isAdmin && product.originalUrl && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-brand-pink/20">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-pink flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3" /> Admin Only: Supplier Source
                    </h4>
                    <a
                      href={product.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-300 hover:text-brand-pink underline break-all"
                    >
                      View Original Product on Supplier Website
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/5 flex gap-3 flex-col sm:flex-row">
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 font-bold text-sm rounded-xl transition-all border ${
                    addedToCart
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-dark-800 hover:bg-dark-700 text-white border-white/10'
                  }`}
                >
                  {addedToCart ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{addedToCart ? 'Added to Cart!' : 'Add to Cart'}</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (onBuy) onBuy(product);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-brand-violet to-brand-pink hover:opacity-90 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-brand-violet/10"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Buy Now</span>
                </button>
              </div>

            </div>

          </div>

          {/* Specifications Panel */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ListFilter className="w-3.5 h-3.5 text-brand-pink" /> Specifications Matrix
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(product.specifications).map(([key, val]) => (
                  <div key={key} className="bg-dark-950/50 p-3.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">{key}</span>
                    <span className="text-xs text-slate-200 font-medium leading-tight">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Full-screen Image Zoom Overlay */}
      {isZoomed && (
        <div className="fixed inset-0 z-[60] bg-dark-950/95 flex items-center justify-center backdrop-blur-xl animate-scale-in" onClick={() => setIsZoomed(false)}>
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-dark-800 hover:bg-dark-700 text-white border border-white/10 transition-all z-[70]"
            title="Close Zoom"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeImage}
            alt={product.rewrittenTitle}
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl cursor-zoom-out"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
