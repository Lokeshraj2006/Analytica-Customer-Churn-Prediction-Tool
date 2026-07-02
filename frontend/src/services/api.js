import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refresh_token: refreshToken });
          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Auth API
// ═══════════════════════════════════════════════════════════════════════════
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  refreshToken: (refresh_token) => api.post('/api/auth/refresh', { refresh_token }),
  getMe: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  resetPassword: (email, new_password) => api.post('/api/auth/reset-password', { email, new_password }),
  getUsers: () => api.get('/api/admin/users'),
  updateUserRole: (userId, role) => api.patch(`/api/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/api/admin/users/${userId}`),
  getAdminStats: () => api.get('/api/admin/stats'),
};

// ═══════════════════════════════════════════════════════════════════════════
// Prediction API
// ═══════════════════════════════════════════════════════════════════════════
export const predictionAPI = {
  predict: (data) => api.post('/api/predict/', data),
  getHistory: (skip = 0, limit = 50, riskLevel = null, industry = null) => {
    let url = `/api/predict/history?skip=${skip}&limit=${limit}`;
    if (riskLevel) url += `&risk_level=${riskLevel}`;
    if (industry) url += `&industry=${industry}`;
    return api.get(url);
  },
  getPrediction: (id) => api.get(`/api/predict/${id}`),
  deletePrediction: (id) => api.delete(`/api/predict/${id}`),
  getStats: () => api.get('/api/predict/stats'),
  getFeatureImportance: (modelType = 'random_forest') => api.get(`/api/predict/feature-importance?model_type=${modelType}`),
};

// ═══════════════════════════════════════════════════════════════════════════
// Customer API
// ═══════════════════════════════════════════════════════════════════════════
export const customerAPI = {
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/api/customers/?${query}`);
  },
  getAnalytics: () => api.get('/api/customers/analytics'),
};

// ═══════════════════════════════════════════════════════════════════════════
// Chat API
// ═══════════════════════════════════════════════════════════════════════════
export const chatAPI = {
  sendMessage: (message, predictionId = null, context = null, pageContext = null) =>
    api.post('/api/chat/', { message, prediction_id: predictionId, context, page_context: pageContext }),
  getHistory: (skip = 0, limit = 50) => api.get(`/api/chat/history?skip=${skip}&limit=${limit}`),
  clearHistory: () => api.delete('/api/chat/history'),
};

// ═══════════════════════════════════════════════════════════════════════════
// EDA API
// ═══════════════════════════════════════════════════════════════════════════
export const edaAPI = {
  getDatasetInfo: () => api.get('/api/eda/dataset-info'),
  getCorrelation: () => api.get('/api/eda/correlation'),
  getChurnDistribution: () => api.get('/api/eda/churn-distribution'),
  getModelComparison: () => api.get('/api/eda/model-comparison'),
  getAllFeatureImportances: () => api.get('/api/eda/feature-importance'),
  getModelFeatureImportance: (modelType) => api.get(`/api/eda/feature-importance/${modelType}`),
  getDataQuality: () => api.get('/api/eda/data-quality'),
};

// ═══════════════════════════════════════════════════════════════════════════
// V1.0 — SHAP API
// ═══════════════════════════════════════════════════════════════════════════
export const shapAPI = {
  getExplanation: (predictionId) => api.get(`/api/shap/${predictionId}`),
  getWaterfall: (predictionId) => api.get(`/api/shap/waterfall/${predictionId}`),
  getSummary: (modelType = 'random_forest', limit = 30, industry = null) => {
    let url = `/api/shap/summary?model_type=${modelType}&limit=${limit}`;
    if (industry) url += `&industry=${industry}`;
    return api.get(url);
  },
  computeAdhoc: (features, modelType = 'random_forest') =>
    api.post('/api/shap/compute', { features, model_type: modelType }),
};

// ═══════════════════════════════════════════════════════════════════════════
// V1.0 — CLV API
// ═══════════════════════════════════════════════════════════════════════════
export const clvAPI = {
  getSummary: (industry = null) => {
    let url = '/api/clv/summary';
    if (industry) url += `?industry=${industry}`;
    return api.get(url);
  },
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/api/clv/customers?${query}`);
  },
  getPredictionCLV: (predictionId) => api.get(`/api/clv/${predictionId}`),
};

// ═══════════════════════════════════════════════════════════════════════════
// V1.0 — What-If Simulator API
// ═══════════════════════════════════════════════════════════════════════════
export const simulatorAPI = {
  compare: (data) => api.post('/api/simulator/compare', data),
  batch: (data) => api.post('/api/simulator/batch', data),
  getPresets: (predictionId) => api.get(`/api/simulator/presets/${predictionId}`),
};

// ═══════════════════════════════════════════════════════════════════════════
// V1.0 — Segmentation API
// ═══════════════════════════════════════════════════════════════════════════
export const segmentAPI = {
  run: (nClusters = 4, industry = null) => {
    let url = `/api/segments/run?n_clusters=${nClusters}`;
    if (industry) url += `&industry=${industry}`;
    return api.post(url);
  },
  getSummary: (industry = null) => {
    let url = '/api/segments/summary';
    if (industry) url += `?industry=${industry}`;
    return api.get(url);
  },
  getCustomers: (segmentLabel = null, industry = null) => {
    const params = {};
    if (segmentLabel) params.segment_label = segmentLabel;
    if (industry) params.industry = industry;
    const query = new URLSearchParams(params).toString();
    return api.get(`/api/segments/customers?${query}`);
  },
  getHistory: () => api.get('/api/segments/history'),
};

// ═══════════════════════════════════════════════════════════════════════════
// V1.0 — Executive Dashboard API
// ═══════════════════════════════════════════════════════════════════════════
export const executiveAPI = {
  getSummary: (industry = null) => {
    let url = '/api/executive/summary';
    if (industry) url += `?industry=${industry}`;
    return api.get(url);
  },
  getInsights: (industry = null) => {
    let url = '/api/executive/insights';
    if (industry) url += `?industry=${industry}`;
    return api.get(url);
  },
  getAIInsights: (industry = null) => {
    let url = '/api/executive/ai-insights';
    if (industry) url += `?industry=${industry}`;
    return api.post(url);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// V1.0 — Hyperparameter Tuning API
// ═══════════════════════════════════════════════════════════════════════════
export const tuningAPI = {
  start: (data) => api.post('/api/tuning/start', data),
  getStatus: (jobId) => api.get(`/api/tuning/status/${jobId}`),
  getResults: () => api.get('/api/tuning/results'),
  getParamSpaces: () => api.get('/api/tuning/param-spaces'),
};

// ═══════════════════════════════════════════════════════════════════════════
// V5.0 — Multi-Industry Analytics API
// ═══════════════════════════════════════════════════════════════════════════
export const industryAPI = {
  predict: (industry, features, model_type = 'random_forest') =>
    api.post('/api/industry/predict', { industry, features, model_type }),
  listIndustries: () => api.get('/api/industry/industries'),
  getSchemas: () => api.get('/api/industry/schemas'),
  getSchema: (industry) => api.get(`/api/industry/schema/${industry}`),
  getTemplates: (industry) => api.get(`/api/industry/templates/${industry}`),
  getBenchmark: () => api.get('/api/industry/benchmark'),
};

export default api;

