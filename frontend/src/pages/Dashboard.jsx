import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictionAPI } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineCurrencyDollar,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt,
  HiOutlineUsers,
  HiOutlineLightBulb,
  HiOutlineDocumentReport,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import '../styles/dashboard.css';

/* ── Colour palette ────────────────────────────────────────── */
const C = {
  violet:  '#8b5cf6',
  rose:    '#f43f5e',
  amber:   '#f59e0b',
  emerald: '#10b981',
  cyan:    '#06b6d4',
};

/* ── Tiny sparkline seed ───────────────────────────────────── */
const mkSpark = (base, len = 7, jitter = 6) =>
  Array.from({ length: len }, (_, i) => ({
    i,
    v: Math.max(0, base + Math.sin(i * 0.9) * jitter + Math.random() * jitter * 0.5),
  }));

/* ── Animated counter ──────────────────────────────────────── */
const Counter = ({ value, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const target = parseFloat(value) || 0;
    const steps  = 40;
    const inc    = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setCount(target); clearInterval(t); }
      else setCount(cur);
    }, 22);
    return () => clearInterval(t);
  }, [value]);
  const disp = Number.isInteger(value) ? Math.round(count) : count.toFixed(1);
  return <span className="counter-value">{prefix}{disp}{suffix}</span>;
};

