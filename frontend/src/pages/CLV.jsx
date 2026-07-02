import { useState, useEffect, useMemo } from 'react';
import { clvAPI } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { Gem, DollarSign, AlertTriangle, BarChart3, Trophy, Target, Flame } from 'lucide-react';

const C = {
  violet: '#8b5cf6', rose: '#f43f5e', emerald: '#10b981', amber: '#f59e0b',
  cyan: '#06b6d4', slate: '#64748b', indigo: '#6366f1', pink: '#ec4899',
};

const TIER_COLORS = {
  Platinum: '#a78bfa',
  Gold: '#f59e0b',
  Silver: '#94a3b8',
  Bronze: '#b45309',
};

const CLVTip = ({ active, payload }) => {
  const { format } = useCurrency();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ color: '#a78bfa', fontWeight: 700, margin: '0 0 4px' }}>Prediction #{d.prediction_id}</p>
      <p style={{ color: '#cbd5e1', margin: 0 }}>Risk-Adjusted CLV: <strong style={{ color: C.emerald }}>{format(d.risk_adjusted_clv || 0, 0)}</strong></p>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.75rem' }}>Revenue at Risk: {format(d.revenue_at_risk || 0, 0)}</p>
      <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.75rem' }}>Churn: {(d.churn_probability * 100).toFixed(1)}%</p>
    </div>
  );
};

