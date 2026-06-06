import React, { useState } from 'react';
import CustomerForm from './CustomerForm';
import { ArrowLeft, ShoppingBag, IndianRupee, CheckCircle, Tag } from 'lucide-react';
import API_URL from '../api';

/**
 * Checkout page: receives an array of cart items, collects shipping details,
 * submits to backend, saves order to localStorage for guest order history.
 */
export default function Checkout({ cart, onCancel, onOrderSuccess, onRemoveItem }) {
  const [submitting, setSubmitting] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleSubmit = async (customerDetails) => {
    setSubmitting(true);
    try {
      const items = cart.map(item => ({
        productId: item.id,
        title: item.title,
        price: item.price,
        qty: item.qty,
        image: item.image,
        subcategory: item.subcategory,
      }));

      const res = await fetch(`${API_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, customerDetails }),
      });

      if (res.ok) {
        const data = await res.json();

        // Save order to localStorage for guest history
        const existing = JSON.parse(localStorage.getItem('guestOrders') || '[]');
        const guestOrder = {
          id: data.orderId || data.order?.id || `ord_local_${Date.now()}`,
          items,
          customer: customerDetails,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem('guestOrders', JSON.stringify([...existing, guestOrder]));

        onOrderSuccess(data);
      } else {
        const err = await res.json();
        alert('Failed to place order: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('Network error while placing order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Customer Form */}
        <div className="lg:col-span-3">
          <CustomerForm
            onSubmit={handleSubmit}
            submitLabel={submitting ? 'Placing Order...' : 'Place Order'}
            disabled={submitting}
          />
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-5 sticky top-24">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-pink" />
              Order Summary
            </h2>

            {/* Items list */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 items-start group relative">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-dark-900">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white line-clamp-2 leading-tight pr-4">{item.title}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-brand-pink/10 text-brand-pink rounded-full border border-brand-pink/20 mt-0.5">
                      <Tag className="w-2 h-2" />{item.subcategory}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Qty: {item.qty}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-baseline gap-0.5">
                      <IndianRupee className="w-3 h-3 text-emerald-400" />
                      <span className="text-sm font-black text-emerald-400">{(item.price * item.qty).toLocaleString('en-IN')}</span>
                    </div>
                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 underline underline-offset-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span className="text-emerald-400 font-bold">FREE</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
              <span className="font-black text-white">Total</span>
              <div className="flex items-baseline gap-1">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <span className="text-2xl font-black text-emerald-400">{subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-[10px] text-emerald-300">Your order is protected & 100% secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
