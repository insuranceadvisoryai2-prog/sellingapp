import React, { useState } from 'react';
import CustomerForm from './CustomerForm';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import API_URL from '../api';
/**
 * Checkout page displayed after clicking "Buy" on a product.
 * Shows a brief product summary and collects customer details.
 */
export default function Checkout({ product, onCancel, onOrderSuccess }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (customerDetails) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, customerDetails }),
      });
      if (res.ok) {
        const data = await res.json();
        onOrderSuccess(data);
      } else {
        const err = await res.text();
        alert('Failed to place order: ' + err);
      }
    } catch (e) {
      console.error(e);
      alert('Network error while placing order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-8 max-w-2xl mx-auto mt-12 border border-white/5">
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </button>

      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-brand-pink" />
        Checkout
      </h2>

      {/* Simple product preview */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/80'}
          alt={product.rewrittenTitle}
          className="w-20 h-20 object-cover rounded-lg border border-white/5"
        />
        <div>
          <p className="text-sm font-medium text-white line-clamp-1">
            {product.rewrittenTitle}
          </p>
          <p className="text-xs text-slate-400">{product.subcategory}</p>
          <p className="text-sm font-bold text-white">
            ₹{product.price.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Customer details form */}
      <CustomerForm
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />

      {submitting && (
        <p className="mt-4 text-slate-400">Submitting order…</p>
      )}
    </div>
  );
}
