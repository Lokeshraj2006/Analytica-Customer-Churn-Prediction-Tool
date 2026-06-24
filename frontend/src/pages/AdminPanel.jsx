import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import {
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt,
  HiOutlineChartBar,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineUserAdd,
  HiOutlineRefresh,
} from 'react-icons/hi';

const ROLE_CONFIG = {
  admin:   { label: 'Admin',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   icon: '✦' },
  analyst: { label: 'Analyst', color: '#d946ef', bg: 'rgba(217,70,239,0.12)',  icon: '◈' },
  viewer:  { label: 'Viewer',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   icon: '◌' },
};

const ROLE_PERMISSIONS = {
  admin: [
    '✅ Run churn predictions (ML models)',
    '✅ View all dashboards & analytics',
    '✅ Browse & filter customer records',
    '✅ Delete predictions & records',
    '✅ Export data to CSV',
    '✅ Manage users & roles',
    '✅ Access Admin Panel',
    '✅ View system settings',
  ],
  analyst: [
    '✅ Run churn predictions (ML models)',
    '✅ View dashboards & analytics',
    '✅ Browse & filter customer records',
    '✅ Export data to CSV',
    '✅ Use AI chatbot for insights',
    '❌ Cannot delete records',
    '❌ Cannot manage users',
    '❌ No Admin Panel access',
  ],
  viewer: [
    '✅ View dashboard KPIs',
    '✅ Browse customer records (read-only)',
    '✅ View analytics charts',
    '✅ Use AI chatbot (read queries only)',
    '❌ Cannot run predictions',
    '❌ Cannot export data',
    '❌ Cannot delete records',
    '❌ No Admin Panel access',
  ],
};

export default function AdminPanel() {
  const { user: currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({ total: 0, admin: 0, analyst: 0, viewer: 0 });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authAPI.getUsers();
      const list = res.data || [];
      setUsers(list);
      setStats({
        total:   list.length,
        admin:   list.filter((u) => u.role === 'admin').length,
        analyst: list.filter((u) => u.role === 'analyst').length,
        viewer:  list.filter((u) => u.role === 'viewer').length,
      });
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId) => {
    setSaving(true);
    try {
      await authAPI.updateUserRole(userId, editRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: editRole } : u))
      );
      setStats((prev) => {
        const old = users.find((u) => u.id === userId);
        const updated = { ...prev };
        if (old) updated[old.role] = Math.max(0, updated[old.role] - 1);
        updated[editRole] = (updated[editRole] || 0) + 1;
        return updated;
      });
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await authAPI.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.analyst;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1>Admin Panel</h1>
        <p>Manage users, roles, and system access across the Analytica platform</p>
      </div>

      {/* Stats Row */}
      <div className="stats-grid stagger-children" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Users', value: stats.total, icon: '◎', color: 'blue' },
          { label: 'Admins',      value: stats.admin,   icon: '✦', color: 'orange' },
          { label: 'Analysts',    value: stats.analyst, icon: '◈', color: 'purple' },
          { label: 'Viewers',     value: stats.viewer,  icon: '◌', color: 'green' },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-card-header">
              <span className="stat-card-label">{s.label}</span>
              <div className={`stat-card-icon ${s.color}`} style={{ fontSize: '1.3rem' }}>
                {s.icon}
              </div>
            </div>
            <div className="stat-card-value" style={{ fontSize: '2.2rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="admin-tabs">
        {[
          { key: 'users', label: 'User Management', icon: <HiOutlineUsers /> },
          { key: 'roles', label: 'Role Permissions', icon: <HiOutlineShieldCheck /> },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: User Management */}
      {activeTab === 'users' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                Registered Users
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {users.length} users — click the edit icon to change a role
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchUsers}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <HiOutlineRefresh /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-container" style={{ minHeight: 240 }}>
              <div className="spinner" />
              <p className="loading-text">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◎</div>
              <h3>No users found</h3>
              <p>Users will appear here once they register.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const rc = getRoleConfig(u.role);
                  const isEditing = editingUser === u.id;
                  const isSelf = currentUser?.id === u.id;

                  return (
                    <tr key={u.id}>
                      {/* User info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                          }}>
                            {(u.full_name || u.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {u.full_name || u.username}
                              {isSelf && (
                                <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#d946ef', fontWeight: 600 }}>
                                  (you)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{u.email}</td>

                      {/* Role */}
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <select
                              className="form-select"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              style={{ padding: '5px 10px', fontSize: '0.82rem', width: 120 }}
                              autoFocus
                            >
                              <option value="analyst">Analyst</option>
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleRoleChange(u.id)}
                              disabled={saving}
                              title="Save"
                              style={{ padding: '5px 8px', minWidth: 28 }}
                            >
                              {saving ? '…' : <HiOutlineCheck />}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingUser(null)}
                              title="Cancel"
                              style={{ padding: '5px 8px', minWidth: 28 }}
                            >
                              <HiOutlineX />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="admin-role-tag"
                            style={{ '--r-color': rc.color, '--r-bg': rc.bg }}
                          >
                            {rc.icon} {rc.label}
                          </span>
                        )}
                      </td>

                      {/* Joined */}
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!isEditing && (
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Change role"
                              onClick={() => { setEditingUser(u.id); setEditRole(u.role); }}
                              style={{ padding: '5px 8px' }}
                            >
                              <HiOutlinePencil />
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              className="btn btn-sm"
                              style={{
                                padding: '5px 8px',
                                background: 'rgba(244,63,94,0.1)',
                                color: '#f43f5e',
                                border: '1px solid rgba(244,63,94,0.2)',
                              }}
                              title="Delete user"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                            >
                              <HiOutlineTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Role Permissions */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => {
            const rc = getRoleConfig(role);
            return (
              <div key={role} className="glass-card admin-role-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: rc.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.5rem',
                    border: `1px solid ${rc.color}22`,
                  }}>
                    {rc.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {rc.label}
                    </h3>
                    <div style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color: rc.color, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Role
                    </div>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {perms.map((perm, i) => (
                    <li key={i} style={{
                      fontSize: '0.83rem',
                      color: perm.startsWith('✅') ? 'var(--text-secondary)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'flex-start', gap: 0,
                    }}>
                      {perm}
                    </li>
                  ))}
                </ul>

                <div style={{
                  marginTop: 20, padding: '10px 14px',
                  background: rc.bg, borderRadius: 8,
                  border: `1px solid ${rc.color}20`,
                }}>
                  <div style={{ fontSize: '0.75rem', color: rc.color, fontWeight: 600 }}>
                    {stats[role]} user{stats[role] !== 1 ? 's' : ''} with this role
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
