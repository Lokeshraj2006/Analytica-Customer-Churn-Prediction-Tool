import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { access_token, refresh_token, user: userData } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (username, email, password, full_name, role = 'analyst') => {
    const response = await authAPI.register({ username, email, password, full_name, role });
    const { access_token, refresh_token, user: userData } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) await authAPI.logout();
    } catch (err) {
      console.warn('Backend logout failed:', err.message);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Role helpers
  const role = user?.role || 'analyst';
  const isAdmin = role === 'admin';
  const isAnalyst = role === 'analyst' || role === 'admin'; // admin can do everything analyst can
  const isViewer = role === 'viewer';
  const canPredict = role === 'analyst' || role === 'admin';
  const canDelete = role === 'admin';
  const canManageUsers = role === 'admin';
  const canExport = role === 'analyst' || role === 'admin';
  const canViewAnalytics = true; // all roles

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    role,
    isAdmin,
    isAnalyst,
    isViewer,
    canPredict,
    canDelete,
    canManageUsers,
    canExport,
    canViewAnalytics,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
