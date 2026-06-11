import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth, useToast } from '../App.jsx';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.login(form);
      login(data.token, data.user);
      toast('✅ Welcome back, ' + data.user.username + '!');
      nav(data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast('❌ ' + err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Welcome Back</h1>
          <p style={{ color: '#757575', marginTop: 4 }}>Sign in to your account</p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Username', key: 'username', type: 'text', placeholder: 'Enter username' },
            { label: 'Password', key: 'password', type: 'password', placeholder: 'Enter password' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'block' }}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14 }} required />
            </div>
          ))}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ padding: 14, fontSize: 16, marginTop: 4 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, color: '#757575', fontSize: 14 }}>
          Don't have an account? <Link to="/register" style={{ color: '#e53935', fontWeight: 700 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
