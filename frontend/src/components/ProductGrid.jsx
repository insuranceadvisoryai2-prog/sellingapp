import React, { useState } from 'react';
import { Search, ShoppingBag, PlusCircle, AlertCircle } from 'lucide-react';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, subcategories, activeCategory, setActiveCategory, onNavigateToDashboard, onViewDetails, onBuy, onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Local filtering: search query + active subcategory category
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'All' || 
      (product.subcategory && product.subcategory.toLowerCase() === activeCategory.toLowerCase());
      
    const textSearch = `${product.rewrittenTitle} ${product.originalTitle} ${product.sellingDescription} ${Object.values(product.specifications).join(' ')}`.toLowerCase();
    const matchesSearch = textSearch.includes(searchQuery.toLowerCase().trim());
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 flex-grow">
      {/* Search and Header controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-pink" />
            Republished Catalog
          </h2>
          <p className="text-xs text-slate-400">
            {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} matching criteria
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by title or spec..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs"
          />
        </div>
      </div>

      {/* Subcategory Pills for Mobile view (hidden on MD/desktop where Sidebar handles it) */}
      <div className="flex md:hidden gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveCategory('All')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeCategory === 'All'
              ? 'bg-brand-pink text-white font-bold'
              : 'bg-dark-900 text-slate-400 border border-white/5'
          }`}
        >
          All
        </button>
        {subcategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeCategory === cat
                ? 'bg-brand-pink text-white font-bold'
                : 'bg-dark-900 text-slate-400 border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid Display */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onViewDetails={onViewDetails} 
              onBuy={onBuy}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/5 space-y-6 max-w-lg mx-auto mt-8 shadow-xl">
          <div className="w-16 h-16 bg-brand-pink/10 rounded-full flex items-center justify-center mx-auto border border-brand-pink/20">
            <AlertCircle className="w-8 h-8 text-brand-pink animate-pulse-slow" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white font-sans">No products in this catalog</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {products.length === 0 
                ? "You haven't scraped or published any products yet. Head back to the dashboard to paste a supplier URL and create your first listing!"
                : "No products matched your active filters or search query terms. Try clearing your search bar or selecting another category."}
            </p>
          </div>

          {products.length === 0 && (
            <button
              onClick={onNavigateToDashboard}
              className="px-6 py-3 bg-gradient-to-r from-brand-violet to-brand-pink hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-brand-violet/20 flex items-center gap-1.5 mx-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
