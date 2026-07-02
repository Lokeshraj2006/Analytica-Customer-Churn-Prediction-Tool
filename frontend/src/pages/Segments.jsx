import { useState, useEffect } from 'react';
import { segmentAPI } from '../services/api';
import { Users } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';

const SEGMENT_COLORS = ['#f43f5e', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4', '#ec4899'];

const TIP = ({ active, payload }) => {
  const { format } = useCurrency();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem' }}>
      <p style={{ color: d.segment_color || '#a78bfa', fontWeight: 700, margin: '0 0 4px' }}>{d.segment_label || 'Unknown'}</p>
      <p style={{ color: '#cbd5e1', margin: 0 }}>Churn Prob: <b>{(d.churn_probability * 100).toFixed(1)}%</b></p>
      <p style={{ color: '#cbd5e1', margin: 0 }}>Monthly: <b>{format(d.monthly_charges || 0)}</b></p>
      <p style={{ color: '#94a3b8', margin: 0 }}>Tenure: {d.tenure} mo</p>
    </div>
  );
};

function SegmentCard({ segment, selected, onClick }) {
  const color = segment.color || '#8b5cf6';
  const { format } = useCurrency();
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? `${color}22` : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${selected ? color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{segment.icon || '👤'}</div>
          <div style={{ color: color, fontWeight: 800, fontSize: '0.95rem' }}>{segment.label}</div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>{segment.description}</div>
        </div>
        <div style={{ background: `${color}22`, borderRadius: 20, padding: '4px 10px', color, fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {segment.size_pct}%
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Customers', value: segment.size },
          { label: 'Churn Rate', value: `${segment.churn_rate}%`, color: segment.churn_rate > 40 ? '#f43f5e' : segment.churn_rate > 20 ? '#f59e0b' : '#10b981' },
          { label: 'Avg Charges', value: format(segment.avg_monthly_charges || 0, 0) },
          { label: 'Avg Tenure', value: `${segment.avg_tenure?.toFixed(0)} mo` },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px' }}>
            <div style={{ color: s.color || '#e2e8f0', fontWeight: 700, fontSize: '0.88rem' }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{s.label}</div>
          </div>
        ))}
      </div>
      {segment.estimated_monthly_revenue != null && (
        <div style={{ marginTop: 10, color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>
          💰 {format(segment.estimated_monthly_revenue || 0, 0)}/mo revenue
        </div>
      )}
    </div>
  );
}

export default function Segments() {
  const [data, setData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('telecom');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [nClusters, setNClusters] = useState(4);
  const [selectedSeg, setSelectedSeg] = useState(null);

  const loadData = async (indVal = selectedIndustry) => {
    setLoading(true);
    try {
      const [sumR, custR] = await Promise.all([
        segmentAPI.getSummary(indVal).catch(() => ({ data: null })),
        segmentAPI.getCustomers(null, indVal).catch(() => ({ data: [] })),
      ]);
      if (sumR.data && sumR.data.segments?.length > 0) {
        setData(sumR.data);
      } else {
        setData(null);
      }
      setCustomers(custR.data || []);
      setSelectedSeg(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedIndustry);
  }, [selectedIndustry]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const r = await segmentAPI.run(nClusters, selectedIndustry);
      setData(r.data);
      await loadData(selectedIndustry);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const segments = data?.segments || [];
  const filteredCustomers = selectedSeg
    ? customers.filter(c => c.segment_label === selectedSeg)
    : customers;

  // Scatter data grouped by segment
  const scatterBySeg = {};
  customers.forEach(c => {
    const label = c.segment_label || 'Unassigned';
    if (!scatterBySeg[label]) scatterBySeg[label] = [];
    scatterBySeg[label].push(c);
  });
  const segEntries = Object.entries(scatterBySeg);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1><Users className="inline-block mr-2 text-violet-400" size={24} /> Customer Segmentation</h1>
          <p>K-Means clustering to identify customer archetypes and target retention strategies</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>Industry:</span>
            <select
              className="form-select"
              value={selectedIndustry}
              onChange={e => setSelectedIndustry(e.target.value)}
              style={{ width: 140, background: 'rgba(255,255,255,0.03)' }}
            >
              <option value="telecom">📡 Telecom</option>
              <option value="banking">🏦 Banking</option>
              <option value="ecommerce">🛍️ E-commerce</option>
              <option value="healthcare">🩺 Healthcare</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <select className="form-select" value={nClusters} onChange={e => setNClusters(parseInt(e.target.value))} style={{ width: 120 }}>
              {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Segments</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleRun} disabled={running}>
            {running ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Clustering...</> : '▶ Run Segmentation'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p className="loading-text">Loading segments...</p></div>
      ) : !data || segments.length === 0 ? (
        <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>👥</div>
          <h3 style={{ color: '#e2e8f0' }}>No Segmentation Run Yet</h3>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>Run segmentation to discover customer archetypes in your prediction data.</p>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>You need at least 2 predictions. Make predictions first, then click "Run Segmentation".</p>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Customers', value: data.total_customers || 0, color: '#8b5cf6' },
              { label: 'Segments Found', value: data.n_clusters || segments.length, color: '#06b6d4' },
              { label: 'Inertia Score', value: (data.inertia || 0).toFixed(0), color: '#f59e0b', note: 'lower = tighter clusters' },
              { label: 'Unassigned', value: customers.filter(c => !c.segment_label || c.segment_label === 'Unassigned').length, color: '#64748b' },
            ].map((s, i) => (
              <div key={i} className="glass-card" style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>{s.label}</div>
                {s.note && <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{s.note}</div>}
              </div>
            ))}
          </div>

          {/* Scatter plot + Segment cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Scatter */}
            <div className="glass-card animate-fade-in-up">
              <h3 style={{ color: '#e2e8f0', marginBottom: 4 }}>Cluster Visualization</h3>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 12 }}>Tenure vs Monthly Charges, colored by segment</p>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                  <XAxis dataKey="tenure" name="Tenure" label={{ value: 'Tenure (months)', position: 'insideBottom', fill: '#64748b', fontSize: 11, offset: -5 }} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis dataKey="monthly_charges" name="Monthly $" label={{ value: '$/mo', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<TIP />} />
                  {segEntries.map(([label, pts], idx) => {
                    const seg = segments.find(s => s.label === label);
                    const color = seg?.color || SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                    return (
                      <Scatter
                        key={label} name={label} data={pts.slice(0, 200)}
                        fill={color} fillOpacity={0.7} r={5}
                        onClick={() => setSelectedSeg(label === selectedSeg ? null : label)}
                      />
                    );
                  })}
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Segment cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
              {segments.map((seg, i) => (
                <SegmentCard
                  key={i} segment={seg}
                  selected={selectedSeg === seg.label}
                  onClick={() => setSelectedSeg(selectedSeg === seg.label ? null : seg.label)}
                />
              ))}
            </div>
          </div>

          {/* Customer table */}
          <div className="glass-card animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#e2e8f0', margin: 0 }}>
                {selectedSeg ? `${selectedSeg} Customers` : 'All Segmented Customers'}
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selectedSeg && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSeg(null)}>Clear Filter</button>
                )}
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{filteredCustomers.length} customers</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['#', 'Segment', 'Churn Prob', 'Monthly', 'Tenure', 'Risk', 'Prediction'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', color: '#64748b', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.slice(0, 50).map((c, i) => {
                    const seg = segments.find(s => s.label === c.segment_label);
                    const color = seg?.color || '#64748b';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>#{c.prediction_id}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color, fontWeight: 600, fontSize: '0.8rem' }}>{c.segment_label || 'Unassigned'}</span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{((c.churn_probability || 0) * 100).toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>${c.monthly_charges?.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{c.tenure} mo</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                            background: c.risk_level === 'High' ? 'rgba(244,63,94,0.15)' : c.risk_level === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                            color: c.risk_level === 'High' ? '#f43f5e' : c.risk_level === 'Medium' ? '#f59e0b' : '#10b981',
                          }}>{c.risk_level}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color: c.churn_prediction === 1 ? '#f43f5e' : '#10b981', fontSize: '0.78rem' }}>
                            {c.churn_prediction === 1 ? '▲ Churn' : '✓ Stay'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
