import { useState, useEffect, useRef } from 'react';
import { tuningAPI } from '../services/api';
import { Settings2, Zap, Hourglass, Clock, Trophy } from 'lucide-react';

const C = { violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', emerald: '#10b981', cyan: '#06b6d4', slate: '#64748b' };

const MODEL_META = {
  random_forest:    { name: 'Random Forest', icon: '◈', color: C.violet },
  xgboost:          { name: 'XGBoost', icon: '✦', color: C.cyan },
  gradient_boosting:{ name: 'Gradient Boosting', icon: '◎', color: '#f093fb' },
};

function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 10, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        width: `${Math.min(100, pct)}%`, height: '100%',
        background: `linear-gradient(90deg, ${color}, ${color}aa)`,
        borderRadius: 8, transition: 'width 0.5s ease',
        boxShadow: `0 0 8px ${color}66`,
      }} />
    </div>
  );
}

function MetricDelta({ baseline, best, label }) {
  const delta = ((best || 0) - (baseline || 0)) * 100;
  const isPositive = delta > 0;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Before</div>
          <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{((baseline || 0) * 100).toFixed(2)}%</div>
        </div>
        <div style={{ color: isPositive ? C.emerald : C.rose, fontSize: '1rem' }}>→</div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>After</div>
          <div style={{ color: C.emerald, fontWeight: 700 }}>{((best || 0) * 100).toFixed(2)}%</div>
        </div>
      </div>
      {delta !== 0 && (
        <div style={{ color: isPositive ? C.emerald : C.rose, fontSize: '0.75rem', fontWeight: 700, marginTop: 2 }}>
          {isPositive ? '+' : ''}{delta.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export default function Tuning() {
  const [paramSpaces, setParamSpaces] = useState(null);
  const [selectedModel, setSelectedModel] = useState('random_forest');
  const [searchMethod, setSearchMethod] = useState('random');
  const [cvFolds, setCvFolds] = useState(3);
  const [jobs, setJobs] = useState([]);
  const [runningJob, setRunningJob] = useState(null);
  const [launching, setLaunching] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    tuningAPI.getParamSpaces().then(r => setParamSpaces(r.data)).catch(() => {});
    loadJobs();
  }, []);

  const loadJobs = async () => {
    const r = await tuningAPI.getResults().catch(() => ({ data: [] }));
    setJobs(r.data || []);
    const running = (r.data || []).find(j => j.status === 'running' || j.status === 'pending');
    if (running) {
      setRunningJob(running.job_id);
      startPolling(running.job_id);
    }
  };

  const startPolling = (jobId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await tuningAPI.getStatus(jobId).catch(() => null);
      if (!r) return;
      const status = r.data;
      setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, status: status.status, progress: status.progress } : j));
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(pollRef.current);
        setRunningJob(null);
        loadJobs();
      }
    }, 3000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleStart = async () => {
    setLaunching(true);
    try {
      const r = await tuningAPI.start({ model_key: selectedModel, search_method: searchMethod, cv_folds: cvFolds });
      const job = r.data;
      setRunningJob(job.job_id);
      setJobs(prev => [{ job_id: job.job_id, model_key: selectedModel, search_method: searchMethod, status: 'pending', progress: 0 }, ...prev]);
      startPolling(job.job_id);
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to start tuning job');
    } finally {
      setLaunching(false);
    }
  };

  const [detail, setDetail] = useState(null);
  const showDetail = async (jobId) => {
    const r = await tuningAPI.getStatus(jobId).catch(() => null);
    if (r) setDetail(r.data);
  };

  const grid = paramSpaces?.param_grids?.[selectedModel] || {};
  const totalCombinations = Object.values(grid).reduce((acc, v) => acc * (v?.length || 1), 1);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <h1><Settings2 className="inline-block mr-2 text-gray-400" size={24} /> Hyperparameter Tuning</h1>
        <p>Grid Search & Randomized Search CV to optimize model performance — runs in background</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Launcher */}
        <div className="glass-card animate-fade-in-up">
          <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Launch Tuning Job</h3>

          {/* Model select */}
          <div className="form-group">
            <label className="form-label">Model to Tune</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {Object.entries(MODEL_META).map(([key, m]) => (
                <div
                  key={key}
                  onClick={() => setSelectedModel(key)}
                  style={{
                    flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                    border: `1.5px solid ${selectedModel === key ? m.color : 'rgba(255,255,255,0.1)'}`,
                    background: selectedModel === key ? `${m.color}15` : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ color: selectedModel === key ? m.color : '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>{m.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Search method */}
          <div className="form-group">
            <label className="form-label">Search Method</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['random', '⚡ Randomized (faster)', C.emerald], ['grid', '📋 Grid (exhaustive)', C.violet]].map(([val, label, color]) => (
                <div
                  key={val}
                  onClick={() => setSearchMethod(val)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: `1.5px solid ${searchMethod === val ? color : 'rgba(255,255,255,0.1)'}`,
                    background: searchMethod === val ? `${color}15` : 'rgba(255,255,255,0.03)',
                    color: searchMethod === val ? color : '#94a3b8',
                    fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cross-Validation Folds</label>
            <select className="form-select" value={cvFolds} onChange={e => setCvFolds(parseInt(e.target.value))}>
              {[2, 3, 5, 10].map(n => <option key={n} value={n}>{n}-Fold CV</option>)}
            </select>
          </div>

          {/* Param space preview */}
          {grid && Object.keys(grid).length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <p style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: 8 }}>Search Space ({totalCombinations} total combinations)</p>
              {Object.entries(grid).map(([param, vals]) => (
                <div key={param} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#94a3b8' }}>{param}</span>
                  <span style={{ color: '#e2e8f0' }}>{JSON.stringify(vals)}</span>
                </div>
              ))}
            </div>
          )}

          <p style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: 12 }}>
            ⏱ Estimated time: {searchMethod === 'grid' ? '10-20 min' : '3-8 min'} · Runs in background
          </p>

          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={launching || !!runningJob}
            style={{ width: '100%' }}
          >
            {launching ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Starting...</>
              : runningJob ? '⏳ Job in Progress...'
              : '▶ Start Tuning Job'}
          </button>
        </div>

        {/* Job detail pane */}
        <div className="glass-card animate-fade-in-up">
          <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Job Results</h3>
          {!detail ? (
            <p style={{ color: '#64748b', textAlign: 'center', paddingTop: 40 }}>Click a job below to view detailed results.</p>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 700 }}>Job #{detail.job_id} · {detail.model_key} · {detail.search_method}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Status: <span style={{ color: detail.status === 'completed' ? C.emerald : detail.status === 'failed' ? C.rose : C.amber }}>{detail.status}</span></div>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'right' }}>
                  {detail.completed_at && <div>Done: {new Date(detail.completed_at).toLocaleString()}</div>}
                </div>
              </div>

              {detail.status === 'completed' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
                    <MetricDelta baseline={detail.baseline?.accuracy} best={detail.best?.accuracy} label="Accuracy" />
                    <MetricDelta baseline={detail.baseline?.f1} best={detail.best?.f1} label="F1 Score" />
                    <MetricDelta baseline={detail.baseline?.roc_auc} best={detail.best?.roc_auc} label="ROC-AUC" />
                    <MetricDelta baseline={detail.baseline?.precision} best={detail.best?.precision} label="Precision" />
                    <MetricDelta baseline={detail.baseline?.recall} best={detail.best?.recall} label="Recall" />
                  </div>

                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                    <p style={{ color: C.emerald, fontWeight: 700, fontSize: '0.82rem', marginBottom: 4 }}>🏆 Best Parameters</p>
                    {Object.entries(detail.best?.params || {}).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '2px 0' }}>
                        <span style={{ color: '#94a3b8' }}>{k}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{JSON.stringify(v)}</span>
                      </div>
                    ))}
                  </div>

                  {detail.top_results?.length > 0 && (
                    <div>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 8 }}>Top CV Results</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead>
                          <tr>
                            {['Rank', 'ROC-AUC', 'Std', 'Params'].map(h => (
                              <th key={h} style={{ padding: '4px 8px', color: '#64748b', textAlign: 'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.top_results.slice(0, 5).map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '4px 8px', color: '#f59e0b' }}>#{r.rank}</td>
                              <td style={{ padding: '4px 8px', color: C.emerald, fontWeight: 700 }}>{r.mean_roc_auc}</td>
                              <td style={{ padding: '4px 8px', color: '#94a3b8' }}>±{r.std}</td>
                              <td style={{ padding: '4px 8px', color: '#94a3b8', fontSize: '0.68rem' }}>{JSON.stringify(r.params)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {detail.error_message && (
                <p style={{ color: C.rose, fontSize: '0.8rem' }}>Error: {detail.error_message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Job history */}
      <div className="glass-card animate-fade-in-up">
        <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Job History</h3>
        {jobs.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>No tuning jobs yet. Launch one above!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.map(j => {
              const m = MODEL_META[j.model_key] || {};
              const statusColor = j.status === 'completed' ? C.emerald : j.status === 'failed' ? C.rose : C.amber;
              const improv = j.improvement != null ? ((j.improvement || 0) * 100).toFixed(2) : null;
              return (
                <div
                  key={j.job_id}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => showDetail(j.job_id)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                      <div>
                        <span style={{ color: '#e2e8f0', fontWeight: 700 }}>#{j.job_id} — {m.name || j.model_key}</span>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: 8 }}>{j.search_method} search</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {improv !== null && j.status === 'completed' && (
                        <span style={{ color: parseFloat(improv) >= 0 ? C.emerald : C.rose, fontWeight: 700, fontSize: '0.85rem' }}>
                          {parseFloat(improv) >= 0 ? '+' : ''}{improv}% accuracy
                        </span>
                      )}
                      <span style={{ color: statusColor, fontWeight: 600, fontSize: '0.8rem', background: `${statusColor}15`, padding: '3px 10px', borderRadius: 20 }}>
                        {j.status}
                      </span>
                    </div>
                  </div>
                  {(j.status === 'running' || j.status === 'pending') && (
                    <ProgressBar pct={j.progress || 0} color={m.color || C.violet} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