/* ── Sparkline chip ────────────────────────────────────────── */
const Spark = ({ data, color }) => (
  <ResponsiveContainer width={72} height={36}>
    <AreaChart data={data} margin={{ top: 3, bottom: 3, left: 0, right: 0 }}>
      <defs>
        <linearGradient id={`sg${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={color} stopOpacity={0.45} />
          <stop offset="95%" stopColor={color} stopOpacity={0}   />
        </linearGradient>
      </defs>
      <Area
        type="monotone" dataKey="v"
        stroke={color} strokeWidth={1.8}
        fill={`url(#sg${color.replace('#', '')})`}
        dot={false} isAnimationActive={false}
      />
    </AreaChart>
  </ResponsiveContainer>
);

/* ── Custom tooltip ────────────────────────────────────────── */
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="db2-tip">
      {label && <p className="db2-tip-label">{label}</p>}
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color, margin: 0, fontSize: '0.78rem' }}>
          {e.name}: {typeof e.value === 'number' ? e.value.toFixed(1) : e.value}
          {e.name?.toLowerCase().includes('rate') ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { convert, currentCurrency, format } = useCurrency();
  const { canPredict, isAdmin, isViewer }     = useAuth();
  const [stats,   setStats]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [sR, hR] = await Promise.all([
        predictionAPI.getStats().catch(() => ({ data: null })),
        predictionAPI.getHistory(0, 50).catch(() => ({ data: [] })),
      ]);
      setStats(sR.data);
      setHistory(hR.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived ──────────────────────────────────────────────── */
  const s = stats || {
    total_predictions: 0, churn_rate: 0, revenue_at_risk: 0,
    model_accuracy: 85.2, total_customers: 0,
    high_risk_count: 0, medium_risk_count: 0, low_risk_count: 0,
  };

  const sparkPreds  = mkSpark(s.total_predictions / 7, 7, 3);
  const sparkChurn  = mkSpark(s.churn_rate,            7, 4);
  const sparkRev    = mkSpark(s.revenue_at_risk / 500, 7, 12);
  const sparkAcc    = mkSpark(s.model_accuracy,        7, 1.5);
  const sparkHigh   = mkSpark(s.high_risk_count || 25, 7, 5);

  // Weekly trend
  const weekTrend = history.length >= 7
    ? history.slice(0, 7).reverse().map((p, i) => ({
        day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
        churnRate: +(p.churn_probability * 100).toFixed(1),
      }))
    : [
        { day: 'Mon', churnRate: 24 },
        { day: 'Tue', churnRate: 28 },
        { day: 'Wed', churnRate: 22 },
        { day: 'Thu', churnRate: 31 },
        { day: 'Fri', churnRate: 26 },
        { day: 'Sat', churnRate: 19 },
        { day: 'Sun', churnRate: 23 },
      ];

  // Risk donut
  const riskData = [
    { name: 'Low Risk',    value: s.low_risk_count    || 45, color: C.emerald },
    { name: 'Medium Risk', value: s.medium_risk_count || 30, color: C.amber   },
    { name: 'High Risk',   value: s.high_risk_count   || 25, color: C.rose    },
  ];
  const totalRisk = riskData.reduce((a, d) => a + d.value, 0);

  // Contract breakdown
  const cCounts = { 'Month-to-month': 0, 'One year': 0, 'Two year': 0 };
  history.forEach(p => { if (p.contract in cCounts) cCounts[p.contract]++; });
  const contractData = history.length > 0
    ? Object.entries(cCounts).map(([n, v]) => ({ name: n, value: v }))
    : [
        { name: 'Month-to-month', value: 55 },
        { name: 'One year',       value: 24 },
        { name: 'Two year',       value: 21 },
      ];
  const totalContracts = contractData.reduce((a, d) => a + d.value, 0);
  const contractColors = [C.rose, C.amber, C.emerald];

  // Payment method
  const payData = [
    { name: 'Electronic Check', value: 42.1, color: C.violet  },
    { name: 'Mailed Check',     value: 22.3, color: C.cyan    },
    { name: 'Bank Transfer',    value: 21.9, color: C.emerald },
    { name: 'Credit Card',      value: 13.7, color: C.amber   },
  ];

  // Retain vs Churn
  const churnPct  = s.churn_rate || 26.5;
  const retainPct = +(100 - churnPct).toFixed(1);
  const retainData = [
    { name: 'Retained', value: retainPct, color: C.emerald },
    { name: 'Churned',  value: churnPct,  color: C.rose    },
  ];

  // Funnel
  const totalC    = s.total_customers || totalRisk || 100;
  const atRisk    = Math.round(totalC * 0.38);
  const highRiskC = s.high_risk_count || Math.round(totalC * 0.25);
  const funnelData = [
    { label: 'Total Customers', value: totalC,                          color: C.violet  },
    { label: 'At Risk',         value: atRisk,    pct: +(atRisk / totalC * 100).toFixed(1),              color: C.amber   },
    { label: 'High Risk',       value: highRiskC, pct: atRisk ? +(highRiskC / atRisk * 100).toFixed(1) : 0, color: C.rose    },
    { label: 'Already Churned', value: Math.round(highRiskC * 0.62), pct: 62.0, color: '#7c3aed' },
  ];
  const maxF = funnelData[0].value || 1;

  // Heatmap
  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const slots = ['12AM','4AM','8AM','12PM','4PM','8PM'];
  const heat  = [
    [1,0,1,3,5,3],[2,1,2,4,6,4],[1,1,3,5,7,5],
    [2,1,3,6,8,5],[3,1,4,5,7,4],[4,2,3,3,4,3],[2,1,2,3,4,2],
  ];

  // Insights (using react-icon elements, not emojis)
  const insights = [
    { Icon: HiOutlineDocumentReport, text: 'Month-to-month contracts drive highest churn risk.', color: C.violet },
    { Icon: HiOutlineClock,          text: 'Peak prediction activity: Thu – Fri evenings.',      color: C.amber  },
    { Icon: HiOutlineCreditCard,     text: 'Electronic Check users churn at highest rate (42%).', color: C.cyan  },
    { Icon: HiOutlineCheckCircle,    text: `${retainPct}% of analysed customers are retained.`,  color: C.emerald},
  ];

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) return (
    <div className="page-container">
      <div className="loading-container">
        <div className="spinner" />
        <p className="loading-text">Loading dashboard…</p>
      </div>
    </div>
  );

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="page-container db2">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="db2-header animate-fade-in">
        <div>
          <h1 className="db2-title">Analytica Overview</h1>
          <p className="db2-sub">Smart insights. Proactive retention. Happier customers.</p>
        </div>
        <div className="db2-header-actions">
          {isViewer && (
            <span className="db2-viewer-badge">
              <HiOutlineExclamationCircle /> Viewer — Read-only
            </span>
          )}
          {canPredict && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/predict')}>
              <HiOutlineLightningBolt /> New Prediction
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin')}>
              <HiOutlineShieldCheck /> Admin Panel
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Row — 5 cards ──────────────────────────────── */}
      <div className="db2-kpi-row stagger-children">

        <div className="db2-kpi-card">
          <div className="db2-kpi-top">
            <div className="db2-kpi-icon" style={{ background: 'rgba(139,92,246,0.15)', color: C.violet }}>
              <HiOutlineLightningBolt />
            </div>
            <div className="db2-kpi-body">
              <span className="db2-kpi-label">Total Predictions</span>
              <div className="db2-kpi-value"><Counter value={s.total_predictions} /></div>
              <div className="db2-kpi-change pos"><HiOutlineTrendingUp /> All time</div>
            </div>
          </div>
          <div className="db2-kpi-spark"><Spark data={sparkPreds} color={C.violet} /></div>
        </div>

        <div className="db2-kpi-card">
          <div className="db2-kpi-top">
            <div className="db2-kpi-icon" style={{ background: 'rgba(244,63,94,0.15)', color: C.rose }}>
              <HiOutlineTrendingDown />
            </div>
            <div className="db2-kpi-body">
              <span className="db2-kpi-label">Churn Rate</span>
              <div className="db2-kpi-value"><Counter value={s.churn_rate} suffix="%" /></div>
              <div className="db2-kpi-change neg"><HiOutlineTrendingDown /> Predicted churn</div>
            </div>
          </div>
          <div className="db2-kpi-spark"><Spark data={sparkChurn} color={C.rose} /></div>
        </div>

        <div className="db2-kpi-card">
          <div className="db2-kpi-top">
            <div className="db2-kpi-icon" style={{ background: 'rgba(245,158,11,0.15)', color: C.amber }}>
              <HiOutlineCurrencyDollar />
            </div>
            <div className="db2-kpi-body">
              <span className="db2-kpi-label">Revenue at Risk</span>
              <div className="db2-kpi-value">
                <Counter value={convert(s.revenue_at_risk)} prefix={currentCurrency.symbol} />
              </div>
              <div className="db2-kpi-change neg">Annual projected</div>
            </div>
          </div>
          <div className="db2-kpi-spark"><Spark data={sparkRev} color={C.amber} /></div>
        </div>

        <div className="db2-kpi-card">
          <div className="db2-kpi-top">
            <div className="db2-kpi-icon" style={{ background: 'rgba(16,185,129,0.15)', color: C.emerald }}>
              <HiOutlineShieldCheck />
            </div>
            <div className="db2-kpi-body">
              <span className="db2-kpi-label">Model Accuracy</span>
              <div className="db2-kpi-value"><Counter value={s.model_accuracy || 85.2} suffix="%" /></div>
              <div className="db2-kpi-change pos"><HiOutlineTrendingUp /> Random Forest</div>
            </div>
          </div>
          <div className="db2-kpi-spark"><Spark data={sparkAcc} color={C.emerald} /></div>
        </div>

        <div className="db2-kpi-card">
          <div className="db2-kpi-top">
            <div className="db2-kpi-icon" style={{ background: 'rgba(244,63,94,0.12)', color: C.rose }}>
              <HiOutlineUsers />
            </div>
            <div className="db2-kpi-body">
              <span className="db2-kpi-label">High Risk</span>
              <div className="db2-kpi-value"><Counter value={s.high_risk_count || 0} /></div>
              <div className="db2-kpi-change neg">Customers flagged</div>
            </div>
          </div>
          <div className="db2-kpi-spark"><Spark data={sparkHigh} color={C.rose} /></div>
        </div>

      </div>

      {/* ── Middle Row: Funnel | Risk Donut | Contract ──────── */}
      <div className="db2-mid-row stagger-children">

        {/* Churn Pipeline Funnel */}
        <div className="db2-card db2-funnel-card">
          <div className="db2-card-header">
            <h3>Churn Pipeline Funnel</h3>
            <span className="db2-card-sub">Customer risk progression</span>
          </div>
          <div className="db2-funnel">
            {funnelData.map((row, i) => {
              const w = Math.round((row.value / maxF) * 100);
              return (
                <div key={i} className="db2-funnel-row">
                  <div className="db2-funnel-track">
                    <div
                      className="db2-funnel-bar"
                      style={{ width: `${Math.max(w, 18)}%`, background: row.color }}
                    >
                      <span className="db2-funnel-label">{row.label}</span>
                      <span className="db2-funnel-val">{row.value.toLocaleString()}</span>
                    </div>
                  </div>
                  {row.pct != null && (
                    <span className="db2-funnel-pct">{row.pct}%</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="db2-funnel-legend">
            <span className="db2-funnel-legend-label">Conversion Rate</span>
          </div>
        </div>

        {/* Risk Donut */}
        <div className="db2-card db2-donut-card">
          <div className="db2-card-header">
            <h3>Risk by Segment</h3>
            <span className="db2-card-sub">Customer risk breakdown</span>
          </div>
          <div className="db2-donut-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={riskData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={82}
                  paddingAngle={3} dataKey="value"
                  animationBegin={200} animationDuration={700}
                >
                  {riskData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="db2-donut-center">
              <span className="db2-donut-big">{totalRisk}</span>
              <span className="db2-donut-lbl">Analysed</span>
            </div>
          </div>
          <div className="db2-legend">
            {riskData.map((d, i) => (
              <div key={i} className="db2-legend-item">
                <span className="db2-legend-dot" style={{ background: d.color }} />
                <span className="db2-legend-name">{d.name}</span>
                <span className="db2-legend-val" style={{ color: d.color }}>
                  {totalRisk ? ((d.value / totalRisk) * 100).toFixed(1) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Breakdown */}
        <div className="db2-card">
          <div className="db2-card-header">
            <h3>Churn by Contract</h3>
            <span className="db2-card-sub">Contract type distribution</span>
          </div>
          <div className="db2-contract-list">
            {contractData.map((c, i) => {
              const pct = totalContracts ? +((c.value / totalContracts) * 100).toFixed(1) : 0;
              return (
                <div key={i} className="db2-contract-row">
                  <div className="db2-contract-info">
                    <span className="db2-contract-dot" style={{ background: contractColors[i] }} />
                    <span className="db2-contract-name">{c.name}</span>
                  </div>
                  <div className="db2-contract-bar-wrap">
                    <div
                      className="db2-contract-bar"
                      style={{ width: `${pct}%`, background: contractColors[i] }}
                    />
                  </div>
                  <span className="db2-contract-pct" style={{ color: contractColors[i] }}>{pct}%</span>
                </div>
              );
            })}
          </div>

          {/* Weekly trend mini */}
          <div className="db2-mini-chart">
            <p className="db2-mini-chart-label">Weekly Churn Rate Trend</p>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={weekTrend} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="wkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.violet} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.violet} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<Tip />} />
                <Area
                  type="monotone" dataKey="churnRate" name="Churn Rate"
                  stroke={C.violet} fill="url(#wkGrad)"
                  strokeWidth={2} dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Bottom Row: Heatmap | Payment | Retain ─────────── */}
      <div className="db2-bot-row stagger-children">

        {/* Predictions Heatmap */}
        <div className="db2-card">
          <div className="db2-card-header">
            <h3>Predictions Heatmap <span className="db2-card-sub-inline">(Day &amp; Time)</span></h3>
            <span className="db2-card-sub">Activity intensity by slot</span>
          </div>
          <div className="db2-heatmap-wrap">
            <div className="db2-heatmap-yaxis">
              {days.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="db2-heatmap-grid">
              {heat.map((row, ri) =>
                row.map((val, ci) => (
                  <div
                    key={`${ri}-${ci}`}
                    className="db2-heatmap-cell"
                    style={{ background: `rgba(139,92,246,${0.07 + (val / 8) * 0.78})` }}
                    title={`${days[ri]} ${slots[ci]}: activity ${val}`}
                  />
                ))
              )}
            </div>
          </div>
          <div className="db2-heatmap-xaxis">
            {slots.map(sl => <span key={sl}>{sl}</span>)}
          </div>
          <div className="db2-heatmap-legend">
            <span>Low</span>
            <div className="db2-heatmap-grad" />
            <span>High</span>
          </div>
        </div>

        {/* Payment Mode Donut */}
        <div className="db2-card db2-donut-card">
          <div className="db2-card-header">
            <h3>Churn by Payment Mode</h3>
            <span className="db2-card-sub">Payment method distribution</span>
          </div>
          <div className="db2-donut-wrap">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={payData} cx="50%" cy="50%"
                  innerRadius={46} outerRadius={70}
                  paddingAngle={3} dataKey="value"
                  animationBegin={300} animationDuration={700}
                >
                  {payData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`} content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="db2-donut-center">
              <span className="db2-donut-big" style={{ fontSize: '1.15rem' }}>
                {s.total_predictions || 0}
              </span>
              <span className="db2-donut-lbl">Predictions</span>
            </div>
          </div>
          <div className="db2-legend">
            {payData.map((d, i) => (
              <div key={i} className="db2-legend-item">
                <span className="db2-legend-dot" style={{ background: d.color }} />
                <span className="db2-legend-name" style={{ fontSize: '0.71rem' }}>{d.name}</span>
                <span className="db2-legend-val" style={{ color: d.color }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Retained vs Churned */}
        <div className="db2-card db2-donut-card">
          <div className="db2-card-header">
            <h3>Retained vs Churned</h3>
            <span className="db2-card-sub">Overall customer outcome</span>
          </div>
          <div className="db2-retain-row">
            <div className="db2-retain-half">
              <div className="db2-retain-icon" style={{ color: C.emerald, background: 'rgba(16,185,129,0.12)' }}>
                <HiOutlineUsers />
              </div>
              <span className="db2-retain-label">Retained</span>
              <span className="db2-retain-pct" style={{ color: C.emerald }}>{retainPct}%</span>
            </div>
            <div className="db2-retain-half">
              <div className="db2-retain-icon" style={{ color: C.rose, background: 'rgba(244,63,94,0.12)' }}>
                <HiOutlineTrendingDown />
              </div>
              <span className="db2-retain-label">Churned</span>
              <span className="db2-retain-pct" style={{ color: C.rose }}>{churnPct.toFixed(1)}%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={retainData} cx="50%" cy="50%"
                innerRadius={38} outerRadius={55}
                paddingAngle={3} dataKey="value"
                animationBegin={400} animationDuration={700}
              >
                {retainData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={v => `${v}%`} content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          <p className="db2-retain-total">
            {s.total_customers || totalRisk} Total Customers
          </p>
        </div>

      </div>

      {/* ── Insights Bar ────────────────────────────────────── */}
      <div className="db2-insights animate-fade-in">
        <div className="db2-insights-label">
          <HiOutlineLightBulb />
          <span>Insights</span>
        </div>
        {insights.map(({ Icon, text, color }, i) => (
          <div key={i} className="db2-insight-chip">
            <span className="db2-insight-icon" style={{ color }}>
              <Icon />
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
