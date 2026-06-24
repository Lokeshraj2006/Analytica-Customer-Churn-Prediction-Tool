import { useState, useEffect } from 'react';
import { predictionAPI, edaAPI } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { HiOutlineUser, HiOutlineGlobe, HiOutlineCreditCard, HiOutlineLightningBolt } from 'react-icons/hi';

/* ── All 7 supported models with static metadata ── */
const ALL_MODELS = [
  { key: 'random_forest',       name: 'Random Forest',        desc: 'Ensemble of trees — highest accuracy',        icon: '◈', color: '#667eea' },
  { key: 'gradient_boosting',   name: 'Gradient Boosting',    desc: 'Boosted trees — great on tabular data',       icon: '◎', color: '#f093fb' },
  { key: 'xgboost',             name: 'XGBoost',              desc: 'Extreme gradient boosting — fast & precise',  icon: '✦', color: '#4facfe' },
  { key: 'logistic_regression', name: 'Logistic Regression',  desc: 'Linear model — fast & interpretable',         icon: '∿', color: '#00e676' },
  { key: 'decision_tree',       name: 'Decision Tree',        desc: 'Single tree — fully transparent',             icon: '⬡', color: '#ff9800' },
  { key: 'svm',                 name: 'SVM',                  desc: 'Support Vector Machine — robust margins',     icon: '◌', color: '#ff6b6b' },
  { key: 'knn',                 name: 'KNN',                  desc: 'K-Nearest Neighbors — instance learning',     icon: '⊕', color: '#a78bfa' },
];

