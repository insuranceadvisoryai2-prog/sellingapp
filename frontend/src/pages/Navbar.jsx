import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const handleLogout = () => { logout(); nav('/'); };

  return (
    <nav style={{ background:'#b71c1c', color:'white', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
      <div className="container" style={{ display:'flex', alignItems:'center', height:64, gap:16 }}>
        
        {/* Logo */}
        <Link to="/" style={{ display:'flex', alignItems:'center', flexShrink:0, textDecoration:'none' }}>
          <img 
            src="/logo.png" 
            alt="WholesaleMartIndia" 
            style={{ height:52, width:'auto', objectFit:'contain', filter:'brightness(1.1)' }}
          />
        </Link>

        <Link to="/products" style={{ color:'rgba(255,255,255,0.9)', fontSize:14, fontWeight:600 }}>
          Products
        </Link>

        <div style={{ flex:1 }} />

        {user ? (
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            {user.role==='admin' && (
              <Link to="/admin" style={{ color:'#ffcc02', fontWeight:700, fontSize:13 }}>Admin</Link>
            )}
            <Link to="/cart" style={{ color:'white', fontSize:13 }}>🛒 Cart</Link>
            <Link to="/orders" style={{ color:'white', fontSize:13 }}>📦 Orders</Link>
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:13 }}>Hi, {user.username}</span>
            <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.2)', color:'white', padding:'6px 14px', borderRadius:6, fontSize:13, border:'none', cursor:'pointer' }}>
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            <Link to="/login" style={{ color:'white', padding:'7px 16px', borderRadius:6, border:'1px solid rgba(255,255,255,0.4)', fontSize:13, fontWeight:600 }}>Login</Link>
            <Link to="/register" style={{ background:'white', color:'#b71c1c', padding:'7px 16px', borderRadius:6, fontSize:13, fontWeight:700 }}>Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
