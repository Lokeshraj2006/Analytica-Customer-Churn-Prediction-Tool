import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shapAPI, predictionAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { Search, BarChart3, Trophy, Zap, AlertTriangle, Radio, Landmark, ShoppingBag, HeartPulse } from 'lucide-react';

const C = {
  positive: '#f43f5e',
  negative: '#10b981',
  neutral:  '#8b5cf6',
  cyan:     '#06b6d4',
  amber:    '#f59e0b',
};

const TIP = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ color: '#a78bfa', fontWeight: 700, margin: '0 0 4px' }}>{d.feature || d.label}</p>
      <p style={{ color: '#cbd5e1', margin: 0 }}>SHAP: <strong style={{ color: (d.shap_value || d.delta || 0) > 0 ? C.positive : C.negative }}>{(d.shap_value || d.delta || 0) > 0 ? '+' : ''}{(((d.shap_value || d.delta || 0)) * 100).toFixed(2)}%</strong></p>
      {d.raw_value !== undefined && <p style={{ color: '#94a3b8', margin: 0 }}>Raw value: {d.raw_value}</p>}
    </div>
  );
};

const SummaryTIP = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ color: '#a78bfa', fontWeight: 700, margin: '0 0 4px' }}>{d.feature}</p>
      <p style={{ color: '#cbd5e1', margin: 0 }}>Mean |SHAP|: <strong style={{ color: C.neutral }}>{(d.mean_abs_shap * 100).toFixed(3)}%</strong></p>
      <p style={{ color: C.positive, margin: 0, fontSize: '0.75rem' }}>Increases churn: {d.positive_pct}% of predictions</p>
      <p style={{ color: C.negative, margin: 0, fontSize: '0.75rem' }}>Decreases churn: {d.negative_pct}% of predictions</p>
      <p style={{ color: '#64748b', margin: 0, fontSize: '0.72rem' }}>Based on {d.n_samples} predictions</p>
    </div>
  );
};

function RiskGauge({ probability }) {
  const pct = Math.round(probability * 100);
  const angle = (probability * 180) - 90;
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <svg viewBox="0 0 200 110" style={{ width: 180, display: 'block', margin: '0 auto' }}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        <path d="M 10 100 A 90 90 0 0 1 190 100" stroke="url(#gaugeGrad)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <g transform={`translate(100, 100) rotate(${angle})`}>
          <line x1="0" y1="0" x2="0" y2="-70" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="6" fill="white" />
        </g>
        <text x="100" y="95" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">{pct}%</text>
      </svg>
      <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>Churn Probability</p>
    </div>
  );
}

