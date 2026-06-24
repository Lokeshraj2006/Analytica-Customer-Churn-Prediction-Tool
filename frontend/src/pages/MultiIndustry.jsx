import { useState, useEffect } from 'react';
import { industryAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import {
  HiOutlineGlobe, HiOutlineTrendingDown, HiOutlineExclamation,
  HiOutlineChip, HiOutlineSearchCircle, HiOutlineShieldExclamation,
  HiOutlineCheckCircle, HiOutlineLightningBolt, HiOutlineChartBar,
  HiOutlineViewGrid, HiOutlineCreditCard, HiOutlineUserGroup,
  HiOutlineOfficeBuilding, HiOutlineShoppingCart, HiOutlineHeart,
  HiOutlineDocumentReport, HiOutlineAdjustments, HiOutlineCash,
  HiOutlineCalendar, HiOutlineMail, HiOutlineClipboardList,
} from 'react-icons/hi';

const C = {
  violet: '#8b5cf6', rose: '#f43f5e', emerald: '#10b981', amber: '#f59e0b',
  cyan: '#06b6d4', slate: '#64748b', indigo: '#6366f1', pink: '#ec4899',
};

// ── Industry icon components (no emojis) ──────────────────────────────────────
const IndustryIcon = ({ industry, size = 28, color }) => {
  const s = { fontSize: size, color: color || '#e2e8f0' };
  switch (industry) {
    case 'telecom': return <HiOutlineGlobe style={s} />;
    case 'banking': return <HiOutlineOfficeBuilding style={s} />;
    case 'ecommerce': return <HiOutlineShoppingCart style={s} />;
    case 'healthcare': return <HiOutlineHeart style={s} />;
    default: return <HiOutlineGlobe style={s} />;
  }
};

const INDUSTRIES = [
  {
    key: 'telecom', label: 'Telecom', color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    description: 'ISP & mobile carrier churn prediction',
    avgChurn: '26.5%', topRisk: 'Month-to-month contracts',
  },
  {
    key: 'banking', label: 'Banking', color: '#10b981',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    description: 'Retail banking & account holder retention',
    avgChurn: '20.4%', topRisk: 'Inactive member status',
  },
  {
    key: 'ecommerce', label: 'E-commerce', color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    description: 'Online retail & subscription churn',
    avgChurn: '22.1%', topRisk: 'High cart abandonment rate',
  },
  {
    key: 'healthcare', label: 'Healthcare', color: '#f43f5e',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
    description: 'Patient retention & appointment adherence',
    avgChurn: '18.7%', topRisk: 'Appointment no-shows',
  },
];

const STATIC_DEFAULTS = {
  telecom: {
    gender: 'Male', senior_citizen: 0, partner: 'No', dependents: 'No',
    tenure: 12, internet_service: 'Fiber optic', phone_service: 'Yes',
    multiple_lines: 'No', online_security: 'No', online_backup: 'No',
    device_protection: 'No', tech_support: 'No', streaming_tv: 'No',
    streaming_movies: 'No', contract: 'Month-to-month', paperless_billing: 'Yes',
    payment_method: 'Electronic check', monthly_charges: 70.35, total_charges: 844.20,
  },
  banking: {
    age: 38, gender: 'Male', geography: 'France', tenure: 3,
    credit_score: 650, balance: 65000, estimated_salary: 72000,
    num_products: 1, has_credit_card: 1, is_active_member: 1,
  },
  ecommerce: {
    days_since_last_purchase: 45, total_orders: 12, avg_order_value: 68.5,
    returns_count: 2, email_opens_rate: 28.5, cart_abandonment_rate: 55.0,
    support_tickets: 2, loyalty_tier: 'Silver', subscription_type: 'Basic',
    tenure_months: 14,
  },
  healthcare: {
    age: 45, gender: 'Female', insurance_type: 'Private', payment_type: 'Insurance',
    days_since_last_visit: 90, appointment_no_shows: 2, specialist_visits: 3,
    prescription_count: 2, chronic_conditions: 1, patient_satisfaction: 7,
  },
};

const TEMPLATES = {
  telecom: {
    high_risk: { gender: 'Male', senior_citizen: 1, partner: 'No', dependents: 'No', tenure: 2, internet_service: 'Fiber optic', phone_service: 'Yes', multiple_lines: 'Yes', online_security: 'No', online_backup: 'No', device_protection: 'No', tech_support: 'No', streaming_tv: 'No', streaming_movies: 'No', contract: 'Month-to-month', paperless_billing: 'Yes', payment_method: 'Electronic check', monthly_charges: 98.5, total_charges: 197.0 },
    medium_risk: { gender: 'Female', senior_citizen: 0, partner: 'Yes', dependents: 'No', tenure: 18, internet_service: 'DSL', phone_service: 'Yes', multiple_lines: 'No', online_security: 'Yes', online_backup: 'No', device_protection: 'No', tech_support: 'No', streaming_tv: 'Yes', streaming_movies: 'No', contract: 'Month-to-month', paperless_billing: 'Yes', payment_method: 'Mailed check', monthly_charges: 59.9, total_charges: 1078.2 },
    low_risk: { gender: 'Female', senior_citizen: 0, partner: 'Yes', dependents: 'Yes', tenure: 48, internet_service: 'DSL', phone_service: 'Yes', multiple_lines: 'No', online_security: 'Yes', online_backup: 'Yes', device_protection: 'Yes', tech_support: 'Yes', streaming_tv: 'No', streaming_movies: 'No', contract: 'Two year', paperless_billing: 'No', payment_method: 'Bank transfer (automatic)', monthly_charges: 45.5, total_charges: 2184.0 },
  },
  banking: {
    high_risk: { age: 52, gender: 'Female', geography: 'Germany', tenure: 1, credit_score: 420, balance: 120000, estimated_salary: 48000, num_products: 1, has_credit_card: 0, is_active_member: 0 },
    medium_risk: { age: 40, gender: 'Male', geography: 'Spain', tenure: 4, credit_score: 590, balance: 80000, estimated_salary: 65000, num_products: 2, has_credit_card: 1, is_active_member: 0 },
    low_risk: { age: 30, gender: 'Female', geography: 'France', tenure: 8, credit_score: 750, balance: 30000, estimated_salary: 95000, num_products: 2, has_credit_card: 1, is_active_member: 1 },
  },
  ecommerce: {
    high_risk: { days_since_last_purchase: 180, total_orders: 3, avg_order_value: 22.0, returns_count: 5, email_opens_rate: 5.0, cart_abandonment_rate: 85.0, support_tickets: 8, loyalty_tier: 'Bronze', subscription_type: 'Free', tenure_months: 5 },
    medium_risk: { days_since_last_purchase: 60, total_orders: 15, avg_order_value: 55.0, returns_count: 2, email_opens_rate: 20.0, cart_abandonment_rate: 60.0, support_tickets: 3, loyalty_tier: 'Silver', subscription_type: 'Basic', tenure_months: 18 },
    low_risk: { days_since_last_purchase: 8, total_orders: 85, avg_order_value: 120.0, returns_count: 1, email_opens_rate: 55.0, cart_abandonment_rate: 20.0, support_tickets: 0, loyalty_tier: 'Platinum', subscription_type: 'Premium', tenure_months: 48 },
  },
  healthcare: {
    high_risk: { age: 28, gender: 'Male', insurance_type: 'Uninsured', payment_type: 'Self-pay', days_since_last_visit: 400, appointment_no_shows: 8, specialist_visits: 0, prescription_count: 0, chronic_conditions: 0, patient_satisfaction: 3 },
    medium_risk: { age: 52, gender: 'Female', insurance_type: 'Medicare', payment_type: 'Insurance', days_since_last_visit: 150, appointment_no_shows: 3, specialist_visits: 2, prescription_count: 3, chronic_conditions: 2, patient_satisfaction: 6 },
    low_risk: { age: 62, gender: 'Male', insurance_type: 'Private', payment_type: 'Insurance', days_since_last_visit: 20, appointment_no_shows: 0, specialist_visits: 6, prescription_count: 5, chronic_conditions: 3, patient_satisfaction: 9 },
  },
};

const SECTION_ICONS = {
  'Customer Demographics': <HiOutlineUserGroup style={{ fontSize: 16 }} />,
  'Services': <HiOutlineGlobe style={{ fontSize: 16 }} />,
  'Account & Billing': <HiOutlineCreditCard style={{ fontSize: 16 }} />,
  'Customer Profile': <HiOutlineUserGroup style={{ fontSize: 16 }} />,
  'Financial Details': <HiOutlineCash style={{ fontSize: 16 }} />,
  'Account Behavior': <HiOutlineChartBar style={{ fontSize: 16 }} />,
  'Purchase Behavior': <HiOutlineShoppingCart style={{ fontSize: 16 }} />,
  'Engagement Metrics': <HiOutlineMail style={{ fontSize: 16 }} />,
  'Account & Subscription': <HiOutlineCreditCard style={{ fontSize: 16 }} />,
  'Patient Profile': <HiOutlineUserGroup style={{ fontSize: 16 }} />,
  'Visit History': <HiOutlineCalendar style={{ fontSize: 16 }} />,
  'Clinical & Satisfaction': <HiOutlineHeart style={{ fontSize: 16 }} />,
};

const FIELD_SCHEMAS = {
  telecom: [
    { section: 'Customer Demographics', fields: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
      { key: 'senior_citizen', label: 'Senior Citizen', type: 'select', options: [0, 1], labels: ['No', 'Yes'] },
      { key: 'partner', label: 'Partner', type: 'select', options: ['Yes', 'No'] },
      { key: 'dependents', label: 'Dependents', type: 'select', options: ['Yes', 'No'] },
    ]},
    { section: 'Services', fields: [
      { key: 'tenure', label: 'Tenure (months)', type: 'number', min: 0, max: 72 },
      { key: 'internet_service', label: 'Internet Service', type: 'select', options: ['DSL', 'Fiber optic', 'No'] },
      { key: 'phone_service', label: 'Phone Service', type: 'select', options: ['Yes', 'No'] },
      { key: 'multiple_lines', label: 'Multiple Lines', type: 'select', options: ['Yes', 'No', 'No phone service'] },
      { key: 'online_security', label: 'Online Security', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'online_backup', label: 'Online Backup', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'device_protection', label: 'Device Protection', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'tech_support', label: 'Tech Support', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'streaming_tv', label: 'Streaming TV', type: 'select', options: ['Yes', 'No', 'No internet service'] },
      { key: 'streaming_movies', label: 'Streaming Movies', type: 'select', options: ['Yes', 'No', 'No internet service'] },
    ]},
    { section: 'Account & Billing', fields: [
      { key: 'contract', label: 'Contract', type: 'select', options: ['Month-to-month', 'One year', 'Two year'] },
      { key: 'paperless_billing', label: 'Paperless Billing', type: 'select', options: ['Yes', 'No'] },
      { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'] },
      { key: 'monthly_charges', label: 'Monthly Charges ($)', type: 'number', min: 0, max: 200, step: 0.01 },
      { key: 'total_charges', label: 'Total Charges ($)', type: 'number', min: 0, max: 10000, step: 0.01 },
    ]},
  ],
  banking: [
    { section: 'Customer Profile', fields: [
      { key: 'age', label: 'Age', type: 'number', min: 18, max: 95 },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
      { key: 'geography', label: 'Geography', type: 'select', options: ['France', 'Germany', 'Spain'] },
      { key: 'tenure', label: 'Tenure (years)', type: 'number', min: 0, max: 20 },
    ]},
    { section: 'Financial Details', fields: [
      { key: 'credit_score', label: 'Credit Score', type: 'number', min: 300, max: 850 },
      { key: 'balance', label: 'Account Balance ($)', type: 'number', min: 0, max: 300000, step: 100 },
      { key: 'estimated_salary', label: 'Estimated Salary ($)', type: 'number', min: 10000, max: 300000, step: 1000 },
      { key: 'num_products', label: 'Number of Products', type: 'select', options: [1, 2, 3, 4], labels: ['1', '2', '3', '4'] },
    ]},
    { section: 'Account Behavior', fields: [
      { key: 'has_credit_card', label: 'Has Credit Card', type: 'select', options: [1, 0], labels: ['Yes', 'No'] },
      { key: 'is_active_member', label: 'Active Member', type: 'select', options: [1, 0], labels: ['Yes', 'No'] },
    ]},
  ],
  ecommerce: [
    { section: 'Purchase Behavior', fields: [
      { key: 'days_since_last_purchase', label: 'Days Since Last Purchase', type: 'number', min: 0, max: 365 },
      { key: 'total_orders', label: 'Total Orders (Lifetime)', type: 'number', min: 1, max: 500 },
      { key: 'avg_order_value', label: 'Avg Order Value ($)', type: 'number', min: 5, max: 2000, step: 0.01 },
      { key: 'returns_count', label: 'Returns Count', type: 'number', min: 0, max: 50 },
    ]},
    { section: 'Engagement Metrics', fields: [
      { key: 'email_opens_rate', label: 'Email Open Rate (%)', type: 'number', min: 0, max: 100, step: 0.1 },
      { key: 'cart_abandonment_rate', label: 'Cart Abandonment Rate (%)', type: 'number', min: 0, max: 100, step: 0.1 },
      { key: 'support_tickets', label: 'Support Tickets (last 6mo)', type: 'number', min: 0, max: 20 },
    ]},
    { section: 'Account & Subscription', fields: [
      { key: 'loyalty_tier', label: 'Loyalty Tier', type: 'select', options: ['Bronze', 'Silver', 'Gold', 'Platinum'] },
      { key: 'subscription_type', label: 'Subscription Type', type: 'select', options: ['Free', 'Basic', 'Premium', 'Enterprise'] },
      { key: 'tenure_months', label: 'Account Age (months)', type: 'number', min: 1, max: 120 },
    ]},
  ],
  healthcare: [
    { section: 'Patient Profile', fields: [
      { key: 'age', label: 'Age', type: 'number', min: 0, max: 100 },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { key: 'insurance_type', label: 'Insurance Type', type: 'select', options: ['Private', 'Medicare', 'Medicaid', 'Uninsured'] },
      { key: 'payment_type', label: 'Payment Type', type: 'select', options: ['Insurance', 'Self-pay', 'Sliding scale'] },
    ]},
    { section: 'Visit History', fields: [
      { key: 'days_since_last_visit', label: 'Days Since Last Visit', type: 'number', min: 0, max: 730 },
      { key: 'appointment_no_shows', label: 'No-Shows (last 12mo)', type: 'number', min: 0, max: 20 },
      { key: 'specialist_visits', label: 'Specialist Visits (last 12mo)', type: 'number', min: 0, max: 30 },
      { key: 'prescription_count', label: 'Active Prescriptions', type: 'number', min: 0, max: 20 },
    ]},
    { section: 'Clinical & Satisfaction', fields: [
      { key: 'chronic_conditions', label: 'Chronic Conditions', type: 'number', min: 0, max: 10 },
      { key: 'patient_satisfaction', label: 'Satisfaction Score (1–10)', type: 'number', min: 1, max: 10 },
    ]},
  ],
};

const BENCHMARK = [
  { industry: 'Telecom', avg_churn_rate: 26.5, color: '#6366f1' },
  { industry: 'Banking', avg_churn_rate: 20.4, color: '#10b981' },
  { industry: 'E-commerce', avg_churn_rate: 22.1, color: '#f59e0b' },
  { industry: 'Healthcare', avg_churn_rate: 18.7, color: '#f43f5e' },
];

/* ── Helper components ─────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  return (
    <div className="glass-card animate-fade-in-up" style={{ animationDelay: `${delay}ms`, padding: '18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', color }}>
          {icon}
        </div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>{label}</div>
          <div style={{ color, fontSize: '1.35rem', fontWeight: 800 }}>{value}</div>
          {sub && <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function BenchmarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ color: d.color, fontWeight: 700, margin: '0 0 4px' }}>{d.industry}</p>
      <p style={{ color: '#cbd5e1', margin: 0 }}>Avg Churn Rate: <strong style={{ color: C.rose }}>{d.avg_churn_rate}%</strong></p>
    </div>
  );
}

function FactorBar({ factor, maxImportance }) {
  const pct = maxImportance > 0 ? (factor.importance / maxImportance) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <span style={{ width: 180, color: '#cbd5e1', fontSize: '0.8rem', flexShrink: 0 }}>{factor.feature}</span>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: 6, transition: 'width 0.6s ease', boxShadow: '0 0 6px rgba(139,92,246,0.5)' }} />
      </div>
      <span style={{ color: '#a78bfa', fontSize: '0.75rem', fontWeight: 700, width: 44, textAlign: 'right' }}>{(factor.importance * 100).toFixed(1)}%</span>
    </div>
  );
}

const ALL_MODELS = [
  { key: 'random_forest', name: 'Random Forest', icon: '◈', color: '#667eea', desc: 'Ensemble of decision trees' },
  { key: 'xgboost', name: 'XGBoost', icon: '✦', color: '#4facfe', desc: 'Gradient boosted trees' },
  { key: 'gradient_boosting', name: 'Gradient Boosting', icon: '◎', color: '#f093fb', desc: 'Sequential boosting' },
  { key: 'logistic_regression', name: 'Logistic Regression', icon: '∿', color: '#00e676', desc: 'Linear model' },
  { key: 'decision_tree', name: 'Decision Tree', icon: '⬡', color: '#ff9800', desc: 'Single tree' },
  { key: 'svm', name: 'SVM', icon: '◌', color: '#ff6b6b', desc: 'Support vectors' },
  { key: 'knn', name: 'KNN', icon: '⊕', color: '#a78bfa', desc: 'K-nearest neighbors' },
];

/* ── Main page ─────────────────────────────────────────────────────────────── */

export default function MultiIndustry() {
  const [selectedIndustry, setSelectedIndustry] = useState('telecom');
  const [modelType, setModelType] = useState('random_forest');
  const [form, setForm] = useState({ ...STATIC_DEFAULTS.telecom });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [benchmarkData, setBenchmarkData] = useState(BENCHMARK);
  const [activeTab, setActiveTab] = useState('form');

  useEffect(() => {
    industryAPI.getBenchmark()
      .then(r => { if (r.data?.benchmark) setBenchmarkData(r.data.benchmark); })
      .catch(() => {});
  }, []);

  const handleIndustryChange = (key) => {
    setSelectedIndustry(key);
    setForm({ ...STATIC_DEFAULTS[key] });
    setResult(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const applyTemplate = (templateKey) => {
    const tpl = TEMPLATES[selectedIndustry]?.[templateKey];
    if (tpl) { setForm({ ...tpl }); setResult(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await industryAPI.predict(selectedIndustry, form, modelType);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const schema = FIELD_SCHEMAS[selectedIndustry] || [];
  const industry = INDUSTRIES.find(i => i.key === selectedIndustry);

  const riskColor = result
    ? result.risk_level === 'High' ? C.rose
      : result.risk_level === 'Medium' ? C.amber
      : C.emerald
    : C.slate;

  const maxImportance = result?.contributing_factors?.[0]?.importance || 1;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: 'rgba(99,102,241,0.2)', borderRadius: 12, padding: '6px 10px', display: 'flex' }}>
            <HiOutlineGlobe style={{ fontSize: '1.1rem', color: '#a78bfa' }} />
          </span>
          Multi-Industry Analytics
        </h1>
        <p>Predict customer churn across Telecom, Banking, E-commerce & Healthcare verticals</p>
      </div>

      {/* Industry Selector */}
      <div className="animate-fade-in-up" style={{ marginBottom: 28 }}>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Select Industry Vertical
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {INDUSTRIES.map((ind, idx) => {
            const isActive = selectedIndustry === ind.key;
            return (
              <div
                key={ind.key}
                onClick={() => handleIndustryChange(ind.key)}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${idx * 60}ms`,
                  padding: '20px 16px', borderRadius: 16, cursor: 'pointer',
                  border: `1.5px solid ${isActive ? ind.color : 'rgba(255,255,255,0.08)'}`,
                  background: isActive ? `${ind.color}12` : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.22s ease', position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = `${ind.color}60`; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ind.gradient, borderRadius: '16px 16px 0 0' }} />
                )}
                <div style={{ marginBottom: 10 }}>
                  <IndustryIcon industry={ind.key} size={32} color={isActive ? ind.color : '#94a3b8'} />
                </div>
                <div style={{ color: isActive ? ind.color : '#e2e8f0', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{ind.label}</div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', lineHeight: 1.4, marginBottom: 8 }}>{ind.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Avg churn:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: ind.color }}>{ind.avgChurn}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon={<IndustryIcon industry={selectedIndustry} size={22} color={industry?.color} />} label="Selected Industry" value={industry?.label} sub={industry?.description} color={industry?.color} delay={0} />
        <StatCard icon={<HiOutlineTrendingDown />} label="Industry Avg Churn" value={industry?.avgChurn} sub="Annual average" color={C.rose} delay={50} />
        <StatCard icon={<HiOutlineExclamation />} label="Top Risk Factor" value={industry?.topRisk} color={C.amber} delay={100} />
        <StatCard icon={<HiOutlineChip />} label="Active Model" value={ALL_MODELS.find(m => m.key === modelType)?.name} sub="Selected ML model" color={C.violet} delay={150} />
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'form', label: 'Predict', Icon: HiOutlineClipboardList },
          { key: 'benchmark', label: 'Benchmark', Icon: HiOutlineChartBar },
          { key: 'insights', label: 'Industry Insights', Icon: HiOutlineDocumentReport },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? '#a78bfa' : '#64748b',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.85rem', transition: 'all 0.2s',
              borderBottom: activeTab === tab.key ? '2px solid #8b5cf6' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <tab.Icon style={{ fontSize: '1rem' }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: PREDICT ═══ */}
      {activeTab === 'form' && (
        <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 360px' : '1fr', gap: 24 }}>
          <div>
            {/* Model Selector */}
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 20 }}>
              <h3 style={{ color: '#e2e8f0', marginBottom: 14, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HiOutlineAdjustments style={{ fontSize: '1rem' }} /> Choose Prediction Model
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {ALL_MODELS.map(m => (
                  <div
                    key={m.key}
                    onClick={() => setModelType(m.key)}
                    title={m.desc}
                    style={{
                      padding: '10px 4px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                      border: `1.5px solid ${modelType === m.key ? m.color : 'rgba(255,255,255,0.07)'}`,
                      background: modelType === m.key ? `${m.color}14` : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', marginBottom: 3 }}>{m.icon}</div>
                    <div style={{ color: modelType === m.key ? m.color : '#64748b', fontSize: '0.62rem', fontWeight: 600, lineHeight: 1.2 }}>{m.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick-Fill Templates */}
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 20, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HiOutlineLightningBolt style={{ fontSize: '0.9rem' }} /> Quick-Fill Templates
                </span>
                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Instant customer profiles</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { key: 'high_risk', label: 'High Risk', dot: C.rose, color: C.rose },
                  { key: 'medium_risk', label: 'Medium Risk', dot: C.amber, color: C.amber },
                  { key: 'low_risk', label: 'Low Risk', dot: C.emerald, color: C.emerald },
                ].map(tpl => (
                  <button
                    key={tpl.key}
                    onClick={() => applyTemplate(tpl.key)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${tpl.color}30`,
                      background: `${tpl.color}0d`, color: tpl.color, fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${tpl.color}1a`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${tpl.color}0d`; }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: tpl.dot, display: 'inline-block' }} />
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* Dynamic Form */}
            <form onSubmit={handleSubmit}>
              {schema.map((section, si) => (
                <div key={si} className="glass-card animate-fade-in-up" style={{ animationDelay: `${si * 80}ms`, marginBottom: 18 }}>
                  <h3 style={{ color: '#e2e8f0', marginBottom: 16, fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {SECTION_ICONS[section.section] || <HiOutlineViewGrid style={{ fontSize: 16 }} />}
                    {section.section}
                  </h3>
                  <div className="predict-form-grid">
                    {section.fields.map(field => (
                      <div key={field.key} className="form-group">
                        <label className="form-label">{field.label}</label>
                        {field.type === 'select' ? (
                          <select name={field.key} value={form[field.key] ?? ''} onChange={handleChange} className="form-select">
                            {field.options.map((opt, oi) => (
                              <option key={oi} value={opt}>{field.labels ? field.labels[oi] : String(opt)}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="number" name={field.key} value={form[field.key] ?? ''} onChange={handleChange}
                            className="form-input" min={field.min} max={field.max} step={field.step || 1} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                style={{ width: '100%', background: `linear-gradient(135deg, ${industry?.color || '#8b5cf6'}, #8b5cf6)` }}>
                {loading ? (
                  <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Analyzing {industry?.label} Data...</>
                ) : (
                  <>Predict {industry?.label} Churn</>
                )}
              </button>
            </form>
          </div>

          {/* Right: Result Panel */}
          {result && (
            <div style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
              <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  <IndustryIcon industry={selectedIndustry} size={18} color="#94a3b8" />
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                    {result.industry?.toUpperCase()} CHURN ANALYSIS
                  </span>
                </div>

                <div style={{
                  width: 160, height: 160, borderRadius: '50%', margin: '0 auto 16px',
                  background: `conic-gradient(${riskColor} ${(result.churn_probability * 360).toFixed(0)}deg, rgba(255,255,255,0.05) 0)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 40px ${riskColor}40`, position: 'relative',
                }}>
                  <div style={{
                    width: 130, height: 130, borderRadius: '50%', background: 'var(--bg-glass, #0f172a)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ color: riskColor, fontSize: '2.2rem', fontWeight: 900, lineHeight: 1 }}>
                      {(result.churn_probability * 100).toFixed(1)}%
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: 2 }}>churn risk</div>
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 20px', borderRadius: 24,
                  background: `${riskColor}18`, border: `1.5px solid ${riskColor}40`,
                  color: riskColor, fontWeight: 700, fontSize: '0.9rem', marginBottom: 12,
                }}>
                  {result.risk_level === 'High' ? '▲' : result.risk_level === 'Medium' ? '◈' : '✦'}
                  &nbsp;{result.risk_level} Risk — {result.churn_prediction === 1 ? 'Likely to Churn' : 'Likely to Stay'}
                </div>

                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Model: {result.model_used}</p>
              </div>

              {result.contributing_factors?.length > 0 && (
                <div className="glass-card animate-fade-in-up" style={{ marginBottom: 16 }}>
                  <h3 style={{ color: '#e2e8f0', marginBottom: 14, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HiOutlineSearchCircle style={{ fontSize: '1.1rem' }} /> Top Contributing Factors
                  </h3>
                  {result.contributing_factors.map((f, i) => (
                    <FactorBar key={i} factor={f} maxImportance={maxImportance} />
                  ))}
                </div>
              )}

              <div className="glass-card animate-fade-in-up" style={{ background: result.risk_level === 'High' ? 'rgba(244,63,94,0.05)' : result.risk_level === 'Medium' ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)', border: `1px solid ${riskColor}25` }}>
                <h3 style={{ color: riskColor, marginBottom: 12, fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {result.risk_level === 'High'
                    ? <><HiOutlineShieldExclamation style={{ fontSize: '1rem' }} /> Immediate Action</>
                    : result.risk_level === 'Medium'
                    ? <><HiOutlineLightningBolt style={{ fontSize: '1rem' }} /> Proactive Steps</>
                    : <><HiOutlineCheckCircle style={{ fontSize: '1rem' }} /> Maintain Engagement</>}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {getRecommendations(selectedIndustry, result.risk_level).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: '#cbd5e1' }}>
                      <span style={{ color: riskColor, flexShrink: 0 }}>–</span>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: BENCHMARK ═══ */}
      {activeTab === 'benchmark' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass-card animate-fade-in-up">
            <h3 style={{ color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineChartBar style={{ fontSize: '1.1rem' }} /> Cross-Industry Churn Rate Benchmark
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={benchmarkData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <XAxis dataKey="industry" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<BenchmarkTooltip />} />
                <Bar dataKey="avg_churn_rate" radius={[8, 8, 0, 0]} animationDuration={800}>
                  {benchmarkData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card animate-fade-in-up">
            <h3 style={{ color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineViewGrid style={{ fontSize: '1.1rem' }} /> Industry Risk Profiles
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {INDUSTRIES.map(ind => (
                <div
                  key={ind.key}
                  style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: selectedIndustry === ind.key ? `${ind.color}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedIndustry === ind.key ? ind.color : 'rgba(255,255,255,0.07)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onClick={() => { handleIndustryChange(ind.key); setActiveTab('form'); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <IndustryIcon industry={ind.key} size={22} color={ind.color} />
                      <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{ind.label}</span>
                    </div>
                    <span style={{ color: ind.color, fontWeight: 800, fontSize: '1.1rem' }}>{ind.avgChurn}</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HiOutlineExclamation style={{ fontSize: '0.85rem' }} /> {ind.topRisk}
                  </div>
                  <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${parseFloat(ind.avgChurn)}%`, height: '100%', background: ind.gradient, borderRadius: 4, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card animate-fade-in-up" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineViewGrid style={{ fontSize: '1.1rem' }} /> Industry Risk Radar — Key Metrics Comparison
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={[
                { metric: 'Churn Rate', telecom: 26.5, banking: 20.4, ecommerce: 22.1, healthcare: 18.7 },
                { metric: 'Retention Cost', telecom: 33, banking: 75, ecommerce: 12.5, healthcare: 100 },
                { metric: 'Predict Accuracy', telecom: 87, banking: 82, ecommerce: 79, healthcare: 76 },
                { metric: 'Avg Tenure Risk', telecom: 65, banking: 45, ecommerce: 70, healthcare: 40 },
                { metric: 'Seasonal Volatility', telecom: 30, banking: 20, ecommerce: 80, healthcare: 15 },
              ]} margin={{ top: 16, right: 40, bottom: 16, left: 40 }}>
                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                <Radar name="Telecom" dataKey="telecom" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                <Radar name="Banking" dataKey="banking" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Radar name="E-commerce" dataKey="ecommerce" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                <Radar name="Healthcare" dataKey="healthcare" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, fontSize: '0.78rem' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ TAB: INSIGHTS ═══ */}
      {activeTab === 'insights' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {INDUSTRIES.map((ind, idx) => (
            <div
              key={ind.key}
              className="glass-card animate-fade-in-up"
              style={{
                animationDelay: `${idx * 80}ms`,
                borderTop: `3px solid ${ind.color}`,
                cursor: 'pointer',
              }}
              onClick={() => { handleIndustryChange(ind.key); setActiveTab('form'); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <IndustryIcon industry={ind.key} size={32} color={ind.color} />
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.05rem' }}>{ind.label}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{ind.description}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ color: ind.color, fontWeight: 800, fontSize: '1.4rem' }}>{ind.avgChurn}</div>
                  <div style={{ color: '#64748b', fontSize: '0.68rem' }}>avg churn</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Risk Factors
                </div>
                {getIndustryRiskFactors(ind.key).map((factor, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ color: ind.color, fontSize: '0.7rem' }}>›</span>
                    <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{factor}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {getIndustryStats(ind.key).map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ color: ind.color, fontWeight: 700, fontSize: '0.95rem' }}>{stat.value}</div>
                    <div style={{ color: '#64748b', fontSize: '0.68rem' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, padding: '8px 12px', background: `${ind.color}0d`, border: `1px solid ${ind.color}25`, borderRadius: 8, fontSize: '0.75rem', color: ind.color, fontWeight: 600 }}>
                Analyze {ind.label} customers →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Static helpers ────────────────────────────────────────────────────────── */

function getRecommendations(industry, riskLevel) {
  const map = {
    telecom: {
      High: ['Offer contract upgrade with 3-month discount', 'Assign dedicated customer success rep', 'Proactively resolve any outstanding support tickets', 'Bundle additional services to increase switching cost'],
      Medium: ['Send personalized email with loyalty rewards', 'Offer optional service add-ons at discounted rate', 'Schedule proactive check-in call'],
      Low: ['Maintain current engagement cadence', 'Invite to referral/loyalty program', 'Upsell premium services opportunistically'],
    },
    banking: {
      High: ['Assign personal banker for high-touch outreach', 'Offer exclusive rate on savings product', 'Schedule financial wellness consultation', 'Provide exclusive credit card benefits'],
      Medium: ['Email campaign on new product offerings', 'Invite to financial planning webinar', 'Activate dormant digital banking features'],
      Low: ['Recognize loyalty with exclusive tier upgrade', 'Promote premium investment products', 'Encourage referral program participation'],
    },
    ecommerce: {
      High: ['Send win-back email with exclusive 30% discount', 'Trigger cart abandonment recovery sequence', 'Offer free shipping on next 3 orders', 'Assign VIP customer service agent'],
      Medium: ['Launch re-engagement email series', 'Provide personalized product recommendations', 'Offer loyalty points bonus for next purchase'],
      Low: ['Maintain subscription benefits & perks', 'Cross-sell complementary product categories', 'Invite to early-access product launches'],
    },
    healthcare: {
      High: ['Outreach call from care coordinator within 48hrs', 'Offer telehealth appointment scheduling', 'Review and simplify billing/payment plan', 'Connect with patient navigator for support'],
      Medium: ['Send appointment reminder sequence', 'Offer flexible scheduling options', 'Share personalized health education materials'],
      Low: ['Continue annual preventive care reminders', 'Enroll in patient loyalty/wellness program', 'Encourage peer referrals to the practice'],
    },
  };
  return (map[industry]?.[riskLevel] || []).slice(0, 4);
}

function getIndustryRiskFactors(industry) {
  const map = {
    telecom: ['Month-to-month contract holders', 'Electronic check payment users', 'Fiber optic without security add-ons', 'Low tenure (< 12 months)', 'Senior citizens without partner'],
    banking: ['Inactive members (not using services)', 'Single product holders', 'Low credit score (< 500)', 'Age 40–60 demographic', 'Germany geography segment'],
    ecommerce: ['No purchases in last 90+ days', 'High cart abandonment (> 70%)', 'Low email open rate (< 10%)', 'Free tier subscribers', 'Multiple support tickets'],
    healthcare: ['3+ appointment no-shows in 12mo', 'No visit in 6+ months', 'Low satisfaction score (≤ 4)', 'Uninsured or self-pay patients', 'No chronic care plan'],
  };
  return map[industry] || [];
}

function getIndustryStats(industry) {
  const map = {
    telecom: [{ value: '7', label: 'ML Models' }, { value: '19', label: 'Features' }, { value: '87%', label: 'Accuracy' }],
    banking: [{ value: '3', label: 'Geographies' }, { value: '10', label: 'Features' }, { value: '82%', label: 'Accuracy' }],
    ecommerce: [{ value: '4', label: 'Loyalty Tiers' }, { value: '10', label: 'Features' }, { value: '79%', label: 'Accuracy' }],
    healthcare: [{ value: '4', label: 'Insurance Types' }, { value: '10', label: 'Features' }, { value: '76%', label: 'Accuracy' }],
  };
  return map[industry] || [];
}
