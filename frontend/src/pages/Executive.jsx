import { useState, useEffect } from 'react';
import { executiveAPI } from '../services/api';
import { TrendingUp, BarChart3, Landmark, ShoppingBag, HeartPulse, Sparkles, ClipboardList, Target, AlertTriangle, Gem } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';

const C = { violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', emerald: '#10b981', cyan: '#06b6d4', slate: '#64748b' };

const INSIGHT_STYLES = {
  danger:  { bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.3)', color: '#f43f5e' },
  warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b' },
  success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#10b981' },
  info:    { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', color: '#06b6d4' },
  action:  { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', color: '#8b5cf6' },
};

function KPICard({ label, value, sub, color, icon }) {
  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', flexShrink: 0
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>{label}</div>
          <div style={{ color, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
          {sub && <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }) {
  const s = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.info;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>{insight.icon}</span>
      <div>
        <div style={{ color: s.color, fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>{insight.title}</div>
        <div style={{ color: '#cbd5e1', fontSize: '0.8rem', lineHeight: 1.5 }}>{insight.text}</div>
      </div>
    </div>
  );
}

export default function Executive() {
  const { format } = useCurrency();
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [aiInsights, setAIInsights] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState('telecom');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState('');

  useEffect(() => {
    setLoading(true);
    setAIInsights(null);
    setAIError('');
    Promise.all([
      executiveAPI.getSummary(selectedIndustry).catch(() => ({ data: null })),
      executiveAPI.getInsights(selectedIndustry).catch(() => ({ data: { insights: [] } })),
    ]).then(([sumR, insR]) => {
      setSummary(sumR.data);
      setInsights(insR.data?.insights || []);
    }).finally(() => setLoading(false));
  }, [selectedIndustry]);

  const handleAIInsights = async () => {
    setAILoading(true);
    setAIError('');
    setAIInsights(null);
    try {
      const r = await executiveAPI.getAIInsights(selectedIndustry);
      setAIInsights(r.data);
    } catch (e) {
      setAIError(e.response?.data?.detail || 'AI insights unavailable');
    } finally {
      setAILoading(false);
    }
  };

  if (loading) return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>📊 Executive Insights Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Portfolio-level KPIs and strategic business intelligence</p>
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
      <div className="loading-container"><div className="spinner" /><p className="loading-text">Loading executive dashboard...</p></div>
    </div>
  );

  const s = summary || {};
  const trend = s.monthly_trend || [];
  const segments = s.segment_performance || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>📊 Executive Insights Dashboard</h1>
          <p>Portfolio-level KPIs and strategic business intelligence</p>
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

      {!summary || s.total_predictions === 0 ? (
        <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
          <h3 style={{ color: '#e2e8f0' }}>No Data Yet</h3>
          <p style={{ color: '#94a3b8' }}>Make predictions to see executive insights populate here.</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="stats-grid animate-fade-in-up" style={{ marginBottom: 24 }}>
            <KPICard label="Total Analyzed" value={s.total_predictions} icon="📋" color={C.violet} />
            <KPICard label="Churn Rate" value={`${s.churn_rate}%`} icon="📉" color={s.churn_rate > 30 ? C.rose : s.churn_rate > 15 ? C.amber : C.emerald} sub="of total predictions" />
            <KPICard label="Revenue at Risk" value={format(s.total_revenue_at_risk || 0, 0)} icon="💸" color={C.rose} sub="annual estimate" />
            <KPICard label="Avg Risk-Adj CLV" value={format(s.avg_risk_adjusted_clv || 0, 0)} icon="💎" color={C.violet} sub="per customer" />
            <KPICard label="High-Value at Risk" value={s.high_value_count || 0} icon="⚠️" color={C.amber} sub="top 20% CLV churning" />
            <KPICard label="High Risk" value={s.high_risk_count || 0} icon="🔴" color={C.rose} sub={`of ${s.total_predictions}`} />
          </div>

          {/* Two-column: Trend + Segments */}
          <div className="analytics-grid" style={{ marginBottom: 24 }}>
            {/* Trend line */}
            <div className="glass-card animate-fade-in-up">
              <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Monthly Churn Trend</h3>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 12 }}>Last 6 months of predictions</p>
              {trend.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', paddingTop: 40 }}>No trend data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8 }} labelStyle={{ color: '#a78bfa' }} itemStyle={{ color: '#cbd5e1' }} />
                    <Line type="monotone" dataKey="churn_rate" stroke={C.rose} strokeWidth={2} dot={{ fill: C.rose, r: 4 }} name="Churn Rate %" />
                    <Line type="monotone" dataKey="total" stroke={C.violet} strokeWidth={2} dot={{ fill: C.violet, r: 4 }} name="Total Predictions" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Segment performance */}
            <div className="glass-card animate-fade-in-up">
              <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Segment Performance</h3>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 12 }}>Revenue at risk by customer segment</p>
              {segments.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', paddingTop: 40 }}>Run segmentation to see performance by segment.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Segment', 'Customers', 'Churn Rate', 'Revenue at Risk'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', color: '#64748b', textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((seg, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '6px 10px', color: '#e2e8f0' }}>{seg.label}</td>
                          <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{seg.count}</td>
                          <td style={{ padding: '6px 10px', color: seg.churn_rate > 40 ? C.rose : seg.churn_rate > 20 ? C.amber : C.emerald, fontWeight: 700 }}>
                            {seg.churn_rate}%
                          </td>
                          <td style={{ padding: '6px 10px', color: C.rose }}>{format(seg.total_revenue_at_risk || 0, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Top churners */}
          {s.top_churners?.length > 0 && (
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#e2e8f0', marginBottom: 12 }}>🎯 Top 5 High-Value Customers at Risk</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Rank', 'Prediction #', 'Monthly', 'Tenure', 'Churn Prob', 'CLV Tier', 'Revenue at Risk'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', color: '#64748b', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.top_churners.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', color: '#f59e0b', fontWeight: 700 }}>#{i + 1}</td>
                        <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>#{c.prediction_id}</td>
                        <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{format(c.monthly_charges || 0)}</td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{c.tenure} mo</td>
                        <td style={{ padding: '8px 12px', color: C.rose, fontWeight: 700 }}>{((c.churn_probability || 0) * 100).toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px', color: c.tier_color || '#8b5cf6', fontWeight: 600 }}>{c.tier}</td>
                        <td style={{ padding: '8px 12px', color: C.rose }}>{format(c.revenue_at_risk || 0, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insights panel */}
          <div className="glass-card animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ color: '#e2e8f0', margin: 0 }}>🧠 Business Insights</h3>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>Rule-based instant insights — or generate AI narrative</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAIInsights} disabled={aiLoading}>
                {aiLoading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Generating...</> : '✨ Generate AI Insights'}
              </button>
            </div>

            {aiError && <p style={{ color: C.rose, fontSize: '0.82rem', marginBottom: 12 }}>⚠️ {aiError}</p>}

            {aiInsights && (
              <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.violet, fontWeight: 700, fontSize: '0.85rem' }}>✨ AI Executive Narrative</span>
                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{aiInsights.model_used}</span>
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '0.83rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiInsights.narrative}</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
