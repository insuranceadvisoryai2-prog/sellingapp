import React, { useEffect, useState } from 'react';
import { CheckCircle2, X, ShoppingBag, PartyPopper } from 'lucide-react';

const CONFETTI_COLORS = ['#FF3E6C', '#8B5CF6', '#06B6D4', '#F59E0B', '#10B981', '#EC4899', '#6366F1'];

function ConfettiParticle({ index }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.8;
  const duration = 1.8 + Math.random() * 1.5;
  const size = 6 + Math.random() * 8;
  const rotation = Math.random() * 360;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: '-10px',
        width: `${size}px`,
        height: `${size * 0.6}px`,
        backgroundColor: color,
        borderRadius: '2px',
        transform: `rotate(${rotation}deg)`,
        animation: `confettiFall ${duration}s ease-in ${delay}s both`,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function OrderSuccessPopup({ orderData, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const orderId = orderData?.orderId || orderData?.order?.id || 'N/A';

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'bg-dark-950/80 backdrop-blur-md' : 'bg-transparent'}`}>
      {/* Confetti Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      {/* Popup Card */}
      <div className={`relative glass-panel rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl max-w-md w-full text-center space-y-6 transition-all duration-500 ${visible ? 'animate-bounce-in' : 'opacity-0 scale-50'}`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white border border-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Success Icon */}
        <div className="relative mx-auto w-24 h-24">
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse-ring" style={{ animationDelay: '0.3s' }} />
          
          {/* Main circle */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce-in">
            <svg viewBox="0 0 52 52" className="w-12 h-12">
              <path
                className="animate-draw-check"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l7.8 7.8L38 17"
              />
            </svg>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2 animate-fade-in-up-delay-2">
          <div className="flex items-center justify-center gap-2">
            <PartyPopper className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-black text-white font-sans">Order Placed!</h2>
            <PartyPopper className="w-5 h-5 text-amber-400" style={{ transform: 'scaleX(-1)' }} />
          </div>
          <p className="text-sm text-slate-300">
            Your order has been successfully placed. We'll get it to you soon!
          </p>
        </div>

        {/* Order ID */}
        <div className="animate-fade-in-up-delay-3 bg-dark-950/50 rounded-2xl p-4 border border-white/5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Order ID</span>
          <span className="text-lg font-bold text-brand-pink font-mono">{orderId}</span>
        </div>

        {/* CTA Button */}
        <button
          onClick={onClose}
          className="w-full px-6 py-4 bg-gradient-to-r from-brand-violet to-brand-pink hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-violet/20 flex items-center justify-center gap-2 animate-fade-in-up-delay-3"
        >
          <ShoppingBag className="w-5 h-5" />
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
