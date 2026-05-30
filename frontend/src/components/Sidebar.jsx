import React from 'react';
import { 
  Grid, Cpu, Smartphone, Laptop, Shirt, Sparkles, 
  Baby, Home, Smile, Dumbbell, Gamepad2, BookOpen, Car, Layers 
} from 'lucide-react';

const CATEGORY_ICONS = {
  'All': Grid,
  'Electronics': Cpu,
  'Mobile Phones': Smartphone,
  'Laptops': Laptop,
  'Fashion - Men': Shirt,
  'Fashion - Women': Sparkles,
  'Kids': Baby,
  'Home & Kitchen': Home,
  'Beauty': Smile,
  'Sports': Dumbbell,
  'Toys': Gamepad2,
  'Books': BookOpen,
  'Automotive': Car
};

export default function Sidebar({ subcategories, activeCategory, setActiveCategory, productCounts }) {
  return (
    <aside className="w-80 shrink-0 hidden md:block">
      <div className="glass-panel rounded-2xl p-6 sticky top-24 border border-white/5 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-brand-pink" />
            <h2 className="text-lg font-bold font-sans tracking-wide text-white">Categories</h2>
          </div>
          <p className="text-xs text-slate-400">Filter your republished catalog</p>
        </div>

        <nav className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {/* All products button */}
          <button
            onClick={() => setActiveCategory('All')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeCategory === 'All'
                ? 'bg-gradient-to-r from-brand-violet to-brand-pink text-white shadow-lg shadow-brand-pink/10 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Grid className="w-4 h-4" />
              <span>All Products</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeCategory === 'All' ? 'bg-white/20 text-white' : 'bg-dark-700 text-slate-400'
            }`}>
              {productCounts.All || 0}
            </span>
          </button>

          <div className="h-px bg-white/5 my-2"></div>

          {/* Subcategories list */}
          {subcategories.map(cat => {
            const IconComponent = CATEGORY_ICONS[cat] || Layers;
            const count = productCounts[cat] || 0;
            const isActive = activeCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm border border-white/10 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-brand-pink' : 'text-slate-400'}`} />
                  <span>{cat}</span>
                </div>
                {count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-brand-pink text-white font-semibold' : 'bg-dark-800 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