function StatCard({ icon, label, value, subtext, color, delay = 0 }) {
  return (
    <div className="glass-card animate-fade-in-up" style={{ animationDelay: `${delay}ms`, padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>{label}</div>
          <div style={{ color, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
          {subtext && <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{subtext}</div>}
        </div>
      </div>
    </div>
  );
}

function assignTier(clv) {
  if (clv >= 5000) return 'Platinum';
  if (clv >= 2500) return 'Gold';
  if (clv >= 1000) return 'Silver';
  return 'Bronze';
}

export default function CLV() {
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('telecom');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('risk_adjusted_clv');
  const { currentCurrency, format } = useCurrency();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      clvAPI.getSummary(selectedIndustry).catch(() => ({ data: {} })),
      clvAPI.getCustomers({ limit: 100, sort_by: 'risk_adjusted_clv', industry: selectedIndustry }).catch(() => ({ data: [] })),
    ])
      .then(([sumRes, custRes]) => {
        setSummary(sumRes.data);
        setCustomers(custRes.data || []);
      })
      .finally(() => setLoading(false));
  }, [selectedIndustry]);

  // Tier distribution
  const tierData = useMemo(() => {
    if (!customers.length) return [];
    const tiers = { Platinum: 0, Gold: 0, Silver: 0, Bronze: 0 };
    customers.forEach(c => { tiers[assignTier(c.risk_adjusted_clv || 0)]++; });
    return Object.entries(tiers)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: TIER_COLORS[name] }));
  }, [customers]);

  // Revenue at risk by risk level
  const riskData = useMemo(() => {
    if (!customers.length) return [];
    const groups = {};
    customers.forEach(c => {
      const level = c.risk_level || 'Unknown';
      if (!groups[level]) groups[level] = { level, totalRev: 0, count: 0 };
      groups[level].totalRev += c.revenue_at_risk || 0;
      groups[level].count++;
    });
    return Object.values(groups).sort((a, b) => b.totalRev - a.totalRev);
  }, [customers]);

  // Top churners sorted
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  }, [customers, sortBy]);

  if (loading) return (
    <div className="page-container">
      <div className="loading-container">
        <div className="spinner" />
        <p className="loading-text">Calculating Customer Lifetime Value...</p>
      </div>
    </div>
  );

  const fmt = v => format(v || 0, 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <span style={{ background: 'rgba(16,185,129,0.2)', borderRadius: 10, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Gem size={16} className="text-emerald-400" /></span>
            Customer Lifetime Value
          </h1>
          <p style={{ margin: 0, marginTop: 4 }}>Revenue intelligence — identify high-value customers and protect revenue at risk</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Active Industry:</span>
          <select
            className="form-select"
            value={selectedIndustry}
            onChange={e => setSelectedIndustry(e.target.value)}
            style={{ minWidth: 160, background: 'rgba(255,255,255,0.03)' }}
          >
            <option value="telecom">📡 Telecom</option>
            <option value="banking">🏦 Banking</option>
            <option value="ecommerce">🛍️ E-commerce</option>
            <option value="healthcare">🩺 Healthcare</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={<DollarSign size={20} className="text-emerald-400" />} label="Total Portfolio CLV" value={fmt(summary?.total_clv)} subtext={`${summary?.total_predictions || 0} customers`} color={C.emerald} delay={0} />
        <StatCard icon={<AlertTriangle size={20} className="text-rose-400" />} label="Revenue at Risk" value={fmt(summary?.total_revenue_at_risk)} subtext="From predicted churners" color={C.rose} delay={50} />
        <StatCard icon={<BarChart3 size={20} className="text-violet-400" />} label="Avg. Risk-Adjusted CLV" value={fmt(summary?.avg_risk_adjusted_clv)} subtext="Per customer" color={C.violet} delay={100} />
        <StatCard icon={<Trophy size={20} className="text-amber-400" />} label="Highest CLV" value={fmt(summary?.max_clv)} subtext="Top customer value" color={C.amber} delay={150} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Tier Distribution Pie */}
        <div className="glass-card animate-fade-in-up">
          <h3 style={{ color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} className="text-indigo-400" /> CLV Tier Distribution
          </h3>
          {tierData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} animationDuration={800}>
                    {tierData.map((t, i) => <Cell key={i} fill={t.color} stroke="none" />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} customers`, n]} contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, fontSize: '0.82rem' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, paddingLeft: 8 }}>
                {tierData.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: t.color, display: 'inline-block' }} />
                    <span style={{ color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{t.name}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{t.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.72rem', color: '#64748b' }}>
                  Platinum ≥ $5K · Gold ≥ $2.5K · Silver ≥ $1K
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>No CLV data available. Make predictions first.</p>
          )}
        </div>

        {/* Revenue at Risk by Risk Level */}
        <div className="glass-card animate-fade-in-up">
          <h3 style={{ color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.1rem' }}>🔥</span> Revenue at Risk by Segment
          </h3>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskData} margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                <XAxis dataKey="level" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => { const local = v * (currentCurrency?.rate || 1.0); return `${currentCurrency?.symbol || '$'}${(local / 1000).toFixed(0)}K`; }} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [format(v, 0), 'Revenue at Risk']}
                  contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, fontSize: '0.82rem' }}
                />
                <Bar dataKey="totalRev" radius={[6, 6, 0, 0]} animationDuration={800}>
                  {riskData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.rose : i === 1 ? C.amber : C.emerald} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>No risk data available.</p>
          )}
        </div>
      </div>

      {/* Customer Table */}
      <div className="glass-card animate-fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>👥</span> Customer CLV Rankings
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>{customers.length} customers analyzed</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              ['risk_adjusted_clv', 'By CLV'],
              ['revenue_at_risk', 'By Revenue at Risk'],
              ['churn_probability', 'By Churn Risk'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: sortBy === key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                  color: sortBy === key ? '#a78bfa' : '#94a3b8',
                  fontWeight: sortBy === key ? 700 : 500, fontSize: '0.78rem',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['#', 'Tier', 'Tenure', 'Contract', 'Monthly', 'Base CLV', 'Risk-Adj CLV', 'Revenue at Risk', 'Churn %', 'Risk'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.slice(0, 25).map((c, i) => {
                const tier = assignTier(c.risk_adjusted_clv || 0);
                const riskColor = c.risk_level === 'High' ? C.rose : c.risk_level === 'Medium' ? C.amber : C.emerald;
                return (
                  <tr key={c.prediction_id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        fontSize: '0.72rem', padding: '2px 10px', borderRadius: 12, fontWeight: 700,
                        background: `${TIER_COLORS[tier]}20`, color: TIER_COLORS[tier], border: `1px solid ${TIER_COLORS[tier]}33`,
                      }}>
                        {tier}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#e2e8f0' }}>{c.tenure} mo</td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{c.contract}</td>
                    <td style={{ padding: '8px 10px', color: '#e2e8f0', fontWeight: 600 }}>{fmt(c.monthly_charges)}</td>
                    <td style={{ padding: '8px 10px', color: '#a78bfa' }}>{fmt(c.base_clv)}</td>
                    <td style={{ padding: '8px 10px', color: C.emerald, fontWeight: 700 }}>{fmt(c.risk_adjusted_clv)}</td>
                    <td style={{ padding: '8px 10px', color: C.rose, fontWeight: 600 }}>{fmt(c.revenue_at_risk)}</td>
                    <td style={{ padding: '8px 10px', color: riskColor }}>{(c.churn_probability * 100).toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                        background: `${riskColor}15`, color: riskColor,
                      }}>
                        {c.risk_level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
            No CLV data available. Make some churn predictions first, then return here to see lifetime value analysis.
          </p>
        )}
      </div>
    </div>
  );
}
