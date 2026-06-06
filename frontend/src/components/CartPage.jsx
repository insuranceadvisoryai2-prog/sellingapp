import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, IndianRupee } from 'lucide-react';

export default function CartPage({ cart, onUpdateQty, onRemoveItem, onCheckout, onContinueShopping }) {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-fade-in-up">
        <div className="w-24 h-24 rounded-full bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center">
          <ShoppingCart className="w-12 h-12 text-brand-pink/60" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white font-sans">Your cart is empty</h2>
          <p className="text-slate-400 text-sm">Add some amazing products to get started!</p>
        </div>
        <button
          onClick={onContinueShopping}
          className="px-8 py-4 bg-gradient-to-r from-brand-violet to-brand-pink hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-violet/20 flex items-center gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white font-sans flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-brand-pink" />
            My Cart
          </h1>
          <p className="text-xs text-slate-400 mt-1">{totalItems} item{totalItems !== 1 ? 's' : ''} in your cart</p>
        </div>
        <button
          onClick={onContinueShopping}
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          ← Continue Shopping
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item, idx) => (
            <div
              key={item.id}
              className="glass-panel rounded-2xl border border-white/5 p-4 flex gap-4 items-start animate-fade-in-up hover:border-white/10 transition-all"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Product Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-dark-900">
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">{item.title}</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-brand-pink/10 text-brand-pink rounded-full border border-brand-pink/20">
                  <Tag className="w-2.5 h-2.5" />
                  {item.subcategory || 'General'}
                </span>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-base font-black text-emerald-400">{(item.price * item.qty).toLocaleString('en-IN')}</span>
                    {item.qty > 1 && (
                      <span className="text-[10px] text-slate-500">(₹{item.price.toLocaleString('en-IN')} each)</span>
                    )}
                  </div>
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQty(item.id, item.qty - 1)}
                      className="w-7 h-7 rounded-lg bg-dark-800 hover:bg-dark-700 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-105"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold text-white w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.id, item.qty + 1)}
                      className="w-7 h-7 rounded-lg bg-dark-800 hover:bg-dark-700 border border-white/10 flex items-center justify-center text-white transition-all hover:scale-105"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 transition-all hover:scale-105 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-5 sticky top-24">
            <h2 className="text-base font-black text-white">Order Summary</h2>

            <div className="space-y-3 text-sm">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-xs line-clamp-1 flex-1">{item.title} × {item.qty}</span>
                  <span className="text-white font-semibold shrink-0">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Subtotal</span>
                <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Shipping</span>
                <span className="text-emerald-400 font-bold">FREE</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
              <span className="font-black text-white text-sm">Total</span>
              <div className="text-right">
                <div className="flex items-baseline gap-1 justify-end">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  <span className="text-2xl font-black text-emerald-400">{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <span className="text-[10px] text-slate-500">Inclusive of all taxes</span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="w-full px-6 py-4 bg-gradient-to-r from-brand-violet to-brand-pink hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-violet/20 flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { icon: '🔒', label: 'Secure' },
                { icon: '🚚', label: 'Free Delivery' },
                { icon: '↩️', label: 'Easy Returns' },
              ].map(badge => (
                <div key={badge.label} className="text-center space-y-1">
                  <span className="text-lg">{badge.icon}</span>
                  <p className="text-[10px] text-slate-500 font-medium">{badge.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
