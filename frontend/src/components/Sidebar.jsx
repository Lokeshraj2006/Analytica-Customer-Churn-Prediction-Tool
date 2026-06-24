import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineChartBar,
  HiOutlineLightningBolt,
  HiOutlineUserGroup,
  HiOutlineChartPie,
  HiOutlineCog,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineShieldCheck,
  HiOutlineBeaker,
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlineCollection,
  HiOutlineTrendingUp,
  HiOutlineAdjustments,
  HiOutlineDatabase,
  HiOutlineCurrencyDollar,
  HiOutlineGlobe,
} from 'react-icons/hi';

/**
 * Role-based navigation — now with V4.0 sections
 */
const ALL_NAV = [
  // ── Core ──────────────────────────────────────────────────────────────────
  { path: '/dashboard',   icon: <HiOutlineChartBar />,      label: 'Dashboard',      roles: ['analyst', 'viewer', 'admin'], section: 'core' },
  { path: '/predict',     icon: <HiOutlineLightningBolt />,  label: 'Predict Churn',  roles: ['analyst', 'admin'],           section: 'core' },
  { path: '/customers',   icon: <HiOutlineUserGroup />,      label: 'Customers',      roles: ['analyst', 'viewer', 'admin'], section: 'core' },
  { path: '/analytics',   icon: <HiOutlineChartPie />,       label: 'Analytics',      roles: ['analyst', 'viewer', 'admin'], section: 'core' },
  { path: '/eda',         icon: <HiOutlineBeaker />,         label: 'Data Explorer',  roles: ['analyst', 'viewer', 'admin'], section: 'core' },

  // ── V4.0 Intelligence ─────────────────────────────────────────────────────
  { path: '/explainability', icon: <HiOutlineSparkles />,    label: 'SHAP Explainer',     roles: ['analyst', 'admin'],           section: 'intelligence' },
  { path: '/simulator',      icon: <HiOutlineRefresh />,     label: 'What-If Simulator',  roles: ['analyst', 'admin'],           section: 'intelligence' },
  { path: '/segments',       icon: <HiOutlineCollection />,  label: 'Segmentation',       roles: ['analyst', 'viewer', 'admin'], section: 'intelligence' },
  { path: '/executive',      icon: <HiOutlineTrendingUp />,  label: 'Executive Insights', roles: ['analyst', 'viewer', 'admin'], section: 'intelligence' },
  { path: '/clv',              icon: <HiOutlineCurrencyDollar />, label: 'CLV Dashboard',     roles: ['analyst', 'viewer', 'admin'], section: 'intelligence' },
  { path: '/multi-industry',   icon: <HiOutlineGlobe />,         label: 'Multi-Industry',    roles: ['analyst', 'viewer', 'admin'], section: 'intelligence' },

  // ── V4.0 Engineering ─────────────────────────────────────────────────────
  { path: '/data-quality',   icon: <HiOutlineDatabase />,    label: 'Data Quality',       roles: ['analyst', 'viewer', 'admin'], section: 'engineering' },
  { path: '/tuning',         icon: <HiOutlineAdjustments />, label: 'HP Tuning',          roles: ['analyst', 'admin'],           section: 'engineering' },

  // ── System ────────────────────────────────────────────────────────────────
  { path: '/admin',     icon: <HiOutlineShieldCheck />,      label: 'Admin Panel',    roles: ['admin'],                      section: 'system' },
  { path: '/settings',  icon: <HiOutlineCog />,              label: 'Settings',       roles: ['analyst', 'viewer', 'admin'], section: 'system' },
];

const ROLE_LABELS = {
  analyst: { label: 'Analyst', color: '#d946ef', bg: 'rgba(217,70,239,0.1)' },
  viewer:  { label: 'Viewer',  color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  admin:   { label: 'Admin',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

const SECTIONS = [
  { key: 'core',         label: 'Core' },
  { key: 'intelligence', label: 'AI Intelligence' },
  { key: 'engineering',  label: 'ML Engineering' },
  { key: 'system',       label: 'System' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { role } = useAuth();
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.analyst;

  const itemsBySection = {};
  SECTIONS.forEach(s => {
    itemsBySection[s.key] = ALL_NAV.filter(n => n.section === s.key && n.roles.includes(role));
  });

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <img src="/logo.png" alt="Analytica" className="sidebar-logo" />
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Analytica</span>
          <span className="sidebar-brand-sub">v4.0 · Bytes &amp; Clouds</span>
        </div>
      </div>

      {/* Toggle */}
      <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronLeft />}
      </button>

      {/* Role Badge */}
      {!collapsed && (
        <div className="sidebar-role-badge" style={{ '--role-color': roleInfo.color, '--role-bg': roleInfo.bg }}>
          <span className="sidebar-role-dot" />
          <span className="sidebar-role-label">{roleInfo.label}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {SECTIONS.map(section => {
          const items = itemsBySection[section.key];
          if (!items || items.length === 0) return null;
          return (
            <div key={section.key}>
              <div className="sidebar-section-title" style={{ marginTop: section.key !== 'core' ? 20 : 0 }}>
                {!collapsed && section.label}
              </div>
              {items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span className="sidebar-item-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Analytica v4.0.0<br />
            © 2026 Bytes &amp; Clouds
          </div>
        )}
      </div>
    </aside>
  );
}
