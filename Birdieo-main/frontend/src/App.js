import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Components
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Dashboard } from './components/Dashboard';
import { CheckinFlow } from './components/CheckinFlow';
import { RoundDetails } from './components/RoundDetails';
import { VisionDashboard } from './components/ComputerVision/VisionDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('birdieo_token'));

  useEffect(() => {
    if (token) {
      // Verify token and get user info
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('birdieo_token', newToken);
      setToken(newToken);
      setUser(userData);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${API}/auth/register`, { name, email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('birdieo_token', newToken);
      setToken(newToken);
      setUser(userData);
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('birdieo_token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const apiRequest = async (method, url, data = null) => {
    try {
      const config = {
        method,
        url: `${API}${url}`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        data
      };
      
      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || `${method.toUpperCase()} request failed`;
      toast.error(message);
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      apiRequest,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-800 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/checkin" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <CheckinFlow />
                  </ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/vision" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <VisionDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/round/:roundId" 
              element={
                <ProtectedRoute>
                  <RoundDetails />
                </ProtectedRoute>
              } 
            />
          </Routes>
          <Toaster 
            position="top-right" 
            richColors 
            expand={false}
            duration={4000}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export { useAuth };
export default App;