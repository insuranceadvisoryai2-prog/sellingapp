import React, { useState } from 'react';
import { Boxes, ClipboardList, PlusCircle } from 'lucide-react';
import Dashboard from './Dashboard';
import AdminCatalogManager from './AdminCatalogManager';
import AdminOrders from './AdminOrders';

const tabs = [
  { id: 'publish', label: 'Publish', icon: PlusCircle },
  { id: 'catalog', label: 'Catalog', icon: Boxes },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
];

export default function AdminPanel({ products, subcategories, onProductsChange }) {
  const [activeAdminTab, setActiveAdminTab] = useState('publish');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white font-sans tracking-tight">Admin Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Manage listings, publishing, and customer orders.</p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-2xl bg-dark-900/70 p-1 border border-white/5 w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveAdminTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-brand-pink text-white shadow-lg shadow-brand-pink/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeAdminTab === 'publish' && (
        <Dashboard subcategories={subcategories} onPublishSuccess={onProductsChange} />
      )}

      {activeAdminTab === 'catalog' && (
        <AdminCatalogManager
          products={products}
          subcategories={subcategories}
          onProductsChange={onProductsChange}
        />
      )}

      {activeAdminTab === 'orders' && <AdminOrders />}
    </div>
  );
}
