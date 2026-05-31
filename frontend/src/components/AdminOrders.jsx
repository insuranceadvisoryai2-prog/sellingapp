import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, RefreshCw, Search, Truck, User,
  IndianRupee, Package, Calendar, Mail, Phone, MapPin,
  ChevronDown, ChevronUp, Hash, ExternalLink
} from 'lucide-react';
import API_URL from '../api';
const orderStatuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const paymentStatuses = ['Unpaid', 'Paid', 'Refunded'];

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusColor(status) {
  const map = {
    Pending: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20', dot: 'bg-amber-400' },
    Confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20', dot: 'bg-blue-400' },
    Packed: { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20', dot: 'bg-violet-400' },
    Shipped: { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
    Delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    Cancelled: { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/20', dot: 'bg-red-400' },
  };
  return map[status] || map.Pending;
}

function paymentColor(status) {
  if (status === 'Paid') return 'text-emerald-400';
  if (status === 'Refunded') return 'text-amber-400';
  return 'text-red-400';
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('${API_URL}/api/orders');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load orders.');
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = useMemo(() => {
    const term = query.toLowerCase().trim();
    return orders.filter(order => {
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      const searchable = [
        order.id, order.status, order.paymentStatus,
        order.customer?.name, order.customer?.email, order.customer?.phone,
        order.customer?.city, order.productSnapshot?.title,
      ].join(' ').toLowerCase();
      return matchesStatus && (!term || searchable.includes(term));
    });
  }, [orders, query, statusFilter]);

  const counts = useMemo(() => {
    return orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      acc.All += 1;
      return acc;
    }, { All: 0 });
  }, [orders]);

  const updateOrder = async (order, updates) => {
    setSavingId(order.id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update order.');
      setOrders(prev => prev.map(item => item.id === order.id ? data.order : item));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map(status => {
          const colors = status === 'All'
            ? { bg: 'bg-brand-pink/10', border: 'border-brand-pink/20', dot: 'bg-brand-pink' }
            : statusColor(status);
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-left rounded-2xl p-4 border transition-all ${
                statusFilter === status
                  ? `${colors.bg} ${colors.border} ring-1 ring-white/10`
                  : 'glass-panel border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${colors.dot || 'bg-brand-pink'}`}></span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{status}</span>
              </div>
              <span className="block text-2xl font-black text-white">{counts[status] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Header & Search ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-pink" />
            Order Management
          </h2>
          <p className="text-xs text-slate-400">{filteredOrders.length} orders visible</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, order ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs"
            />
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 text-slate-200 hover:text-white border border-white/5 text-xs font-bold disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-xs border bg-red-950/30 text-red-300 border-red-500/20">
          {error}
        </div>
      )}

      {/* ─── Orders Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map(order => {
          const product = order.productSnapshot || {};
          const customer = order.customer || {};
          const colors = statusColor(order.status || 'Pending');
          const isExpanded = expandedId === order.id;

          return (
            <div
              key={order.id}
              className="glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col hover:border-white/10 transition-all"
            >
              {/* Card Header: Product Image + Status */}
              <div className="relative">
                <img
                  src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'}
                  alt={product.title || 'Product'}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${colors.bg} ${colors.text} ${colors.border}`}>
                    {order.status || 'Pending'}
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold bg-dark-900/80 backdrop-blur-sm border-white/10 ${paymentColor(order.paymentStatus)}`}>
                    {order.paymentStatus || 'Unpaid'}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 flex flex-col gap-1 items-end">
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-dark-900/80 backdrop-blur-sm text-emerald-400 font-black border border-white/10 flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {Number(product.price || 0).toLocaleString('en-IN')}
                  </span>
                  {product.specialOfferPrice > 0 && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-900/80 backdrop-blur-sm text-amber-300 font-black border border-amber-500/20 flex items-center gap-1">
                      Offer: ₹{Number(product.specialOfferPrice).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                {/* Order ID & Date */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Hash className="w-3 h-3" />{order.id}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{formatDate(order.createdAt)}
                  </span>
                </div>

                {/* Product Title */}
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                  {product.title || 'Product details unavailable'}
                </h3>

                {/* Customer Quick Info */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                    <span className="font-semibold text-white truncate">{customer.name || 'No name'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{customer.email || 'No email'}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-white font-bold py-1.5 rounded-lg bg-dark-800/50 border border-white/5 transition-all"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {isExpanded ? 'Less details' : 'Full details'}
                </button>

                {/* Expanded: Shipping & Notes */}
                {isExpanded && (
                  <div className="space-y-3 pt-2 border-t border-white/5 animate-fade-in">
                    {/* Price Breakdown */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <IndianRupee className="w-3 h-3 text-emerald-400" /> Price Details
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-dark-950/40 p-2.5 rounded-xl border border-white/5 text-center">
                          <span className="text-[9px] text-slate-500 font-bold block mb-1">SELLING</span>
                          <span className="text-sm text-emerald-400 font-bold">₹{Number(product.price || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-dark-950/40 p-2.5 rounded-xl border border-white/5 text-center">
                          <span className="text-[9px] text-slate-500 font-bold block mb-1">MRP</span>
                          <span className="text-sm text-slate-300 font-bold">{product.originalPrice || 'N/A'}</span>
                        </div>
                        <div className={`p-2.5 rounded-xl border text-center ${product.specialOfferPrice > 0 ? 'bg-amber-950/20 border-amber-500/20' : 'bg-dark-950/40 border-white/5'}`}>
                          <span className="text-[9px] text-slate-500 font-bold block mb-1">OFFER</span>
                          <span className={`text-sm font-bold ${product.specialOfferPrice > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                            {product.specialOfferPrice > 0 ? `₹${Number(product.specialOfferPrice).toLocaleString('en-IN')}` : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-brand-pink" /> Shipping Address
                      </h4>
                      <div className="text-xs text-slate-300 bg-dark-950/40 p-3 rounded-xl border border-white/5 space-y-0.5">
                        <p>{customer.addressLine1 || 'No address provided'}</p>
                        {customer.addressLine2 && <p>{customer.addressLine2}</p>}
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {[customer.city, customer.state, customer.postalCode].filter(Boolean).join(', ') || 'N/A'}
                        </p>
                        {customer.country && <p>{customer.country}</p>}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin Notes</h4>
                      <textarea
                        value={order.notes || ''}
                        onChange={(e) => setOrders(prev => prev.map(item => item.id === order.id ? { ...item, notes: e.target.value } : item))}
                        onBlur={(e) => updateOrder(order, { notes: e.target.value })}
                        placeholder="Add notes about this order..."
                        rows={2}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white resize-none"
                      />
                    </div>
                    
                    {/* Source URL */}
                    {product.originalUrl && (
                      <div className="pt-2">
                        <a 
                          href={product.originalUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-lg bg-brand-pink/10 hover:bg-brand-pink/20 text-[10px] font-bold text-brand-pink border border-brand-pink/20 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Source Product
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Controls */}
                <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold">Order Status</span>
                    <select
                      value={order.status || 'Pending'}
                      onChange={(e) => updateOrder(order, { status: e.target.value })}
                      disabled={savingId === order.id}
                      className="w-full glass-input rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      {orderStatuses.map(s => <option key={s} value={s} className="bg-dark-900">{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold">Payment</span>
                    <select
                      value={order.paymentStatus || 'Unpaid'}
                      onChange={(e) => updateOrder(order, { paymentStatus: e.target.value })}
                      disabled={savingId === order.id}
                      className="w-full glass-input rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      {paymentStatuses.map(s => <option key={s} value={s} className="bg-dark-900">{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="glass-panel rounded-2xl border border-white/5 p-12 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white">No orders found</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
            {orders.length === 0
              ? 'Orders will appear here once customers complete checkout from your store.'
              : 'No orders match your current search or filter. Try adjusting your criteria.'}
          </p>
        </div>
      )}
    </div>
  );
}
