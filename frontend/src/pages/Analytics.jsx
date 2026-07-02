import { useState, useEffect } from 'react';
import { customerAPI, predictionAPI, edaAPI } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#667eea', '#764ba2', '#4facfe', '#00e676', '#ff6b6b', '#ff9800'];
const MODEL_COLORS = ['#667eea','#f093fb','#4facfe','#ff9800','#ff6b6b','#00e676','#a78bfa'];

export default function Analytics() {
  const { format } = useCurrency();
  const [analytics, setAnalytics] = useState(null);
  const [featureImportance, setFeatureImportance] = useState({ rf: [], dt: [] });
  const [allModels, setAllModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, rfRes, dtRes, modelsRes] = await Promise.all([
        customerAPI.getAnalytics().catch(() => ({ data: null })),
        predictionAPI.getFeatureImportance('random_forest').catch(() => ({ data: [] })),
        predictionAPI.getFeatureImportance('decision_tree').catch(() => ({ data: [] })),
        edaAPI.getModelComparison().catch(() => ({ data: null })),
      ]);
      setAnalytics(analyticsRes.data);
      setFeatureImportance({ rf: rfRes.data || [], dt: dtRes.data || [] });
      if (modelsRes.data?.models) setAllModels(modelsRes.data.models);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '0.82rem',
        }}>
          <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>{label}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color || entry.fill, margin: 0 }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const contractData = analytics?.churnByContract || [];
  const internetData = analytics?.churnByInternet || [];
  const paymentData = analytics?.churnByPayment || [];
  const tenureData = analytics?.tenureDistribution || [];
  const chargesData = analytics?.chargesDistribution || [];
  const overall = analytics?.overall || {};

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1>Analytics</h1>
        <p>Deep-dive into churn patterns and model performance</p>
      </div>

      {/* Overall Stats */}
      {overall.totalCustomers && (
        <div className="stats-grid stagger-children" style={{ marginBottom: 24 }}>
          <div className="stat-card blue animate-fade-in-up">
            <div className="stat-card-header">
              <span className="stat-card-label">Total Customers</span>
            </div>
            <div className="stat-card-value">{overall.totalCustomers?.toLocaleString()}</div>
          </div>
          <div className="stat-card red animate-fade-in-up">
            <div className="stat-card-header">
              <span className="stat-card-label">Overall Churn Rate</span>
            </div>
            <div className="stat-card-value">{overall.overallChurnRate}%</div>
          </div>
          <div className="stat-card green animate-fade-in-up">
            <div className="stat-card-header">
              <span className="stat-card-label">Avg Monthly Charges</span>
            </div>
            <div className="stat-card-value">{format(overall.avgMonthlyCharges)}</div>
          </div>
          <div className="stat-card purple animate-fade-in-up">
            <div className="stat-card-header">
              <span className="stat-card-label">Avg Tenure</span>
            </div>
            <div className="stat-card-value">{overall.avgTenure} mo</div>
          </div>
        </div>
      )}

      <div className="analytics-grid stagger-children">
        {/* Churn by Contract */}
        <div className="glass-card animate-fade-in-up">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Churn by Contract Type</h3>
              <p className="chart-subtitle">Churn rate across contract types</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={contractData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="contract" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.82rem' }} />
              <Bar dataKey="total" name="Total" fill="#667eea" radius={[4, 4, 0, 0]} />
              <Bar dataKey="churned" name="Churned" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Churn by Internet Service */}
        <div className="glass-card animate-fade-in-up">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Churn by Internet Service</h3>
              <p className="chart-subtitle">Internet type impact on churn</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={internetData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="churned"
                nameKey="service"
                label={({ service, churnRate }) => `${service}: ${churnRate}%`}
                labelLine={{ stroke: '#94a3b8' }}
              >
                {internetData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Churn by Payment Method */}
        <div className="glass-card animate-fade-in-up">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Churn by Payment Method</h3>
              <p className="chart-subtitle">Payment method vs. churn rate</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={paymentData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="method"
                tick={{ fill: '#e2e8f0', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="churnRate" name="Churn Rate %" fill="#764ba2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tenure Distribution */}
        <div className="glass-card animate-fade-in-up">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Tenure vs. Churn</h3>
              <p className="chart-subtitle">How customer tenure affects churn</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={tenureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Months', position: 'bottom', fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.82rem' }} />
              <Bar dataKey="total" name="Total" fill="#4facfe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="churned" name="Churned" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Comparison — all models */}
        <div className="glass-card analytics-full animate-fade-in-up">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">All Models — Accuracy Comparison</h3>
              <p className="chart-subtitle">
                {allModels.length > 0
                  ? `${allModels.length} algorithms ranked by accuracy (trained with SMOTE balancing)`
                  : 'Random Forest vs. Decision Tree — Top 8 feature importances'}
              </p>
            </div>
          </div>
          {allModels.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={allModels.map(m => ({
                  name: m.display_name,
                  Accuracy: +(m.accuracy * 100).toFixed(1),
                  'F1 Score': +(m.f1_score * 100).toFixed(1),
                  'ROC-AUC': +(m.roc_auc * 100).toFixed(1),
                }))}
                margin={{ bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={70} />
                <YAxis domain={[50, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} formatter={v => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '0.82rem' }} />
                <Bar dataKey="Accuracy" fill="#667eea" radius={[4, 4, 0, 0]} />
                <Bar dataKey="F1 Score" fill="#f093fb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ROC-AUC" fill="#4facfe" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={featureImportance.rf.slice(0, 8).map((f, i) => ({
                  feature: f.feature,
                  'Random Forest': f.importance,
                  'Decision Tree': featureImportance.dt[i]?.importance || 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="feature" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.82rem' }} />
                <Bar dataKey="Random Forest" fill="#667eea" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Decision Tree" fill="#f093fb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
