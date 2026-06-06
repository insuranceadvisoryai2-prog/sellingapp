import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * CustomerForm – reusable form for collecting buyer information.
 * Props:
 *   onSubmit: (details: CustomerDetails) => void
 *   onCancel?: () => void
 */
export default function CustomerForm({ onSubmit, onCancel, submitLabel = 'Save Details', disabled = false }) {
  const [data, setData] = useState({
    name: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  const [errors, setErrors] = useState({});

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

  const validate = (fieldValues = data) => {
    const temp = { ...errors };
    if ('name' in fieldValues) temp.name = fieldValues.name ? '' : 'Name is required.';
    if ('email' in fieldValues) {
      if (!fieldValues.email) temp.email = 'Email is required.';
      else if (!EMAIL_REGEX.test(fieldValues.email)) temp.email = 'Enter a valid email address.';
      else temp.email = '';
    }
    if ('phone' in fieldValues) {
      if (!fieldValues.phone) temp.phone = 'Phone number is required.';
      else if (!PHONE_REGEX.test(fieldValues.phone)) temp.phone = 'Enter a valid international phone number.';
      else temp.phone = '';
    }
    if ('addressLine1' in fieldValues)
      temp.addressLine1 = fieldValues.addressLine1 ? '' : 'Address is required.';
    if ('city' in fieldValues) temp.city = fieldValues.city ? '' : 'City is required.';
    if ('state' in fieldValues) temp.state = fieldValues.state ? '' : 'State/Province is required.';
    if ('postalCode' in fieldValues) temp.postalCode = fieldValues.postalCode ? '' : 'Postal code is required.';
    if ('country' in fieldValues) temp.country = fieldValues.country ? '' : 'Country is required.';
    setErrors(temp);
    return Object.values(temp).every((x) => x === '');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
    validate({ [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit && onSubmit({ ...data });
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-8 border border-white/5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-brand-pink" />
          Customer Details
        </h2>
        {onCancel && (
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <AlertCircle className="w-5 h-5" />
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            <User className="inline w-4 h-4 mr-1" /> Full Name
          </label>
          <input
            type="text"
            name="name"
            value={data.name}
            onChange={handleChange}
            className={`w-full glass-input text-white text-sm ${errors.name ? 'border-red-500' : ''}`}
            placeholder="John Doe"
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
        </div>
        {/* Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              <Mail className="inline w-4 h-4 mr-1" /> Email
            </label>
            <input
              type="email"
              name="email"
              value={data.email}
              onChange={handleChange}
              className={`w-full glass-input text-white text-sm ${errors.email ? 'border-red-500' : ''}`}
              placeholder="john@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              <Phone className="inline w-4 h-4 mr-1" /> Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={data.phone}
              onChange={handleChange}
              className={`w-full glass-input text-white text-sm ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="+1 555 123 4567"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
          </div>
        </div>
        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            <MapPin className="inline w-4 h-4 mr-1" /> Shipping Address
          </label>
          <textarea
            name="addressLine1"
            value={data.addressLine1}
            onChange={handleChange}
            rows={2}
            className={`w-full glass-input text-white text-sm resize-none ${errors.addressLine1 ? 'border-red-500' : ''}`}
            placeholder="123 Main St, Apt 4B"
          />
          {errors.addressLine1 && <p className="mt-1 text-xs text-red-400">{errors.addressLine1}</p>}
        </div>
        {/* City / State / Postal / Country */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              name="city"
              value={data.city}
              onChange={handleChange}
              className={`w-full glass-input text-white text-sm ${errors.city ? 'border-red-500' : ''}`}
              placeholder="City"
            />
            {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city}</p>}
          </div>
          <div>
            <input
              type="text"
              name="state"
              value={data.state}
              onChange={handleChange}
              className={`w-full glass-input text-white text-sm ${errors.state ? 'border-red-500' : ''}`}
              placeholder="State"
            />
            {errors.state && <p className="mt-1 text-xs text-red-400">{errors.state}</p>}
          </div>
          <div>
            <input
              type="text"
              name="postalCode"
              value={data.postalCode}
              onChange={handleChange}
              className={`w-full glass-input text-white text-sm ${errors.postalCode ? 'border-red-500' : ''}`}
              placeholder="Pincode"
            />
            {errors.postalCode && <p className="mt-1 text-xs text-red-400">{errors.postalCode}</p>}
          </div>
          <div>
            <input
              type="text"
              name="country"
              value={data.country}
              onChange={handleChange}
              className={`w-full glass-input text-white text-sm ${errors.country ? 'border-red-500' : ''}`}
              placeholder="Country"
            />
            {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country}</p>}
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 bg-dark-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={disabled}
            className="px-5 py-2.5 bg-brand-pink hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-xl flex items-center gap-2 shadow-md shadow-brand-pink/20 transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
