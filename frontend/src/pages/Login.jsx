import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineMail, HiOutlineLockClosed, HiOutlineCheckCircle, HiOutlineX } from 'react-icons/hi';
import '../styles/auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [fpStep, setFpStep] = useState(1); // 1=email, 2=new password, 3=success
  const [fpEmail, setFpEmail] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpShowNew, setFpShowNew] = useState(false);
  const [fpShowConfirm, setFpShowConfirm] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => {
    setFpStep(1);
    setFpEmail('');
    setFpNewPassword('');
    setFpConfirmPassword('');
    setFpError('');
    setShowForgot(true);
  };

  const closeForgot = () => setShowForgot(false);

  const handleFpStep1 = async (e) => {
    e.preventDefault();
    setFpError('');
    if (!fpEmail.trim()) { setFpError('Please enter your email'); return; }
    setFpLoading(true);
    try {
      // Verify email exists by trying a dummy reset — we go to step 2 regardless
      // (We'll validate on actual submit)
      setFpStep(2);
    } finally {
      setFpLoading(false);
    }
  };

  const handleFpStep2 = async (e) => {
    e.preventDefault();
    setFpError('');
    if (fpNewPassword.length < 6) { setFpError('Password must be at least 6 characters'); return; }
    if (fpNewPassword !== fpConfirmPassword) { setFpError('Passwords do not match'); return; }
    setFpLoading(true);
    try {
      await authAPI.resetPassword(fpEmail, fpNewPassword);
      setFpStep(3);
    } catch (err) {
      setFpError(err.response?.data?.detail || 'No account found with that email address');
      setFpStep(1); // go back to email step if email not found
    } finally {
      setFpLoading(false);
    }
  };

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
      <div className="auth-card">
        <div className="auth-card-brand">
          <img src="/logo.png" alt="Analytica" className="auth-card-logo" />
          <span>Analytica</span>
        </div>
        <h1 className="auth-card-title">Welcome Back</h1>
        <p className="auth-card-subtitle">Sign in to your account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="auth-form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-form-label">Password</label>
            <div className="password-input-container">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
          </div>

          <div className="auth-form-row">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button type="button" className="auth-forgot" onClick={openForgot}>
              Forgot Password?
            </button>
          </div>

          <button type="submit" id="login-submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Signing in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="auth-switch">
          Don&apos;t have an account?
          <Link to="/register">Create one</Link>
        </div>
      </div>

      {/* ── Forgot Password Modal ────────────────────────────── */}
      {showForgot && (
        <div className="fp-overlay" onClick={closeForgot}>
          <div className="fp-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fp-close" onClick={closeForgot} title="Close">
              <HiOutlineX />
            </button>

            {/* Step 1 — Enter email */}
            {fpStep === 1 && (
              <>
                <div className="fp-icon"><HiOutlineMail /></div>
                <h2 className="fp-title">Forgot Password?</h2>
                <p className="fp-subtitle">Enter your registered email address to continue.</p>
                {fpError && <div className="auth-error">{fpError}</div>}
                <form onSubmit={handleFpStep1}>
                  <div className="auth-form-group">
                    <label className="auth-form-label">Email Address</label>
                    <input
                      type="email"
                      className="auth-form-input"
                      placeholder="you@example.com"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="auth-submit-btn" disabled={fpLoading}>
                    {fpLoading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Checking...</> : 'Continue'}
                  </button>
                </form>
              </>
            )}

            {/* Step 2 — Set new password */}
            {fpStep === 2 && (
              <>
                <div className="fp-icon"><HiOutlineLockClosed /></div>
                <h2 className="fp-title">Set New Password</h2>
                <p className="fp-subtitle">Choose a strong new password for <strong>{fpEmail}</strong></p>
                {fpError && <div className="auth-error">{fpError}</div>}
                <form onSubmit={handleFpStep2}>
                  <div className="auth-form-group">
                    <label className="auth-form-label">New Password</label>
                    <div className="password-input-container">
                      <input
                        type={fpShowNew ? 'text' : 'password'}
                        className="auth-form-input"
                        placeholder="Min. 6 characters"
                        value={fpNewPassword}
                        onChange={(e) => setFpNewPassword(e.target.value)}
                        required
                        autoFocus
                      />
                      <button type="button" className="password-toggle-btn" onClick={() => setFpShowNew(!fpShowNew)} tabIndex="-1">
                        {fpShowNew ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                      </button>
                    </div>
                  </div>
                  <div className="auth-form-group">
                    <label className="auth-form-label">Confirm Password</label>
                    <div className="password-input-container">
                      <input
                        type={fpShowConfirm ? 'text' : 'password'}
                        className="auth-form-input"
                        placeholder="Repeat new password"
                        value={fpConfirmPassword}
                        onChange={(e) => setFpConfirmPassword(e.target.value)}
                        required
                      />
                      <button type="button" className="password-toggle-btn" onClick={() => setFpShowConfirm(!fpShowConfirm)} tabIndex="-1">
                        {fpShowConfirm ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="auth-submit-btn" disabled={fpLoading}>
                    {fpLoading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Resetting...</> : 'Reset Password'}
                  </button>
                  <button type="button" className="fp-back-btn" onClick={() => { setFpStep(1); setFpError(''); }}>
                    ← Back
                  </button>
                </form>
              </>
            )}

            {/* Step 3 — Success */}
            {fpStep === 3 && (
              <div className="fp-success">
                <div className="fp-icon success"><HiOutlineCheckCircle /></div>
                <h2 className="fp-title">Password Reset!</h2>
                <p className="fp-subtitle">Your password has been updated successfully. You can now log in with your new password.</p>
                <button className="auth-submit-btn" onClick={closeForgot}>
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
