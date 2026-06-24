import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatBot from './components/ChatBot';

// Existing pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import EDA from './pages/EDA';

// V4.0 new pages
import Explainability from './pages/Explainability';
import Simulator from './pages/Simulator';
import Segments from './pages/Segments';
import Executive from './pages/Executive';
import DataQuality from './pages/DataQuality';
import Tuning from './pages/Tuning';
import CLV from './pages/CLV';
import MultiIndustry from './pages/MultiIndustry';

function AppLayout({ children, predictionContext }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar collapsed={sidebarCollapsed} />
        {children}
      </div>
      <ChatBot predictionContext={predictionContext} />
    </div>
  );
}

const PR = ({ children, predictionContext }) => (
  <ProtectedRoute>
    <AppLayout predictionContext={predictionContext}>{children}</AppLayout>
  </ProtectedRoute>
);

function App() {
  const [predictionContext, setPredictionContext] = useState(null);

  return (
    <AuthProvider>
      <CurrencyProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Core pages */}
            <Route path="/dashboard" element={<PR predictionContext={predictionContext}><Dashboard /></PR>} />
            <Route path="/customers" element={<PR predictionContext={predictionContext}><Customers /></PR>} />
            <Route path="/analytics" element={<PR predictionContext={predictionContext}><Analytics /></PR>} />
            <Route path="/eda" element={<PR predictionContext={predictionContext}><EDA /></PR>} />
            <Route path="/predict" element={
              <PR predictionContext={predictionContext}>
                <Predict onPredictionContext={setPredictionContext} />
              </PR>
            } />

            {/* V4.0 new pages */}
            <Route path="/explainability" element={<PR predictionContext={predictionContext}><Explainability /></PR>} />
            <Route path="/explainability/:predictionId" element={<PR predictionContext={predictionContext}><Explainability /></PR>} />
            <Route path="/simulator" element={<PR predictionContext={predictionContext}><Simulator /></PR>} />
            <Route path="/segments" element={<PR predictionContext={predictionContext}><Segments /></PR>} />
            <Route path="/executive" element={<PR predictionContext={predictionContext}><Executive /></PR>} />
            <Route path="/data-quality" element={<PR predictionContext={predictionContext}><DataQuality /></PR>} />
            <Route path="/tuning" element={<PR predictionContext={predictionContext}><Tuning /></PR>} />
            <Route path="/clv" element={<PR predictionContext={predictionContext}><CLV /></PR>} />
            <Route path="/multi-industry" element={<PR predictionContext={predictionContext}><MultiIndustry /></PR>} />

            {/* Settings & Admin */}
            <Route path="/settings" element={<PR predictionContext={predictionContext}><Settings /></PR>} />
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout predictionContext={predictionContext}><AdminPanel /></AppLayout>
              </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