/* ── Global SHAP Summary Tab ───────────────────────────────────────────── */
function ShapSummaryTab({ refreshKey }) {
  const [summary, setSummary] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState('telecom');
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchSummary = (industry) => {
    setLoading(true);
    setSummary(null);
    setUsingFallback(false);

    // Step 1: try with industry filter
    shapAPI.getSummary('random_forest', 50, industry)
      .then(r => {
        const data = r.data;
        // Step 2: if no features for this industry, retry without filter
        if (!data?.features?.length) {
          setUsingFallback(true);
          return shapAPI.getSummary('random_forest', 50, null).then(r2 => r2.data);
        }
        return data;
      })
      .then(data => setSummary(data))
      .catch(() => setSummary({ features: [], n_predictions: 0 }))
      .finally(() => setLoading(false));
  };

  // Refetch when industry changes OR when refreshKey changes (tab re-selected)
  useEffect(() => { fetchSummary(selectedIndustry); }, [selectedIndustry, refreshKey]);

  const hasData = summary && summary.features?.length > 0;
  const chartData = hasData
    ? summary.features.slice(0, 15).map(f => ({
        ...f,
        mean_abs_pct: +(f.mean_abs_shap * 100).toFixed(3),
        pos_bar: +(f.mean_abs_shap * (f.positive_pct / 100) * 100).toFixed(3),
        neg_bar: -(f.mean_abs_shap * (f.negative_pct / 100) * 100).toFixed(3),
      }))
    : [];

  return (
    <>
      {/* Industry Filter for SHAP summary */}
      <div className="glass-card animate-fade-in-up" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>Global Explanation Domain</span>
          <p style={{ color: '#64748b', fontSize: '0.72rem', margin: 0 }}>View feature importances aggregated for the selected industry vertical</p>
        </div>
        <select
          className="form-select"
          value={selectedIndustry}
          onChange={e => setSelectedIndustry(e.target.value)}
          style={{ minWidth: 160, background: 'rgba(255,255,255,0.03)' }}
        >
          <option value="telecom">⌁ Telecom</option>
          <option value="banking">⌁ Banking</option>
          <option value="ecommerce">⌁ E-commerce</option>
          <option value="healthcare">⌁ Healthcare</option>
        </select>
      </div>

      {/* Fallback info banner */}
      {usingFallback && !loading && hasData && (
        <div style={{
          marginBottom: 16,
          padding: '10px 16px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.18)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.8rem',
          color: '#fbbf24',
        }}>
          <span style={{ fontSize: '1rem' }}>ℹ️</span>
          <span>No SHAP data for <strong>{selectedIndustry}</strong> yet — showing all-industry data. Make a {selectedIndustry} prediction and open it in the Prediction Detail tab to build industry-specific summaries.</span>
        </div>
      )}

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" />
          <p className="loading-text">Loading SHAP summary...</p>
        </div>
      ) : !hasData ? (
        <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center', padding: '56px 40px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <BarChart3 size={32} style={{ color: '#6366f1' }} />
          </div>
          <h3 style={{ color: '#e2e8f0', marginBottom: 8, fontWeight: 700 }}>No SHAP Data Yet</h3>
          <p style={{ color: '#64748b', marginBottom: 8, fontSize: '0.85rem', maxWidth: 340, margin: '0 auto 8px' }}>
            SHAP explanations are computed on demand. To build the global summary:
          </p>
          <ol style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'left', display: 'inline-block', margin: '8px auto 24px', lineHeight: 1.9 }}>
            <li>Go to <strong style={{ color: '#a78bfa' }}>Prediction Detail</strong> tab above</li>
            <li>Select any prediction from the dropdown</li>
            <li>The SHAP values are computed &amp; saved automatically</li>
            <li>Come back here and click <strong style={{ color: '#a78bfa' }}>Refresh Summary</strong></li>
          </ol>
          <button
            style={{
              padding: '10px 22px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: '10px',
              color: '#a78bfa',
              cursor: 'pointer',
              fontSize: '0.83rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onClick={() => fetchSummary(selectedIndustry)}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)'; }}
          >
            <span style={{ fontSize: '1rem' }}>↺</span> Refresh Summary
          </button>
        </div>
      ) : (
        <>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Predictions Analyzed', value: summary.n_predictions, color: C.neutral, icon: <BarChart3 size={24} /> },
          { label: 'Top Feature', value: summary.features[0]?.feature || '-', color: C.cyan, icon: <Trophy size={24} /> },
          { label: 'Top Impact', value: `${(summary.features[0]?.mean_abs_shap * 100 || 0).toFixed(2)}%`, color: C.amber, icon: <Zap size={24} /> },
        ].map((s, i) => (
          <div key={i} className="glass-card animate-fade-in-up" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Summary bar chart */}
      <div className="glass-card animate-fade-in-up" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>Global Feature Importance (Mean |SHAP|)</h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>
              Aggregated across {summary.n_predictions} predictions — larger bars = stronger influence on churn
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: C.positive }}>
              <span style={{ width: 12, height: 12, background: C.positive, borderRadius: 3, display: 'inline-block' }} /> Pushes churn up
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: C.negative }}>
              <span style={{ width: 12, height: 12, background: C.negative, borderRadius: 3, display: 'inline-block' }} /> Pushes churn down
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40, top: 0, bottom: 0 }}>
            <XAxis type="number" tickFormatter={v => `${Math.abs(v).toFixed(2)}%`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="feature" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={140} axisLine={false} tickLine={false} />
            <Tooltip content={<SummaryTIP />} />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
            <Bar dataKey="pos_bar" stackId="a" fill={C.positive} fillOpacity={0.8} radius={[0, 4, 4, 0]} />
            <Bar dataKey="neg_bar" stackId="a" fill={C.negative} fillOpacity={0.8} radius={[4, 0, 0, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Feature table */}
      <div className="glass-card animate-fade-in-up">
        <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Feature Details</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Rank', 'Feature', 'Mean |SHAP|', 'Direction', '↑ Churn %', '↓ Churn %', 'Samples'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.features.map((f, i) => {
                const maxShap = summary.features[0]?.mean_abs_shap || 1;
                const barW = Math.round((f.mean_abs_shap / maxShap) * 100);
                const direction = f.mean_signed_shap > 0 ? 'increases_churn' : 'decreases_churn';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>#{i + 1}</td>
                    <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 600 }}>{f.feature}</td>
                    <td style={{ padding: '8px 12px', minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                          <div style={{ width: `${barW}%`, height: '100%', background: C.neutral, borderRadius: 3 }} />
                        </div>
                        <span style={{ color: '#a78bfa', fontSize: '0.75rem', whiteSpace: 'nowrap', fontWeight: 700 }}>{(f.mean_abs_shap * 100).toFixed(3)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                        background: direction === 'increases_churn' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                        color: direction === 'increases_churn' ? C.positive : C.negative,
                      }}>
                        {direction === 'increases_churn' ? '▲ Risk Up' : '▼ Risk Down'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: C.positive }}>{f.positive_pct}%</td>
                    <td style={{ padding: '8px 12px', color: C.negative }}>{f.negative_pct}%</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{f.n_samples}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </>
  );
}

