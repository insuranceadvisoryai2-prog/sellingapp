import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, LogOut, LayoutDashboard, Package } from 'lucide-react';
import PreviewModal from './components/PreviewModal';
import Checkout from './components/Checkout';
import CartPage from './components/CartPage';
import GuestOrders from './components/GuestOrders';
import LandingPage from './components/LandingPage';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import OrderSuccessPopup from './components/OrderSuccessPopup';
import API_URL from './api';

// Generate or retrieve guest ID
function getGuestId() {
  let id = localStorage.getItem('guestId');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('guestId', id);
  }
  return id;
}

export default function App() {
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
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Cart state — persisted to localStorage
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });

  // Sync cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Ensure guest ID is set
  useEffect(() => { getGuestId(); }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id: product.id,
        title: product.rewrittenTitle || product.originalTitle,
        price: product.price,
        image: product.images?.[0] || '',
        subcategory: product.subcategory,
        qty: 1,
      }];
    });
  };

  const updateCartQty = (productId, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.id !== productId));
    } else {
      setCart(prev => prev.map(i => i.id === productId ? { ...i, qty: newQty } : i));
    }
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.id !== productId));
  };

  const handleOrderSuccess = (data) => {
    setCart([]);
    localStorage.removeItem('cart');
    setOrderSuccess(data);
    setActiveTab('landing');
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
          if (prod.subcategory) counts[prod.subcategory] = (counts[prod.subcategory] || 0) + 1;
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
      if (res.ok) setSubcategories(await res.json());
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  useEffect(() => {
    fetchSubcategories();
    fetchProducts();
  }, []);

  const handleAdminLogin = () => { setIsAdmin(true); setActiveTab('admin'); };
  const handleLogout = () => { setIsAdmin(false); setActiveTab('landing'); };

  const renderMain = () => {
    if (activeTab === 'checkout') {
      return (
        <Checkout
          cart={cart}
          onCancel={() => setActiveTab('cart')}
          onOrderSuccess={handleOrderSuccess}
          onRemoveItem={(id) => {
            setCart(prev => {
              const nextCart = prev.filter(i => i.id !== id);
              if (nextCart.length === 0) {
                setActiveTab('cart');
              }
              return nextCart;
            });
          }}
        />
      );
    }
    if (activeTab === 'cart') {
      return (
        <CartPage
          cart={cart}
          onUpdateQty={updateCartQty}
          onRemoveItem={removeFromCart}
          onCheckout={() => setActiveTab('checkout')}
          onContinueShopping={() => setActiveTab('landing')}
        />
      );
    }
    if (activeTab === 'orders') {
      return <GuestOrders onContinueShopping={() => setActiveTab('landing')} />;
    }
    if (activeTab === 'login') {
      return <AdminLogin onLoginSuccess={handleAdminLogin} />;
    }
    if (activeTab === 'admin' && isAdmin) {
      return (
        <AdminPanel
          products={products}
          subcategories={subcategories}
          onProductsChange={fetchProducts}
        />
      );
    }
    return (
      <LandingPage
        products={products}
        subcategories={subcategories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onViewDetails={setSelectedProduct}
        onBuy={(product) => {
          addToCart(product);
          setActiveTab('checkout');
        }}
        onAddToCart={addToCart}
        onNavigateToDashboard={() => setActiveTab('login')}
      />
    );
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
            <div className="h-12 flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="WholesaleMart Logo" className="h-full object-contain" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* My Orders (guest) */}
            {!isAdmin && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'orders'
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">My Orders</span>
                </span>
              </button>
            )}

            {/* Cart Icon */}
            {!isAdmin && (
              <button
                onClick={() => setActiveTab('cart')}
                className={`relative px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'cart'
                    ? 'bg-brand-pink/20 text-brand-pink border border-brand-pink/30'
                    : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Cart</span>
                </span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-pink text-white text-[10px] font-black flex items-center justify-center shadow-md animate-bounce-in">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
            )}

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
                  Admin
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderMain()}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-dark-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} WholesaleMart India. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-600">
            <span>Best Deals</span>
            <span>•</span>
            <span>Trusted Sellers</span>
            <span>•</span>
            <span>Fast Delivery</span>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <PreviewModal
          product={selectedProduct}
          isAdmin={isAdmin}
          onClose={() => setSelectedProduct(null)}
          onBuy={(product) => {
            addToCart(product);
            setSelectedProduct(null);
            setActiveTab('checkout');
          }}
          onAddToCart={(product) => {
            addToCart(product);
          }}
        />
      )}

      {/* Order Success Popup */}
      {orderSuccess && (
        <OrderSuccessPopup
          orderData={orderSuccess}
          onClose={() => setOrderSuccess(null)}
        />
      )}
    </div>
  );
}
