import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import '../styles/auth.css';

const ROLES = [
  { key: 'analyst', label: 'Analyst', icon: '◈', desc: 'Run churn predictions & export data' },
  { key: 'viewer', label: 'Viewer',   icon: '◌',  desc: 'View dashboards & prediction history' },
  { key: 'admin',  label: 'Admin',    icon: '✦',  desc: 'Full platform access + user management' },
];

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });
  const [selectedRole, setSelectedRole] = useState('analyst');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { level: '', text: '' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { level: 'weak', text: 'Weak' };
    if (score <= 2) return { level: 'fair', text: 'Fair' };
    if (score <= 3) return { level: 'good', text: 'Good' };
    return { level: 'strong', text: 'Strong' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(
        formData.username,
        formData.email,
        formData.password,
        formData.full_name,
        selectedRole,
      );
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();
  const roleInfo = ROLES.find((r) => r.key === selectedRole);

  return (
    <div className="auth-page">
      {/* Top Navbar */}
      <nav className="auth-navbar">
        <Link to="/" className="auth-navbar-brand">
          <img src="/logo.png" alt="Analytica" className="auth-navbar-logo" />
          Analytica
        </Link>
        <div className="auth-navbar-links">
          <Link to="/dashboard" className="auth-navbar-link">Dashboard</Link>
          <Link to="/predict" className="auth-navbar-link">Predict</Link>
          <Link to="/analytics" className="auth-navbar-link">Analytics</Link>
        </div>
        <div className="auth-navbar-actions">
          <Link to="/login" className="auth-nav-btn-outline">Login</Link>
          <Link to="/register" className="auth-nav-btn-solid">Sign Up</Link>
        </div>
      </nav>

      {/* Auth Card */}
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-card-brand">
          <img src="/logo.png" alt="Analytica" className="auth-card-logo" />
          <span>Analytica</span>
        </div>
        <h1 className="auth-card-title">Create Account</h1>
        <p className="auth-card-subtitle">Choose your role and get started</p>

        {/* Role Selection */}
        <div className="auth-role-tabs">
          {ROLES.map((r) => (
            <button
              key={r.key}
              className={`auth-role-tab ${selectedRole === r.key ? 'active' : ''}`}
              onClick={() => { setSelectedRole(r.key); setError(''); }}
              type="button"
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Role description */}
        <div className="auth-role-badge">
          <span className="auth-role-badge-icon">{roleInfo.icon}</span>
          <span className="auth-role-badge-text">{roleInfo.desc}</span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="auth-form-group">
            <label className="auth-form-label">Full Name</label>
            <input
              type="text"
              name="full_name"
              className="auth-form-input"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={handleChange}
              autoComplete="name"
            />
          </div>

          {/* Username */}
          <div className="auth-form-group">
            <label className="auth-form-label">Username</label>
            <input
              type="text"
              name="username"
              className="auth-form-input"
              placeholder="johndoe"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          {/* Email */}
          <div className="auth-form-group">
            <label className="auth-form-label">Email Address</label>
            <input
              type="email"
              name="email"
              className="auth-form-input"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label className="auth-form-label">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="auth-form-input"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
            {formData.password && (
              <div className={`password-strength strength-${strength.level}`}>
                <div className="password-strength-bar">
                  <div className="password-strength-fill" />
                </div>
                <span className="password-strength-text">{strength.text}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-form-group">
            <label className="auth-form-label">Confirm Password</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                className="auth-form-input"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
          </div>

          <button id="register-submit" type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Creating account...
              </>
            ) : (
              `Create ${roleInfo.label} Account`
            )}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account?
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
