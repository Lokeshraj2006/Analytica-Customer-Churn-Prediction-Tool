import { useState, useEffect, useRef } from 'react';
import { predictionAPI, simulatorAPI } from '../services/api';
import { FlaskConical, Zap, ClipboardList } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';

const C = { violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', emerald: '#10b981', cyan: '#06b6d4' };

const INDUSTRY_FIELDS = {
  telecom: [
    { key: 'contract', label: 'Contract', type: 'select', options: ['Month-to-month', 'One year', 'Two year'] },
    { key: 'internet_service', label: 'Internet Service', type: 'select', options: ['DSL', 'Fiber optic', 'No'] },
    { key: 'tech_support', label: 'Tech Support', type: 'select', options: ['Yes', 'No', 'No internet service'] },
    { key: 'online_security', label: 'Online Security', type: 'select', options: ['Yes', 'No', 'No internet service'] },
    { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'] },
    { key: 'paperless_billing', label: 'Paperless Billing', type: 'select', options: ['Yes', 'No'] },
    { key: 'tenure', label: 'Tenure (months)', type: 'number', min: 0, max: 72, step: 1 },
    { key: 'monthly_charges', label: 'Monthly Charges ($)', type: 'number', min: 0, max: 200, step: 0.01 },
  ],
  banking: [
    { key: 'is_active_member', label: 'Active Member', type: 'select', options: [1, 0], option_labels: { 1: 'Yes', 0: 'No' } },
    { key: 'num_products', label: 'Number of Products', type: 'select', options: [1, 2, 3, 4] },
    { key: 'has_credit_card', label: 'Has Credit Card', type: 'select', options: [1, 0], option_labels: { 1: 'Yes', 0: 'No' } },
    { key: 'credit_score', label: 'Credit Score', type: 'number', min: 300, max: 850, step: 1 },
    { key: 'balance', label: 'Account Balance ($)', type: 'number', min: 0, max: 300000, step: 1 },
    { key: 'tenure', label: 'Tenure (years)', type: 'number', min: 0, max: 20, step: 1 },
    { key: 'age', label: 'Age', type: 'number', min: 18, max: 95, step: 1 },
    { key: 'estimated_salary', label: 'Estimated Salary ($)', type: 'number', min: 10000, max: 300000, step: 100 },
  ],
  ecommerce: [
    { key: 'days_since_last_purchase', label: 'Days Since Last Purchase', type: 'number', min: 0, max: 365, step: 1 },
    { key: 'cart_abandonment_rate', label: 'Cart Abandonment Rate (%)', type: 'number', min: 0, max: 100, step: 0.1 },
    { key: 'support_tickets', label: 'Support Tickets', type: 'number', min: 0, max: 20, step: 1 },
    { key: 'loyalty_tier', label: 'Loyalty Tier', type: 'select', options: ['Bronze', 'Silver', 'Gold', 'Platinum'] },
    { key: 'subscription_type', label: 'Subscription Type', type: 'select', options: ['Free', 'Basic', 'Premium'] },
    { key: 'tenure_months', label: 'Tenure (months)', type: 'number', min: 0, max: 120, step: 1 },
    { key: 'total_orders', label: 'Total Orders', type: 'number', min: 1, max: 200, step: 1 },
    { key: 'avg_order_value', label: 'Avg Order Value ($)', type: 'number', min: 5, max: 1000, step: 0.1 },
  ],
  healthcare: [
    { key: 'appointment_no_shows', label: 'Appointment No-Shows', type: 'number', min: 0, max: 30, step: 1 },
    { key: 'days_since_last_visit', label: 'Days Since Last Visit', type: 'number', min: 0, max: 365, step: 1 },
    { key: 'patient_satisfaction', label: 'Patient Satisfaction (1-10)', type: 'number', min: 1, max: 10, step: 1 },
    { key: 'insurance_type', label: 'Insurance Type', type: 'select', options: ['None', 'Basic', 'Premium', 'Private'] },
    { key: 'payment_type', label: 'Payment Type', type: 'select', options: ['Cash', 'Credit Card', 'Insurance'] },
    { key: 'specialist_visits', label: 'Specialist Visits', type: 'number', min: 0, max: 20, step: 1 },
    { key: 'prescription_count', label: 'Prescription Count', type: 'number', min: 0, max: 15, step: 1 },
    { key: 'chronic_conditions', label: 'Chronic Conditions', type: 'number', min: 0, max: 5, step: 1 },
  ]
};

function ProbMeter({ probability, label, color }) {
  const pct = Math.round((probability || 0) * 100);
  const data = [{ value: pct, fill: color }];
  return (
    <div style={{ textAlign: 'center' }}>
      <ResponsiveContainer width={140} height={140}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={data} startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'rgba(255,255,255,0.05)' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: -20 }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{pct}%</div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</div>
      </div>
    </div>
  );
}

function DeltaBadge({ value, unit = '%', invert = false }) {
  const isPositive = invert ? value < 0 : value > 0;
  const color = isPositive ? C.emerald : C.rose;
  const sign = value > 0 ? '+' : '';
  return (
    <span style={{ fontSize: '0.85rem', fontWeight: 700, color, background: `${color}22`, padding: '2px 10px', borderRadius: 20 }}>
      {sign}{typeof value === 'number' ? value.toFixed(2) : value}{unit}
    </span>
  );
}

export default function Simulator() {
  const { format, currentCurrency } = useCurrency();
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [mods, setMods] = useState({});
  const [result, setResult] = useState(null);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [tab, setTab] = useState('manual'); // manual | presets | batch

  const CURRENCY_KEYS = ['monthly_charges', 'balance', 'avg_order_value', 'estimated_salary'];

  const convertModsToLocal = (m) => {
    const res = { ...m };
    CURRENCY_KEYS.forEach(k => {
      if (res[k] !== undefined) {
        res[k] = parseFloat((res[k] * currentCurrency.rate).toFixed(2));
      }
    });
    return res;
  };

  const convertModsToUSD = (m) => {
    const res = { ...m };
    CURRENCY_KEYS.forEach(k => {
      if (res[k] !== undefined && res[k] !== '') {
        res[k] = parseFloat((res[k] / currentCurrency.rate).toFixed(2));
      }
    });
    return res;
  };

  const selectedPrediction = recentPredictions.find(p => String(p.id) === String(selectedId));
  const currentIndustry = selectedPrediction?.industry || 'telecom';
  const currentFields = INDUSTRY_FIELDS[currentIndustry] || INDUSTRY_FIELDS.telecom;

  useEffect(() => {
    predictionAPI.getHistory(0, 20)
      .then(r => setRecentPredictions(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedId) {
      simulatorAPI.getPresets(selectedId)
        .then(r => setPresets(r.data || []))
        .catch(() => setPresets([]));
      setMods({});
      setResult(null);
      setBatchResults(null);
    }
  }, [selectedId]);

  const handleModChange = (key, value) => {
    setMods(prev => ({ ...prev, [key]: value }));
  };

  const runCompare = async () => {
    if (!selectedId) return;
    setLoading(true);
    setResult(null);
    try {
      const usdMods = convertModsToUSD(mods);
      const r = await simulatorAPI.compare({
        base_prediction_id: parseInt(selectedId),
        modifications: usdMods,
        model_type: 'random_forest',
      });
      setResult(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runBatch = async () => {
    if (!selectedId || !presets.length) return;
    setBatchLoading(true);
    setBatchResults(null);
    try {
      const r = await simulatorAPI.batch({
        base_prediction_id: parseInt(selectedId),
        scenarios: presets.map(p => ({ name: p.name, modifications: p.modifications })),
        model_type: 'random_forest',
      });
      setBatchResults(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setBatchLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setMods(convertModsToLocal(preset.modifications));
    setTab('manual');
  };

  const origProb = result?.original?.churn_probability || 0;
  const modProb = result?.modified?.churn_probability || 0;
  const delta = result?.delta || {};

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1><FlaskConical className="inline-block mr-2 text-amber-400" size={24} /> What-If Simulator</h1>
        <p>Modify customer attributes and see how churn probability changes in real-time</p>
      </div>

      {/* Step 1: Select prediction */}
      <div className="glass-card animate-fade-in-up" style={{ marginBottom: 20 }}>
        <h3 style={{ color: '#e2e8f0', marginBottom: 12, fontSize: '0.95rem' }}>Step 1 — Select a Customer Prediction</h3>
        {recentPredictions.length === 0 ? (
          <p style={{ color: '#64748b' }}>No predictions found. Make a prediction first.</p>
        ) : (
          <select
            className="form-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ maxWidth: 420 }}
          >
            <option value="">— Choose a prediction —</option>
            {recentPredictions.map(p => (
              <option key={p.id} value={p.id}>
                #{p.id} · [{(p.industry || 'telecom').toUpperCase()}] · {p.risk_level} Risk · {(p.churn_probability * 100).toFixed(1)}% · {p.contract || 'N/A'} · {format(p.monthly_charges)}/mo
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedId && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['manual', 'presets', 'batch'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: '0.83rem', fontWeight: 600, transition: 'all 0.2s',
                  background: tab === t ? C.violet : 'rgba(255,255,255,0.06)',
                  color: tab === t ? 'white' : '#94a3b8',
                }}
              >
                {t === 'manual' ? '✏️ Manual' : t === 'presets' ? '⚡ Smart Presets' : '📋 Batch Scenarios'}
              </button>
            ))}
          </div>

          {/* Manual tab */}
          {tab === 'manual' && (
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 20 }}>
              <h3 style={{ color: '#e2e8f0', marginBottom: 16, fontSize: '0.95rem' }}>Step 2 — Modify Customer Attributes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                {currentFields.map(f => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label.replace('($)', `(${currentCurrency.symbol})`)}</label>
                    {f.type === 'select' ? (
                      <select
                        className="form-select"
                        value={mods[f.key] ?? ''}
                        onChange={e => handleModChange(f.key, e.target.value)}
                      >
                        <option value="">— no change —</option>
                        {f.options.map(o => (
                          <option key={o} value={o}>
                            {f.option_labels ? (f.option_labels[o] || o) : o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        className="form-input"
                        min={f.min} max={f.max} step={f.step}
                        value={mods[f.key] ?? ''}
                        onChange={e => handleModChange(f.key, parseFloat(e.target.value) || 0)}
                        placeholder="no change"
                      />
                    )}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={runCompare} disabled={loading || Object.keys(mods).length === 0}>
                {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Simulating...</> : '⚡ Run Simulation'}
              </button>
            </div>
          )}

          {/* Presets tab */}
          {tab === 'presets' && (
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 20 }}>
              <h3 style={{ color: '#e2e8f0', marginBottom: 4, fontSize: '0.95rem' }}>Smart Retention Scenarios</h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 16 }}>Click a scenario to apply it to Manual mode, or run them all in batch</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 16 }}>
                {presets.map((p, i) => (
                  <div key={i}
                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => applyPreset(p)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.violet}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{p.icon}</div>
                    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{p.description}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={runBatch} disabled={batchLoading || presets.length === 0}>
                {batchLoading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Running All...</> : '📋 Run All Scenarios'}
              </button>
            </div>
          )}

          {/* Batch results */}
          {batchResults && tab === 'presets' && (
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 20 }}>
              <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Batch Scenario Results</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Scenario', 'Orig. Prob', 'New Prob', 'Δ Probability', 'Revenue Saved', 'Risk Change'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', color: '#64748b', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 600 }}>{r.scenario_name}</td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{((r.original?.churn_probability || 0) * 100).toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{((r.modified?.churn_probability || 0) * 100).toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px' }}>
                          <DeltaBadge value={(r.delta?.probability_change_pct || 0)} invert={true} />
                        </td>
                        <td style={{ padding: '8px 12px', color: C.emerald }}>
                          {format(r.delta?.revenue_at_risk_saved || 0, 0)}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {r.delta?.risk_level_changed
                            ? <span style={{ color: C.emerald, fontWeight: 700 }}>{r.delta.original_risk} → {r.delta.modified_risk}</span>
                            : <span style={{ color: '#64748b' }}>No change</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comparison result */}
          {result && (
            <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'start' }}>
              {/* Original */}
              <div className="glass-card" style={{ textAlign: 'center' }}>
                <h4 style={{ color: '#94a3b8', marginBottom: 16 }}>Original Profile</h4>
                <ProbMeter probability={origProb} label="Churn Probability" color={origProb >= 0.7 ? C.rose : origProb >= 0.4 ? C.amber : C.emerald} />
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{result.original?.risk_level} Risk</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>CLV: {format(result.original?.clv?.risk_adjusted_clv || 0, 0)}</div>
                </div>
              </div>

              {/* Delta panel */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minWidth: 180 }}>
                <div style={{ fontSize: '2rem' }}>⟷</div>
                {delta.probability_change !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <DeltaBadge value={delta.probability_change_pct} invert={true} />
                    <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '4px 0 0' }}>probability change</p>
                  </div>
                )}
                {delta.clv_impact !== undefined && (
                  <div style={{ textAlign: 'center' }}>
                    <DeltaBadge value={delta.clv_impact * currentCurrency.rate} unit={currentCurrency.symbol} />
                    <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '4px 0 0' }}>CLV impact</p>
                  </div>
                )}
                {delta.revenue_at_risk_saved !== undefined && delta.revenue_at_risk_saved > 0 && (
                  <div style={{ textAlign: 'center', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '8px 16px' }}>
                    <div style={{ color: C.emerald, fontWeight: 800, fontSize: '1.1rem' }}>{format(delta.revenue_at_risk_saved, 0)}</div>
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Annual revenue saved</div>
                  </div>
                )}
              </div>

              {/* Modified */}
              <div className="glass-card" style={{ textAlign: 'center', border: `1px solid ${C.emerald}33` }}>
                <h4 style={{ color: C.emerald, marginBottom: 16 }}>Modified Profile</h4>
                <ProbMeter probability={modProb} label="Churn Probability" color={modProb >= 0.7 ? C.rose : modProb >= 0.4 ? C.amber : C.emerald} />
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{result.modified?.risk_level} Risk</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>CLV: {format(result.modified?.clv?.risk_adjusted_clv || 0, 0)}</div>
                </div>
                {delta.risk_level_changed && (
                  <div style={{ marginTop: 8, color: C.emerald, fontSize: '0.8rem', fontWeight: 700 }}>
                    ✓ Risk level improved!
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