export default function Predict({ onPredictionContext }) {
  const { currency, currentCurrency, currencies, convertToUSD, format } = useCurrency();
  const [prevCurrency, setPrevCurrency] = useState(currency);
  const [modelType, setModelType] = useState('random_forest');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  /* model availability + accuracy from backend */
  const [availableKeys, setAvailableKeys] = useState([]);
  const [modelStats, setModelStats] = useState({});   // key → { accuracy, f1_score, roc_auc }
  const [bestKey, setBestKey] = useState('');

  const [form, setForm] = useState({
    gender: 'Male',
    senior_citizen: 0,
    partner: 'No',
    dependents: 'No',
    tenure: 12,
    phone_service: 'Yes',
    multiple_lines: 'No',
    internet_service: 'Fiber optic',
    online_security: 'No',
    online_backup: 'No',
    device_protection: 'No',
    tech_support: 'No',
    streaming_tv: 'No',
    streaming_movies: 'No',
    contract: 'Month-to-month',
    paperless_billing: 'Yes',
    payment_method: 'Electronic check',
    monthly_charges: 70.35,
    total_charges: 844.20,
  });

  /* Load live model comparison on mount */
  useEffect(() => {
    edaAPI.getModelComparison()
      .then(res => {
        const models = res.data?.models || [];
        const statsMap = {};
        let best = '';
        let bestAcc = 0;
        models.forEach(m => {
          statsMap[m.model] = {
            accuracy: m.accuracy,
            f1_score: m.f1_score,
            roc_auc: m.roc_auc,
            available: m.available,
          };
          if (m.available && m.accuracy > bestAcc) {
            bestAcc = m.accuracy;
            best = m.model;
          }
        });
        setModelStats(statsMap);
        setBestKey(best);
        setAvailableKeys(models.filter(m => m.available).map(m => m.model));
        if (best) setModelType(best);
      })
      .catch(() => {
        /* backend not ready yet — show all cards, no accuracy badges */
        setAvailableKeys(ALL_MODELS.map(m => m.key));
      });
  }, []);

  /* Currency conversion */
  useEffect(() => {
    if (currency !== prevCurrency) {
      setForm(prev => {
        const oldRate = currencies[prevCurrency].rate;
        const newRate = currencies[currency].rate;
        return {
          ...prev,
          monthly_charges: parseFloat((prev.monthly_charges / oldRate * newRate).toFixed(2)),
          total_charges:   parseFloat((prev.total_charges   / oldRate * newRate).toFixed(2)),
        };
      });
      setPrevCurrency(currency);
    }
  }, [currency, prevCurrency, currencies]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'senior_citizen' || name === 'tenure'
        ? parseInt(value)
        : name === 'monthly_charges' || name === 'total_charges'
          ? parseFloat(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = {
        ...form,
        monthly_charges: convertToUSD(form.monthly_charges),
        total_charges:   convertToUSD(form.total_charges),
        model_type: modelType,
      };
      const response = await predictionAPI.predict(payload);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk === 'High')   return 'high';
    if (risk === 'Medium') return 'medium';
    return 'low';
  };

  /* Models to render — if we have live data, only show available ones; else all */
  const modelsToShow = availableKeys.length > 0
    ? ALL_MODELS.filter(m => availableKeys.includes(m.key))
    : ALL_MODELS;

  return (
    <div className="page-container predict-page">
      <div className="page-header animate-fade-in">
        <h1>Churn Prediction</h1>
        <p>Enter customer details and choose your model to predict churn probability</p>
      </div>

      {/* ── Model Selector ── */}
      <div className="animate-fade-in-up" style={{ marginBottom: 32 }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Choose Model
        </p>
        <div className="model-selector-grid">
          {modelsToShow.map(m => {
            const stats   = modelStats[m.key];
            const isActive = modelType === m.key;
            const isBest   = m.key === bestKey;
            const acc      = stats ? (stats.accuracy * 100).toFixed(1) : null;

            return (
              <div
                key={m.key}
                className={`model-card ${isActive ? 'active' : ''}`}
                style={{ '--m-color': m.color }}
                onClick={() => setModelType(m.key)}
              >
                {isBest && (
                  <span className="model-card-best">✦ Best</span>
                )}
                <div className="model-card-icon">{m.icon}</div>
                <div className="model-card-name">{m.name}</div>
                <div className="model-card-desc">{m.desc}</div>
                {acc && (
                  <div className="model-card-acc">{acc}%</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Demographics */}
        <div className="predict-section glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h3 className="predict-section-title">
            <span><HiOutlineUser /></span> Customer Demographics
          </h3>
          <div className="predict-form-grid">
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} className="form-select">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Senior Citizen</label>
              <select name="senior_citizen" value={form.senior_citizen} onChange={handleChange} className="form-select">
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Partner</label>
              <select name="partner" value={form.partner} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Dependents</label>
              <select name="dependents" value={form.dependents} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="predict-section glass-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h3 className="predict-section-title">
            <span><HiOutlineGlobe /></span> Services
          </h3>
          <div className="predict-form-grid">
            <div className="form-group">
              <label className="form-label">Internet Service</label>
              <select name="internet_service" value={form.internet_service} onChange={handleChange} className="form-select">
                <option value="DSL">DSL</option>
                <option value="Fiber optic">Fiber optic</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Service</label>
              <select name="phone_service" value={form.phone_service} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Multiple Lines</label>
              <select name="multiple_lines" value={form.multiple_lines} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No phone service">No phone service</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Online Security</label>
              <select name="online_security" value={form.online_security} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No internet service">No internet service</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Online Backup</label>
              <select name="online_backup" value={form.online_backup} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No internet service">No internet service</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Device Protection</label>
              <select name="device_protection" value={form.device_protection} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No internet service">No internet service</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tech Support</label>
              <select name="tech_support" value={form.tech_support} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No internet service">No internet service</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Streaming TV</label>
              <select name="streaming_tv" value={form.streaming_tv} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No internet service">No internet service</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Streaming Movies</label>
              <select name="streaming_movies" value={form.streaming_movies} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No internet service">No internet service</option>
              </select>
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="predict-section glass-card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h3 className="predict-section-title">
            <span><HiOutlineCreditCard /></span> Account &amp; Billing
          </h3>
          <div className="predict-form-grid">
            <div className="form-group">
              <label className="form-label">Tenure (months)</label>
              <input type="number" name="tenure" value={form.tenure} onChange={handleChange}
                className="form-input" min="0" max="72" />
            </div>
            <div className="form-group">
              <label className="form-label">Contract</label>
              <select name="contract" value={form.contract} onChange={handleChange} className="form-select">
                <option value="Month-to-month">Month-to-month</option>
                <option value="One year">One year</option>
                <option value="Two year">Two year</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Charges ({currentCurrency.symbol})</label>
              <input type="number" name="monthly_charges" value={form.monthly_charges} onChange={handleChange}
                className="form-input" step="0.01" min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Total Charges ({currentCurrency.symbol})</label>
              <input type="number" name="total_charges" value={form.total_charges} onChange={handleChange}
                className="form-input" step="0.01" min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Paperless Billing</label>
              <select name="paperless_billing" value={form.paperless_billing} onChange={handleChange} className="form-select">
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select name="payment_method" value={form.payment_method} onChange={handleChange} className="form-select">
                <option value="Electronic check">Electronic check</option>
                <option value="Mailed check">Mailed check</option>
                <option value="Bank transfer (automatic)">Bank transfer (automatic)</option>
                <option value="Credit card (automatic)">Credit card (automatic)</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
          {loading ? (
            <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Analyzing...</>
          ) : (
            <><HiOutlineLightningBolt /> Predict Churn</>
          )}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="predict-result">
          <h3 className="predict-result-label">Churn Prediction Result</h3>
          <div className={`predict-result-value ${getRiskColor(result.risk_level)}`}>
            {(result.churn_probability * 100).toFixed(1)}%
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
            Probability of customer churning
          </p>
          <div className={`predict-result-risk ${getRiskColor(result.risk_level)}`}>
            {result.risk_level === 'High' ? '▲' : result.risk_level === 'Medium' ? '◈' : '✦'}
            &nbsp;{result.risk_level} Risk — {result.churn_prediction === 1 ? 'Likely to Churn' : 'Likely to Stay'}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Model: {result.model_used}
          </p>

          {/* Contributing Factors */}
          {result.contributing_factors?.length > 0 && (
            <div className="predict-factors">
              <h4>Top Contributing Factors</h4>
              {result.contributing_factors.map((factor, i) => (
                <div key={i} className="predict-factor-item">
                  <span className="predict-factor-name">{factor.feature}</span>
                  <div className="predict-factor-bar">
                    <div
                      className="predict-factor-fill"
                      style={{ width: `${(factor.importance / (result.contributing_factors[0]?.importance || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="predict-factor-value">{(factor.importance * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Ask AI */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                if (onPredictionContext && result) {
                  onPredictionContext({
                    prediction_id: result.id,
                    churn_probability: result.churn_probability,
                    risk_level: result.risk_level,
                    model_used: result.model_used,
                    contributing_factors: result.contributing_factors,
                    ...form,
                    monthly_charges: convertToUSD(form.monthly_charges),
                    total_charges:   convertToUSD(form.total_charges),
                  });
                }
              }}
            >
              ◈ Ask AI About This Prediction
            </button>
            {result.id && (
              <>
                <a
                  href={`/explainability/${result.id}`}
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                >
                  🔍 SHAP Explain
                </a>
                <a
                  href="/simulator"
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                >
                  ⚗️ Simulate
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
