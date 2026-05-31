import React, { useState, useEffect } from 'react';
import { Sparkles, Terminal, User, LogOut, LayoutDashboard } from 'lucide-react';
import PreviewModal from './components/PreviewModal';
import Checkout from './components/Checkout';
import LandingPage from './components/LandingPage';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import API_URL from './api';

export default function App() {
  // Navigation states: 'landing', 'login', 'admin'
  const [activeTab, setActiveTab] = useState('landing');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [subcategories, setSubcategories] = useState([
    'Electronics', 'Mobile Phones', 'Laptops',
    'Fashion - Men', 'Fashion - Women', 'Kids',
    'Home & Kitchen', 'Beauty', 'Sports',
    'Toys', 'Books', 'Automotive'
  ]);
  const [productCounts, setProductCounts] = useState({ All: 0 });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const handleBuy = (product) => {
    setCheckoutProduct(product);
    setShowCheckout(true);
  };

  const handleOrderSuccess = (data) => {
    alert('Order placed successfully! Order ID: ' + (data.orderId || 'N/A'));
    setShowCheckout(false);
    setCheckoutProduct(null);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        const counts = { All: data.length };
        data.forEach(prod => {
          if (prod.subcategory) {
            counts[prod.subcategory] = (counts[prod.subcategory] || 0) + 1;
          }
        });
        setProductCounts(counts);
      }
    } catch (error) {
      console.error('Error loading published products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subcategories`);
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  useEffect(() => {
    fetchSubcategories();
    fetchProducts();
  }, []);

  const handleAdminLogin = () => {
    setIsAdmin(true);
    setActiveTab('admin');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setActiveTab('landing');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-dark-950">

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-dark-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('landing')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-pink flex items-center justify-center shadow-lg shadow-brand-pink/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-white font-sans flex items-center gap-1.5 leading-none">
                MeshSync <span className="text-[10px] text-brand-pink uppercase tracking-widest font-black">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Premium Store</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin ? (
              <>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    activeTab === 'admin'
                      ? 'bg-brand-pink/20 text-brand-pink border border-brand-pink/30'
                      : 'bg-dark-800 text-slate-300 hover:text-white border border-white/5'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Admin Dashboard
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all bg-dark-800 text-slate-400 hover:text-red-400 border border-white/5"
                >
                  <span className="flex items-center gap-1.5">
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'login'
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Sign In / Admin
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCheckout && checkoutProduct ? (
          <Checkout
            product={checkoutProduct}
            onCancel={() => { setShowCheckout(false); setCheckoutProduct(null); }}
            onOrderSuccess={handleOrderSuccess}
          />
        ) : activeTab === 'login' ? (
          <AdminLogin onLoginSuccess={handleAdminLogin} />
        ) : activeTab === 'admin' && isAdmin ? (
          <AdminPanel
            products={products}
            subcategories={subcategories}
            onProductsChange={fetchProducts}
          />
        ) : (
          /* Landing Page / Catalog View */
          <LandingPage 
            products={products}
            subcategories={subcategories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            onViewDetails={setSelectedProduct}
            onBuy={handleBuy}
            onNavigateToDashboard={() => setActiveTab('login')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-dark-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} MeshSync Premium Store. All rights reserved.</p>
          <div className="flex items-center gap-1 text-slate-600">
            <Terminal className="w-3.5 h-3.5" />
            <span>Developer Mode Enabled</span>
          </div>
        </div>
      </footer>

      {/* Detailed Modal Overlay */}
      {selectedProduct && (
        <PreviewModal
          product={selectedProduct}
          isAdmin={isAdmin}
          onClose={() => setSelectedProduct(null)}
          onBuy={handleBuy}
        />
      )}
    </div>
  );
}


