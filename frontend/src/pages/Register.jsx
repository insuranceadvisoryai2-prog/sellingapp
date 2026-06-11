import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth, useToast } from '../App.jsx';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const data = await api.register(form);
      login(data.token, data.user);
      toast('✅ Account created! Welcome, ' + data.user.username);
      nav('/');
    } catch (err) {
      toast('❌ ' + err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🛒</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Create Account</h1>
          <p style={{ color: '#757575', marginTop: 4 }}>Join WholesaleMartIndia</p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Username', key: 'username', type: 'text', placeholder: 'Choose a username' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'Your email address' },
            { label: 'Password', key: 'password', type: 'password', placeholder: 'Min 6 characters' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'block' }}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14 }} required />
            </div>
          ))}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ padding: 14, fontSize: 16, marginTop: 4 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, color: '#757575', fontSize: 14 }}>
          Already have an account? <Link to="/login" style={{ color: '#e53935', fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
