import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineBell, HiOutlineCog, HiOutlineLogout, HiOutlineUser, HiOutlineShieldCheck } from 'react-icons/hi';

export default function Navbar({ collapsed }) {
  const { user, logout, role, isAdmin } = useAuth();
  const { currency, changeCurrency, currencies } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();

  const titles = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/predict': 'Churn Prediction',
    '/customers': 'Customer Data',
    '/analytics': 'Analytics',
    '/eda': 'Data Explorer',
    '/admin': 'Admin Panel',
    '/settings': 'Settings',
    '/explainability': 'SHAP Explainability',
    '/simulator': 'What-If Simulator',
    '/segments': 'Customer Segmentation',
    '/executive': 'Executive Insights',
    '/data-quality': 'Data Quality',
    '/tuning': 'Hyperparameter Tuning',
    '/clv': 'Customer Lifetime Value',
    '/multi-industry': 'Multi-Industry Analytics',
  };
  const pageTitle = titles[location.pathname]
    || (location.pathname.startsWith('/explainability') ? 'SHAP Explainability' : 'Dashboard');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  return (
    <nav className={`navbar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="navbar-left">
        <h2 className="navbar-title">
          {pageTitle}
        </h2>
      </div>

      <div className="navbar-right">
        {/* Currency Selector */}
        <div className="currency-selector-wrapper" style={{ marginRight: '8px' }}>
          <select 
            className="filter-select currency-select"
            value={currency}
            onChange={(e) => changeCurrency(e.target.value)}
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.82rem',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
              transition: 'var(--transition-fast)',
            }}
          >
            {Object.entries(currencies).map(([code, info]) => (
              <option 
                key={code} 
                value={code} 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)',
                  padding: '8px'
                }}
              >
                {info.symbol} {code}
              </option>
            ))}
          </select>
        </div>

        <button className="navbar-btn" title="Notifications">
          <HiOutlineBell />
        </button>

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div className="navbar-user" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="navbar-avatar">{getInitials()}</div>
            <div className="navbar-user-info">
              <div className="navbar-user-name">
                {user?.full_name || user?.username}
                <span className="navbar-role-pill" data-role={role}>
                  {role}
                </span>
              </div>
              <div className="navbar-user-email">{user?.email}</div>
            </div>
          </div>

          {showDropdown && (
            <div className="navbar-dropdown">
              <button className="navbar-dropdown-item" onClick={() => { navigate('/settings'); setShowDropdown(false); }}>
                <HiOutlineUser /> Profile
              </button>
              <button className="navbar-dropdown-item" onClick={() => { navigate('/settings'); setShowDropdown(false); }}>
                <HiOutlineCog /> Settings
              </button>
              {isAdmin && (
                <button className="navbar-dropdown-item" onClick={() => { navigate('/admin'); setShowDropdown(false); }}>
                  <HiOutlineShieldCheck /> Admin Panel
                </button>
              )}
              <div className="navbar-dropdown-divider" />
              <button className="navbar-dropdown-item danger" onClick={handleLogout}>
                <HiOutlineLogout /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}


