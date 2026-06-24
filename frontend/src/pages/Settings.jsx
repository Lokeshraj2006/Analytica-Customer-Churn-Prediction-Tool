import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUser, HiOutlineMail, HiOutlineCalendar, HiOutlineLogout } from 'react-icons/hi';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="page-header animate-fade-in">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="glass-card animate-fade-in-up" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 24, color: 'var(--text-primary)' }}>
          Profile Information
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'white',
          }}>
            {user?.full_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {user?.full_name || user?.username}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-glass-strong)', borderRadius: 'var(--radius-md)' }}>
            <HiOutlineUser style={{ color: 'var(--accent-blue)', fontSize: '1.1rem' }} />
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Username</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-primary)' }}>{user?.username}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-glass-strong)', borderRadius: 'var(--radius-md)' }}>
            <HiOutlineMail style={{ color: 'var(--accent-violet)', fontSize: '1.1rem' }} />
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Email</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-primary)' }}>{user?.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-glass-strong)', borderRadius: 'var(--radius-md)' }}>
            <HiOutlineCalendar style={{ color: 'var(--accent-cyan)', fontSize: '1.1rem' }} />
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Member Since</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                }) : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '100ms', marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
          About Analytica
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
          Analytica is an AI-powered Customer Churn Prediction Dashboard built by <strong>Bytes & Clouds Club</strong>.
          It uses Random Forest and Decision Tree classifiers trained on the Telco Customer Churn dataset
          to predict customer churn probability and provide actionable retention insights.
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-info">React</span>
          <span className="badge badge-info">FastAPI</span>
          <span className="badge badge-info">scikit-learn</span>
          <span className="badge badge-info">JWT Auth</span>
          <span className="badge badge-info">Docker</span>
          <span className="badge badge-info">Gemini AI</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card animate-fade-in-up" style={{ animationDelay: '200ms', borderColor: 'rgba(255, 107, 107, 0.2)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, color: 'var(--accent-rose)' }}>
          Danger Zone
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16 }}>
          Sign out of your account. You will need to log in again.
        </p>
        <button className="btn btn-danger" onClick={handleLogout}>
          <HiOutlineLogout /> Sign Out
        </button>
      </div>
    </div>
  );
}
