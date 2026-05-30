import React from 'react';
import { ExternalLink, Tag, IndianRupee, ShoppingCart, Share2 } from 'lucide-react';

export default function ProductCard({ product, onViewDetails, onBuy }) {
  const mainImage = product.images && product.images[0]
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';

  const handleShare = async (e) => {
    e.stopPropagation();
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
    <div
      className="glass-panel rounded-2xl overflow-hidden glass-panel-hover flex flex-col h-full border border-white/5 cursor-pointer group"
      onClick={() => onViewDetails(product)}
    >
      {/* Product Image Panel */}
      <div className="relative aspect-square w-full bg-dark-900 overflow-hidden border-b border-white/5">
        <img
          src={mainImage}
          alt={product.rewrittenTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-dark-900/90 text-brand-pink rounded-full border border-white/10 backdrop-blur-md">
            <Tag className="w-3 h-3" />
            {product.subcategory}
          </span>
        </div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleShare}
            className="p-2 bg-dark-900/90 hover:bg-brand-pink text-white rounded-full border border-white/10 backdrop-blur-md transition-colors"
            title="Share Product"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Details Panel */}
      <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
        <div className="space-y-2">
          {/* Rewritten AI Title */}
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug font-sans group-hover:text-brand-pink transition-colors duration-200">
            {product.rewrittenTitle}
          </h3>
        </div>

          {/* Pricing & Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-baseline gap-2 text-white">
              <IndianRupee className="w-4 h-4 text-emerald-400 self-center shrink-0" />
              {product.specialOfferPrice > 0 ? (
                <>
                  <span className="text-lg font-extrabold tracking-tight text-amber-400">
                    {product.specialOfferPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 line-through">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                </>
              ) : (
                <span className="text-lg font-extrabold tracking-tight">
                  {product.price.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onBuy) onBuy(product);
                }}
                className="flex items-center gap-1 text-xs text-white bg-brand-pink hover:bg-brand-pink/90 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