/* ── Main Component ────────────────────────────────────────────────────── */
export default function Explainability() {
  const { predictionId } = useParams();
  const navigate = useNavigate();
  const [shap, setShap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState(predictionId ? 'prediction' : 'summary');
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  const [recentPredictions, setRecentPredictions] = useState([]);

  useEffect(() => {
    predictionAPI.getHistory(0, 50)
      .then(r => setRecentPredictions(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!predictionId) { setLoading(false); return; }
    setTab('prediction');
    setLoading(true);
    shapAPI.getExplanation(predictionId)
      .then(r => setShap(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load SHAP explanation'))
      .finally(() => setLoading(false));
  }, [predictionId]);

  const tabs = [
    { key: 'summary', label: <><BarChart3 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Global Summary</>, show: true },
    { key: 'prediction', label: <><Search size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Prediction Detail</>, show: true },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'rgba(139,92,246,0.2)', borderRadius: 10, padding: '4px 10px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center' }}><Search size={16} /></span>
            SHAP Explainability
          </h1>
          <p>{tab === 'summary' ? 'Global feature importance aggregated across predictions' : `Prediction #${predictionId} — per-feature contribution to churn probability`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!predictionId && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/predict')}>
              Make a Prediction
            </button>
          )}
          {predictionId && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.filter(t => t.show).map(t => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === 'summary') setSummaryRefreshKey(k => k + 1);
              setTab(t.key);
            }}
            style={{
              padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: tab === t.key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
              color: tab === t.key ? '#a78bfa' : '#94a3b8',
              fontWeight: tab === t.key ? 700 : 500, fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {tab === 'summary' && <ShapSummaryTab refreshKey={summaryRefreshKey} />}

      {/* Prediction Detail Tab */}
      {tab === 'prediction' && (
        <>
          {!predictionId && (
            <div className="glass-card animate-fade-in-up" style={{ padding: 40 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ marginBottom: 12, display: 'inline-flex', background: 'rgba(139,92,246,0.1)', padding: 12, borderRadius: '50%', color: '#a78bfa' }}>
                  <Search size={32} />
                </div>
                <h3 style={{ color: '#e2e8f0', marginBottom: 8 }}>Select a Customer Prediction</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Choose a prediction from your history to view its local SHAP explanation.</p>
              </div>

              <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {recentPredictions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '16px 0' }}>
                    <p>No predictions found in history.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/predict')} style={{ marginTop: 12 }}>
                      Make your first prediction
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      className="form-select"
                      value=""
                      onChange={e => {
                        if (e.target.value) {
                          navigate(`/explainability/${e.target.value}`);
                        }
                      }}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <option value="">— Choose a prediction to explain —</option>
                      {recentPredictions.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.id} · [{(p.industry || 'telecom').toUpperCase()}] · {p.risk_level} Risk · {(p.churn_probability * 100).toFixed(1)}% · {p.contract || 'N/A'}
                        </option>
                      ))}
                    </select>
                    
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                      Or go to the <a href="#" onClick={(e) => { e.preventDefault(); navigate('/predict'); }} style={{ color: '#a78bfa', textDecoration: 'underline' }}>Churn Prediction Suite</a> to run a new simulation.
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {predictionId && loading && (
            <div className="loading-container">
              <div className="spinner" />
              <p className="loading-text">Computing SHAP values...</p>
            </div>
          )}

          {predictionId && error && (
            <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><AlertTriangle size={16} /> {error}</p>
              <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
                ← Back
              </button>
            </div>
          )}

          {predictionId && shap && !loading && !error && (() => {
            const features = shap?.feature_contributions || [];
            const displayed = showAll ? features : features.slice(0, 12);
            const prob = shap?.predicted_probability || 0;
            const pct = Math.round(prob * 100);
            const riskColor = pct >= 70 ? C.positive : pct >= 40 ? '#f59e0b' : C.negative;
            const riskLabel = pct >= 70 ? 'High Risk' : pct >= 40 ? 'Medium Risk' : 'Low Risk';

            const waterfallData = features.slice(0, 10).map(f => ({
              ...f,
              display_value: f.shap_value,
              fill: f.shap_value > 0 ? C.positive : C.negative,
            }));

            return (
              <>
                {/* Top row: Gauge + Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, marginBottom: 24 }}>
                  <div className="glass-card animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <RiskGauge probability={prob} />
                    <div style={{
                      background: `${riskColor}22`, color: riskColor,
                      border: `1px solid ${riskColor}44`,
                      borderRadius: 20, padding: '4px 16px', fontSize: '0.85rem', fontWeight: 700, marginTop: 8
                    }}>
                      {riskLabel}
                    </div>
                    {shap?.cached && (
                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><Zap size={12} /> Cached result</p>
                    )}
                    {shap?.approximate && (
                      <span style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Zap size={12} /> Approximate</span>
                    )}
                  </div>

                  <div className="glass-card animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'center' }}>
                    {[
                      { label: 'Base Probability', value: `${((shap?.base_value || 0) * 100).toFixed(1)}%`, color: '#8b5cf6', note: 'Expected output (baseline)' },
                      { label: 'SHAP Contribution', value: `${((shap?.shap_sum || 0) * 100) > 0 ? '+' : ''}${((shap?.shap_sum || 0) * 100).toFixed(1)}%`, color: (shap?.shap_sum || 0) > 0 ? C.positive : C.negative, note: 'Net feature push' },
                      { label: 'Final Probability', value: `${pct}%`, color: riskColor, note: 'base + SHAP sum' },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 600 }}>{s.label}</div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{s.note}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Waterfall Chart */}
                <div className="glass-card animate-fade-in-up" style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ color: '#e2e8f0', margin: 0 }}>SHAP Waterfall — Top 10 Features</h3>
                      <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>Positive (red) = increases churn risk · Negative (green) = reduces churn risk</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: C.positive }}>
                        <span style={{ width: 12, height: 12, background: C.positive, borderRadius: 3, display: 'inline-block' }} /> Increases Risk
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: C.negative }}>
                        <span style={{ width: 12, height: 12, background: C.negative, borderRadius: 3, display: 'inline-block' }} /> Reduces Risk
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={waterfallData} layout="vertical" margin={{ left: 20, right: 40, top: 0, bottom: 0 }}>
                      <XAxis type="number" tickFormatter={v => `${(v * 100).toFixed(1)}%`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="feature" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
                      <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                      <Tooltip content={<TIP />} />
                      <Bar dataKey="display_value" radius={[0, 4, 4, 0]} animationDuration={800}>
                        {waterfallData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Feature Contribution Table */}
                <div className="glass-card animate-fade-in-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ color: '#e2e8f0', margin: 0 }}>Full Feature Breakdown</h3>
                    <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{features.length} features</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          {['Rank', 'Feature', 'Raw Value', 'SHAP Value', 'Impact', 'Direction'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayed.map((f, i) => {
                          const impact = (f.abs_shap * 100).toFixed(2);
                          const maxShap = features[0]?.abs_shap || 1;
                          const barW = Math.round((f.abs_shap / maxShap) * 100);
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>#{i + 1}</td>
                              <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 600 }}>{f.feature}</td>
                              <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{f.raw_value}</td>
                              <td style={{ padding: '8px 12px', color: f.shap_value > 0 ? C.positive : C.negative, fontWeight: 700 }}>
                                {f.shap_value > 0 ? '+' : ''}{(f.shap_value * 100).toFixed(3)}%
                              </td>
                              <td style={{ padding: '8px 12px', minWidth: 120 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <div style={{ width: `${barW}%`, height: '100%', background: f.shap_value > 0 ? C.positive : C.negative, borderRadius: 3 }} />
                                  </div>
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{impact}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                                  background: f.direction === 'increases_churn' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                                  color: f.direction === 'increases_churn' ? C.positive : C.negative,
                                }}>
                                  {f.direction === 'increases_churn' ? '▲ Risk Up' : '▼ Risk Down'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {features.length > 12 && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 16 }}
                      onClick={() => setShowAll(p => !p)}
                    >
                      {showAll ? 'Show Less ▲' : `Show All ${features.length} Features ▼`}
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
