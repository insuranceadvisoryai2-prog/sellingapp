import React, { useState } from 'react';
import { Package, ChevronDown, ChevronUp, Calendar, IndianRupee, MapPin, Phone, Mail, Hash, ShoppingBag, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react';

function formatDate(isoStr) {
  if (!isoStr) return 'N/A';
  return new Date(isoStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const statusConfig = {
  Pending:   { icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  Confirmed: { icon: CheckCircle2,  color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  Packed:    { icon: Package,       color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  Shipped:   { icon: Truck,         color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  Delivered: { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Cancelled: { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[order.status] || statusConfig.Pending;
  const Icon = cfg.icon;
  const items = order.items || [];
  const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
  const firstItem = items[0] || {};

  return (
    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all animate-fade-in-up">
      {/* Card header */}
      <div className="flex items-start gap-4 p-5">
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-dark-900">
          <img
            src={firstItem.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
            alt={firstItem.title || 'Product'}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <Hash className="w-2.5 h-2.5" />{order.id}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />{formatDate(order.createdAt)}
            </span>
          </div>
          <p className="text-sm font-bold text-white line-clamp-1">
            {firstItem.title}
            {items.length > 1 && <span className="ml-2 text-[10px] text-brand-pink font-bold">+ {items.length - 1} more</span>}
          </p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              <Icon className="w-3 h-3" />
              {order.status}
            </span>
            <div className="flex items-baseline gap-0.5">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-black text-emerald-400">{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expand Toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-white font-bold py-2 bg-dark-800/50 border-t border-white/5 transition-all"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Show less' : 'View details'}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 pt-3 space-y-4 border-t border-white/5 animate-fade-in-up">
          {/* All items */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Items Ordered</h4>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-dark-950/40 rounded-xl p-3 border border-white/5">
                <img src={item.image || ''} alt={item.title} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white line-clamp-1">{item.title}</p>
                  <p className="text-[10px] text-slate-400">Qty: {item.qty} × ₹{item.price?.toLocaleString('en-IN')}</p>
                </div>
                <span className="text-sm font-black text-emerald-400">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          {/* Delivery Address */}
          {order.customer && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery To</h4>
              <div className="bg-dark-950/40 rounded-xl p-3 border border-white/5 text-xs space-y-1.5">
                <p className="text-white font-bold flex items-center gap-2"><Mail className="w-3 h-3 text-slate-500" /> {order.customer.name}</p>
                <p className="text-slate-400 flex items-center gap-2"><Phone className="w-3 h-3 text-slate-500" /> {order.customer.phone}</p>
                <p className="text-slate-400 flex items-center gap-2"><MapPin className="w-3 h-3 text-slate-500" /> {order.customer.addressLine1}, {order.customer.city} – {order.customer.postalCode}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GuestOrders({ onContinueShopping }) {
  const orders = JSON.parse(localStorage.getItem('guestOrders') || '[]');

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-fade-in-up">
        <div className="w-24 h-24 rounded-full bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center">
          <Package className="w-12 h-12 text-brand-violet/60" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white font-sans">No Orders Yet</h2>
          <p className="text-slate-400 text-sm">You haven't placed any orders. Start shopping!</p>
        </div>
        <button
          onClick={onContinueShopping}
          className="px-8 py-4 bg-gradient-to-r from-brand-violet to-brand-pink hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          Shop Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white font-sans flex items-center gap-3">
            <Package className="w-7 h-7 text-brand-pink" />
            My Orders
          </h1>
          <p className="text-xs text-slate-400 mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
        </div>
        <button
          onClick={onContinueShopping}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Shop
        </button>
      </div>

      <div className="space-y-4">
        {[...orders].reverse().map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
