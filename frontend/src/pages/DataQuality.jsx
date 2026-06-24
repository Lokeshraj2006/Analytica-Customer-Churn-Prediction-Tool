import { useState, useEffect } from 'react';
import { edaAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const C = { violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', emerald: '#10b981', cyan: '#06b6d4', slate: '#64748b' };

function QualityGauge({ score }) {
  const color = score >= 90 ? C.emerald : score >= 70 ? C.amber : C.rose;
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - score / 100);
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 100 100" style={{ width: 120 }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{score.toFixed(0)}</text>
        <text x="50" y="60" textAnchor="middle" fill="#64748b" fontSize="9">/100</text>
      </svg>
      <div style={{ color, fontWeight: 700, fontSize: '0.85rem' }}>
        {score >= 90 ? '✓ Excellent' : score >= 70 ? '⚠ Good' : '✗ Needs Work'}
      </div>
    </div>
  );
}

function TrafficLight({ pct, label }) {
  const color = pct === 0 ? C.emerald : pct < 1 ? C.amber : C.rose;
  const icon = pct === 0 ? '✓' : pct < 1 ? '△' : '✗';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color, fontWeight: 700, fontSize: '1rem', width: 20 }}>{icon}</span>
      <span style={{ color: '#e2e8f0', flex: 1, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: pct === 0 ? C.emerald : pct < 1 ? C.amber : C.rose, fontWeight: 600, fontSize: '0.82rem' }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function DataQuality() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    edaAPI.getDataQuality()
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load data quality metrics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-container">
      <div className="loading-container"><div className="spinner" /><p className="loading-text">Analyzing dataset quality...</p></div>
    </div>
  );
  if (error) return (
    <div className="page-container">
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: C.rose }}>⚠️ {error}</p>
      </div>
    </div>
  );

  const missingTop10 = [...(data?.missing_values || [])].filter(m => m.missing_count > 0).slice(0, 10);
  const outlierTop10 = [...(data?.outliers || [])].sort((a, b) => b.outlier_count - a.outlier_count).slice(0, 8);
  const classDist = data?.class_distribution || {};
  const pieData = classDist.churned != null ? [
    { name: 'Not Churned', value: classDist.not_churned, fill: C.emerald },
    { name: 'Churned', value: classDist.churned, fill: C.rose },
  ] : [];

  const featureStats = data?.feature_statistics || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1>🔬 Data Quality Dashboard</h1>
        <p>Dataset health metrics — missing values, outliers, class balance, and feature statistics</p>
      </div>

      {/* Summary cards */}
      <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 24, alignItems: 'center' }}>
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: 8 }}>Quality Score</p>
          <QualityGauge score={data?.quality_score || 0} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {[
            { label: 'Dataset Source', value: data?.source === 'real' ? '✓ Real Data (IBM Telco)' : '⚠ Synthetic Data', color: data?.source === 'real' ? C.emerald : C.amber },
            { label: 'Total Rows', value: (data?.total_rows || 0).toLocaleString(), color: C.violet },
            { label: 'Completeness', value: `${data?.completeness_pct || 0}%`, color: (data?.completeness_pct || 0) >= 99 ? C.emerald : C.amber },
            { label: 'Duplicate Rows', value: `${data?.n_duplicates || 0} (${data?.duplicate_pct || 0}%)`, color: (data?.n_duplicates || 0) === 0 ? C.emerald : C.rose },
          ].map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: 16 }}>
              <div style={{ color: s.color, fontWeight: 800, fontSize: '1.1rem' }}>{s.value}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'overview', label: '📋 Overview' },
          { id: 'missing', label: '❓ Missing Values' },
          { id: 'outliers', label: '📊 Outliers' },
          { id: 'features', label: '📈 Feature Stats' },
        ].map(t => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === t.id ? C.violet : 'rgba(255,255,255,0.06)',
              color: activeTab === t.id ? 'white' : '#94a3b8',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Traffic light: missing */}
          <div className="glass-card animate-fade-in-up">
            <h3 style={{ color: '#e2e8f0', marginBottom: 12 }}>Missing Value Health</h3>
            {(data?.missing_values || []).slice(0, 10).map((m, i) => (
              <TrafficLight key={i} pct={m.missing_pct} label={m.column} />
            ))}
          </div>

          {/* Class distribution pie */}
          <div className="glass-card animate-fade-in-up">
            <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Class Distribution</h3>
            {classDist.is_imbalanced && (
              <p style={{ color: C.amber, fontSize: '0.75rem', marginBottom: 8 }}>
                ⚠ Imbalanced dataset ({classDist.churn_rate_pct}% churn) — SMOTE applied during training
              </p>
            )}
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#64748b' }}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p style={{ color: '#64748b', textAlign: 'center', paddingTop: 40 }}>No class data</p>}
            {classDist.imbalance_ratio && (
              <p style={{ color: '#64748b', fontSize: '0.72rem', textAlign: 'center' }}>
                Imbalance ratio: {classDist.imbalance_ratio}:1 (Not Churned:Churned)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Missing values tab */}
      {activeTab === 'missing' && (
        <div className="glass-card animate-fade-in-up">
          <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Missing Values by Column</h3>
          <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 16 }}>
            {missingTop10.length === 0 ? '✓ No missing values detected — dataset is complete!' : `${missingTop10.length} columns have missing values`}
          </p>
          {missingTop10.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <p style={{ color: C.emerald, fontWeight: 700 }}>Perfect Completeness</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={missingTop10} layout="vertical" margin={{ left: 40, right: 30 }}>
                <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="column" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8 }} formatter={(v) => [`${v}%`, 'Missing']} />
                <Bar dataKey="missing_pct" radius={[0, 4, 4, 0]}>
                  {missingTop10.map((m, i) => <Cell key={i} fill={m.missing_pct === 0 ? C.emerald : m.missing_pct < 1 ? C.amber : C.rose} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Outliers tab */}
      {activeTab === 'outliers' && (
        <div className="glass-card animate-fade-in-up">
          <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Outlier Detection (IQR Method)</h3>
          <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 16 }}>Values outside ±1.5×IQR from Q1/Q3</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Column', 'Outliers', '%', 'Q1', 'Q3', 'IQR', 'Lower Fence', 'Upper Fence'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', color: '#64748b', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outlierTop10.map((o, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 600 }}>{o.column}</td>
                    <td style={{ padding: '8px 12px', color: o.outlier_count > 100 ? C.rose : o.outlier_count > 0 ? C.amber : C.emerald, fontWeight: 700 }}>{o.outlier_count}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{o.outlier_pct}%</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{o.q1}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{o.q3}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{o.iqr}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{o.lower_fence}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{o.upper_fence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature stats tab */}
      {activeTab === 'features' && (
        <div className="glass-card animate-fade-in-up">
          <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Numerical Feature Statistics</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Column', 'Mean', 'Std Dev', 'Min', 'Median', 'Max'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', color: '#64748b', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureStats.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 600 }}>{f.column}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{f.mean}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{f.std}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{f.min}</td>
                    <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 600 }}>{f.median}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{f.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
