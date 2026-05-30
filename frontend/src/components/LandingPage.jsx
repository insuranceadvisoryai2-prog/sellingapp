import React, { useState, useEffect } from 'react';
import ProductGrid from './ProductGrid';
import { Sparkles, ShoppingBag } from 'lucide-react';

export default function LandingPage(props) {
  const latestProducts = [...props.products].reverse().slice(0, 5);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (latestProducts.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % latestProducts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [latestProducts.length]);

  return (
    <div className="flex flex-col gap-10">
      
      {/* Hero Banner Section (Inspired by mekog mockup but in our dark theme) */}
      <div className="relative w-full rounded-[2rem] overflow-hidden bg-gradient-to-br from-brand-violet to-dark-950 border border-white/10 shadow-2xl min-h-[400px] flex items-center">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-pink/20 to-transparent pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-pink/30 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-brand-violet/40 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Hero Content */}
        <div className="relative z-10 p-10 md:p-16 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-brand-pink" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Premium Selection</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 font-sans">
            Curated Products, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-violet">
              Unbeatable Prices.
            </span>
          </h1>
          
          <p className="text-sm md:text-base text-slate-300 mb-8 max-w-lg leading-relaxed">
            Discover our latest collection of premium curated items. AI-optimized descriptions, high-quality images, and the best deals imported directly for you.
          </p>
          
          <button
            onClick={() => {
              // Smooth scroll to the products grid
              document.getElementById('trending-products')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 bg-brand-pink hover:bg-brand-pink/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-pink/30 flex items-center gap-2 hover:scale-105"
          >
            <ShoppingBag className="w-5 h-5" />
            Shop Now
          </button>
        </div>

        {/* Hero Image Area (Right side) showcasing latest products */}
        <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 w-80 h-80 xl:w-96 xl:h-96 items-center justify-center pointer-events-none">
           {latestProducts.length > 0 ? (
             <div className="relative w-full h-full">
               {latestProducts.map((prod, index) => (
                 <div
                   key={prod.id || index}
                   className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                     index === currentSlideIndex 
                       ? 'opacity-100 scale-100 translate-y-0' 
                       : 'opacity-0 scale-95 translate-y-8'
                   }`}
                 >
                   <div className="w-full h-full rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_50px_-12px_rgba(236,72,153,0.3)] bg-dark-900 relative group">
                     <img 
                       src={prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'} 
                       alt={prod.rewrittenTitle}
                       className="w-full h-full object-cover"
                     />
                     <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-dark-950 via-dark-950/80 to-transparent p-6 pt-20">
                       <span className="px-2.5 py-1 bg-brand-pink/20 text-brand-pink text-[10px] font-bold uppercase tracking-wider rounded-full border border-brand-pink/20 mb-2 inline-block">Latest Arrival</span>
                       <h3 className="text-white font-bold text-lg line-clamp-1 leading-snug">{prod.rewrittenTitle}</h3>
                       <p className="text-emerald-400 font-black text-xl mt-1">₹{prod.price.toLocaleString('en-IN')}</p>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="w-full aspect-square rounded-full border border-white/5 bg-white/5 backdrop-blur-sm flex items-center justify-center p-8">
               <div className="w-full h-full rounded-full bg-gradient-to-tr from-brand-violet/20 to-brand-pink/20 animate-pulse-slow blur-xl"></div>
             </div>
           )}
        </div>
      </div>

      {/* Categories Horizontal Scroller (mimicking "Search Trending") */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider pl-2 flex items-center gap-2">
           <span className="w-2 h-6 bg-brand-pink rounded-full"></span>
           Search Trending
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
           <button
             onClick={() => props.setActiveCategory('All')}
             className={`shrink-0 snap-center px-6 py-4 rounded-2xl border transition-all flex flex-col items-center gap-2 min-w-[120px] ${
               props.activeCategory === 'All'
                 ? 'bg-brand-pink/10 border-brand-pink text-white shadow-lg shadow-brand-pink/10'
                 : 'bg-dark-900 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
             }`}
           >
             <span className="font-bold text-sm">All</span>
           </button>
           {props.subcategories.map(cat => (
             <button
               key={cat}
               onClick={() => props.setActiveCategory(cat)}
               className={`shrink-0 snap-center px-6 py-4 rounded-2xl border transition-all flex flex-col items-center gap-2 min-w-[120px] ${
                 props.activeCategory === cat
                   ? 'bg-brand-pink/10 border-brand-pink text-white shadow-lg shadow-brand-pink/10'
                   : 'bg-dark-900 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
               }`}
             >
               <span className="font-bold text-sm whitespace-nowrap">{cat}</span>
             </button>
           ))}
        </div>
      </div>

      {/* Main Product Grid */}
      <div id="trending-products" className="pt-4 scroll-mt-24">
        <ProductGrid {...props} />
      </div>

    </div>
  );
}
