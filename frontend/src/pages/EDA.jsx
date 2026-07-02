import { useState, useEffect, useRef } from 'react';
import { edaAPI } from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

/* ─── Color palette ─── */
const CHART_COLORS = ['#667eea', '#f093fb', '#4facfe', '#00e676', '#ff6b6b', '#ff9800', '#a78bfa'];
const MODEL_COLORS = {
  random_forest:       '#667eea',
  gradient_boosting:   '#f093fb',
  xgboost:             '#4facfe',
  logistic_regression: '#00e676',
  decision_tree:       '#ff9800',
  svm:                 '#ff6b6b',
  knn:                 '#a78bfa',
};

/* ─── Helpers ─── */
const corr2Color = (v) => {
  const abs = Math.abs(v);
  const alpha = Math.min(abs * 1.2, 1);
  if (v > 0) return `rgba(102,126,234,${alpha})`;
  if (v < 0) return `rgba(255,107,107,${alpha})`;
  return 'rgba(255,255,255,0.05)';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'rgba(15,20,40,0.97)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem',
      }}>
        <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color || e.fill, margin: 0 }}>
            {e.name}: {typeof e.value === 'number' ? e.value.toFixed(2) : e.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ─── Correlation Heatmap ─── */
function CorrelationHeatmap({ data }) {
  const [hovered, setHovered] = useState(null);
  if (!data?.columns?.length) return null;

  const cols = data.columns;
  const cellMap = {};
  data.data.forEach(({ row, col, value }) => { cellMap[`${row}__${col}`] = value; });
  const cellSize = Math.max(22, Math.min(36, Math.floor(580 / cols.length)));
  const fontSize = Math.max(8, cellSize * 0.32);

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520 }}>
      <div style={{ position: 'relative', width: cols.length * cellSize + 120, paddingLeft: 110, paddingTop: 4 }}>
        {/* Column headers */}
        <div style={{ display: 'flex', marginLeft: 0, marginBottom: 2 }}>
          {cols.map((c) => (
            <div key={c} style={{
              width: cellSize, fontSize, color: '#94a3b8',
              textAlign: 'center', overflow: 'hidden',
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {c}
            </div>
          ))}
        </div>

        {/* Rows */}
        {cols.map((row) => (
          <div key={row} style={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
            {/* Row label */}
            <div style={{
              width: 108, fontSize, color: '#94a3b8',
              textAlign: 'right', paddingRight: 6, flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {row}
            </div>
            {cols.map((col) => {
              const val = cellMap[`${row}__${col}`] ?? 0;
              const key = `${row}__${col}`;
              return (
                <div
                  key={col}
                  title={`${row} × ${col}: ${val.toFixed(3)}`}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: cellSize, height: cellSize,
                    background: corr2Color(val),
                    border: hovered === key ? '2px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.04)',
                    borderRadius: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: cellSize > 28 ? fontSize : 0,
                    color: Math.abs(val) > 0.5 ? '#fff' : '#94a3b8',
                    cursor: 'default',
                    transition: 'border 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {cellSize > 28 ? val.toFixed(1) : ''}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingLeft: 0 }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>-1.0</span>
          <div style={{
            height: 12, width: 180, borderRadius: 4,
            background: 'linear-gradient(to right, rgba(255,107,107,1), rgba(255,255,255,0.05), rgba(102,126,234,1))',
          }} />
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>+1.0</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Model Benchmark Table ─── */
function ModelBenchmark({ models }) {
  if (!models?.length) return null;
  const best = Math.max(...models.map(m => m.accuracy));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Rank', 'Model', 'Accuracy', 'F1-Score', 'ROC-AUC', 'Status'].map(h => (
              <th key={h} style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => {
            const color = MODEL_COLORS[m.model] || CHART_COLORS[i % CHART_COLORS.length];
            const isTop = m.accuracy === best;
            return (
              <tr key={m.model} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: isTop ? 'rgba(102,126,234,0.06)' : 'transparent',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = isTop ? 'rgba(102,126,234,0.06)' : 'transparent'}
              >
                <td style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>
                  {i === 0 ? '✦' : i === 1 ? '◈' : i === 2 ? '◎' : `#${i + 1}`}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: '#e2e8f0', fontWeight: isTop ? 700 : 400 }}>{m.display_name}</span>
                    {isTop && <span style={{ fontSize: '0.68rem', background: 'rgba(102,126,234,0.2)', color: '#818cf8', padding: '1px 6px', borderRadius: 4 }}>Best</span>}
                  </div>
                </td>
                {/* Accuracy bar */}
                {[{ v: m.accuracy }, { v: m.f1_score }, { v: m.roc_auc }].map(({ v }, ci) => (
                  <td key={ci} style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        height: 6, width: 80, borderRadius: 3,
                        background: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${v * 100}%`,
                          background: color, borderRadius: 3,
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                      <span style={{ color: '#e2e8f0', minWidth: 40 }}>{(v * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                ))}
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem',
                    background: m.available ? 'rgba(0,230,118,0.12)' : 'rgba(255,107,107,0.12)',
                    color: m.available ? '#00e676' : '#ff6b6b',
                  }}>
                    {m.available ? '✓ Ready' : '✗ Not trained'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Churn Correlation Bar ─── */
function ChurnCorrelationChart({ correlations }) {
  if (!correlations?.length) return null;
  const top = correlations.slice(0, 12).map(c => ({
    feature: c.feature,
    value: parseFloat(c.correlation.toFixed(3)),
    abs: Math.abs(c.correlation),
    fill: c.correlation > 0 ? '#ff6b6b' : '#667eea',
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={top} layout="vertical" margin={{ left: 10, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis type="number" domain={[-0.5, 0.5]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1)} />
        <YAxis type="category" dataKey="feature" tick={{ fill: '#e2e8f0', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" name="Correlation with Churn" radius={[0, 4, 4, 0]}>
          {top.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Main EDA Page ─── */
export default function EDA() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [correlationData, setCorrelationData] = useState(null);
  const [churnDist, setChurnDist] = useState(null);
  const [modelComparison, setModelComparison] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [infoRes, corrRes, distRes, compRes] = await Promise.allSettled([
        edaAPI.getDatasetInfo(),
        edaAPI.getCorrelation(),
        edaAPI.getChurnDistribution(),
        edaAPI.getModelComparison(),
      ]);
      if (infoRes.status === 'fulfilled') setDatasetInfo(infoRes.value.data);
      if (corrRes.status === 'fulfilled') setCorrelationData(corrRes.value.data);
      if (distRes.status === 'fulfilled') setChurnDist(distRes.value.data);
      if (compRes.status === 'fulfilled') setModelComparison(compRes.value.data);
      if (infoRes.status === 'rejected') setError('EDA data unavailable — retrain models first.');
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: 'overview',      label: '◈  Overview' },
    { id: 'correlation',   label: '⬡  Correlations' },
    { id: 'distributions', label: '∿  Distributions' },
    { id: 'models',        label: '◎  Model Benchmark' },
  ];

  if (loading) return (
    <div className="page-container">
      <div className="loading-container">
        <div className="spinner" />
        <p className="loading-text">Loading EDA data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-container">
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ff6b6b' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>✦</div>
        <h2 style={{ color: '#e2e8f0' }}>EDA Data Not Available</h2>
        <p style={{ color: '#94a3b8', maxWidth: 420, margin: '12px auto' }}>
          Run the model training pipeline first to generate EDA statistics.
        </p>
        <code style={{
          display: 'block', background: 'rgba(255,255,255,0.06)',
          padding: '10px 20px', borderRadius: 8, marginTop: 16,
          color: '#818cf8', fontSize: '0.85rem',
        }}>
          python -m app.ml.train_model
        </code>
      </div>
    </div>
  );

  /* ── Donut chart data ── */
  const donutData = datasetInfo ? [
    { name: 'Churned', value: datasetInfo.churn_distribution?.churned || 0, fill: '#ff6b6b' },
    { name: 'Retained', value: datasetInfo.churn_distribution?.not_churned || 0, fill: '#667eea' },
  ] : [];

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="page-header animate-fade-in">
        <div>
          <h1>Data Explorer</h1>
          <p>Exploratory data analysis — correlations, distributions &amp; model benchmarking</p>
        </div>
        {datasetInfo && (
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem',
              background: datasetInfo.dataset_source.includes('real')
                ? 'rgba(0,230,118,0.15)' : 'rgba(102,126,234,0.15)',
              color: datasetInfo.dataset_source.includes('real') ? '#00e676' : '#818cf8',
              border: '1px solid',
              borderColor: datasetInfo.dataset_source.includes('real')
                ? 'rgba(0,230,118,0.3)' : 'rgba(102,126,234,0.3)',
              fontWeight: 600,
            }}>
              {datasetInfo.dataset_source === 'real+synthetic' ? '⟳ Real + Synthetic'
                : datasetInfo.dataset_source === 'real' ? '◈ Real Dataset'
                : '⊕ Synthetic Dataset'}
            </span>
            <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
              {datasetInfo.total_records?.toLocaleString()} records
            </span>
            <span style={{ color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 600 }}>
              {datasetInfo.churn_rate}% churn rate
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem',
              background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600,
            }}>
              ◎ {datasetInfo.total_models} models trained
            </span>
          </div>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div className="eda-tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`eda-tab-btn ${tab === t.id ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
      {tab === 'overview' && (
        <div key="overview" className="analytics-grid stagger-children tab-content-animate">
          {/* Churn Donut */}
          <div className="glass-card animate-fade-in-up">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Churn Distribution</h3>
                <p className="chart-subtitle">Overall churn vs. retained customers</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={donutData} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={4} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  labelLine={{ stroke: '#94a3b8' }}
                >
                  {donutData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div style={{ textAlign: 'center', marginTop: -8 }}>
              <span style={{ color: '#ff6b6b', fontSize: '1.5rem', fontWeight: 700 }}>
                {datasetInfo?.churn_rate}%
              </span>
              <p style={{ color: '#64748b', fontSize: '0.78rem', margin: 0 }}>Overall Churn Rate</p>
            </div>
          </div>

          {/* Churn by Contract */}
          {churnDist?.by_contract && (
            <div className="glass-card animate-fade-in-up">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Churn by Contract Type</h3>
                  <p className="chart-subtitle">Month-to-month is the highest risk</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnDist.by_contract}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="contract" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Bar dataKey="total" name="Total" fill="#667eea" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="churned" name="Churned" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Churn by Internet */}
          {churnDist?.by_internet && (
            <div className="glass-card animate-fade-in-up">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Churn by Internet Service</h3>
                  <p className="chart-subtitle">Fiber optic users churn most</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnDist.by_internet}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="service" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Bar dataKey="total" name="Total" fill="#4facfe" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="churned" name="Churned" fill="#f093fb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Churn by Payment */}
          {churnDist?.by_payment && (
            <div className="glass-card animate-fade-in-up">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Churn by Payment Method</h3>
                  <p className="chart-subtitle">Electronic check has highest churn</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnDist.by_payment} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="method" tick={{ fill: '#e2e8f0', fontSize: 10 }} axisLine={false} tickLine={false} width={145} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="churnRate" name="Churn Rate %" fill="#ff9800" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ CORRELATION TAB ══════════════════ */}
      {tab === 'correlation' && (
        <div key="correlation" style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="tab-content-animate">
          {/* Heatmap */}
          <div className="glass-card analytics-full animate-fade-in-up">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Feature Correlation Heatmap</h3>
                <p className="chart-subtitle">
                  Pairwise correlation of all 19 features + Churn target.
                  Blue = positive correlation, Red = negative.
                </p>
              </div>
            </div>
            <CorrelationHeatmap data={correlationData} />
          </div>

          {/* Correlation with Churn bar */}
          <div className="glass-card analytics-full animate-fade-in-up">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Feature Correlation with Churn</h3>
                <p className="chart-subtitle">
                  Red bars indicate features that increase churn risk. Blue bars decrease it.
                </p>
              </div>
            </div>
            <ChurnCorrelationChart correlations={correlationData?.churn_correlations} />
          </div>
        </div>
      )}

      {/* ══════════════════ DISTRIBUTIONS TAB ══════════════════ */}
      {tab === 'distributions' && (
        <div key="distributions" className="analytics-grid stagger-children tab-content-animate">
          {/* Tenure distribution */}
          {churnDist?.by_tenure && (
            <div className="glass-card animate-fade-in-up">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Tenure vs. Churn</h3>
                  <p className="chart-subtitle">Churn by customer tenure (months)</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnDist.by_tenure}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                    label={{ value: 'Months', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Bar dataKey="total" name="Total" fill="#4facfe" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="churned" name="Churned" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly charges distribution */}
          {churnDist?.by_charges && (
            <div className="glass-card animate-fade-in-up">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Monthly Charges vs. Churn</h3>
                  <p className="chart-subtitle">Higher charges correlate with higher churn</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnDist.by_charges}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Bar dataKey="total" name="Total" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="churned" name="Churned" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Churn rate by tenure (line-style bar) */}
          {churnDist?.by_tenure && (
            <div className="glass-card animate-fade-in-up">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Churn Rate % by Tenure Band</h3>
                  <p className="chart-subtitle">New customers churn far more</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnDist.by_tenure}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, 'Churn Rate']} />
                  <Bar dataKey="churnRate" name="Churn Rate %" fill="#f093fb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Senior citizen */}
          {churnDist?.by_senior && (
            <div className="glass-card animate-fade-in-up">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Senior Citizens vs. Churn</h3>
                  <p className="chart-subtitle">Age group impact on churn rate</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnDist.by_senior}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, 'Churn Rate']} />
                  <Bar dataKey="churnRate" name="Churn Rate %" radius={[6, 6, 0, 0]}>
                    {churnDist.by_senior.map((_, i) => (
                      <Cell key={i} fill={['#ff9800', '#4facfe'][i % 2]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ MODEL BENCHMARK TAB ══════════════════ */}
      {tab === 'models' && modelComparison && (
        <div key="models" style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="tab-content-animate">
          {/* Summary KPIs */}
          <div className="stats-grid stagger-children">
            <div className="stat-card blue">
              <div className="stat-card-header"><span className="stat-card-label">Models Trained</span></div>
              <div className="stat-card-value">{modelComparison.total_trained}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-card-header"><span className="stat-card-label">Best Accuracy</span></div>
              <div className="stat-card-value">{modelComparison.best_model
                ? `${(modelComparison.best_model.accuracy * 100).toFixed(1)}%` : '—'}</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-card-header"><span className="stat-card-label">Best Model</span></div>
              <div className="stat-card-value" style={{ fontSize: '1rem' }}>
                {modelComparison.best_model?.display_name || '—'}
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-card-header"><span className="stat-card-label">Best F1 Score</span></div>
              <div className="stat-card-value">
                {modelComparison.models?.length
                  ? `${(Math.max(...modelComparison.models.map(m => m.f1_score)) * 100).toFixed(1)}%`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Benchmark Table */}
          <div className="glass-card analytics-full animate-fade-in-up">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">All Model Performance Comparison</h3>
                <p className="chart-subtitle">7 algorithms ranked by accuracy — trained with SMOTE balancing</p>
              </div>
            </div>
            <ModelBenchmark models={modelComparison.models} />
          </div>

          {/* Radar chart comparison */}
          {modelComparison.models?.length >= 3 && (
            <div className="glass-card analytics-full animate-fade-in-up">
              <div className="chart-header">
                <div>
                  <h3 className="chart-title">Multi-Metric Radar</h3>
                  <p className="chart-subtitle">Accuracy, F1, and ROC-AUC across all models</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={380}>
                <RadarChart
                  data={[
                    { metric: 'Accuracy', ...Object.fromEntries(modelComparison.models.map(m => [m.display_name, +(m.accuracy * 100).toFixed(1)])) },
                    { metric: 'F1 Score', ...Object.fromEntries(modelComparison.models.map(m => [m.display_name, +(m.f1_score * 100).toFixed(1)])) },
                    { metric: 'ROC-AUC',  ...Object.fromEntries(modelComparison.models.map(m => [m.display_name, +(m.roc_auc * 100).toFixed(1)])) },
                  ]}
                >
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 13 }} />
                  <PolarRadiusAxis angle={90} domain={[50, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  {modelComparison.models.map((m, i) => (
                    <Radar
                      key={m.model}
                      name={m.display_name}
                      dataKey={m.display_name}
                      stroke={MODEL_COLORS[m.model] || CHART_COLORS[i % CHART_COLORS.length]}
                      fill={MODEL_COLORS[m.model] || CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.08}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Accuracy bar chart */}
          <div className="glass-card analytics-full animate-fade-in-up">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Accuracy Comparison</h3>
                <p className="chart-subtitle">Side-by-side accuracy of all 7 algorithms</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={modelComparison.models?.map(m => ({
                  name: m.display_name.replace(' ', '\n'),
                  Accuracy: +(m.accuracy * 100).toFixed(1),
                  'F1 Score': +(m.f1_score * 100).toFixed(1),
                  'ROC-AUC': +(m.roc_auc * 100).toFixed(1),
                }))}
                margin={{ bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[50, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} formatter={v => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <Bar dataKey="Accuracy" fill="#667eea" radius={[4, 4, 0, 0]} />
                <Bar dataKey="F1 Score" fill="#f093fb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ROC-AUC" fill="#4facfe" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
