import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

// Import components
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Progress } from "./components/ui/progress";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserInfo();
    }
  }, [token]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      logout();
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Login Component
const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      login(response.data.token, response.data.user);
      toast.success(response.data.message);
      
      // Force redirect after successful login/registration
      window.location.href = '/';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Birdieo.ai
          </CardTitle>
          <CardDescription className="text-gray-600">
            Transform your golf experience with AI-powered shot recording
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={isLogin ? "login" : "register"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger 
                value="login" 
                onClick={() => setIsLogin(true)}
                className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                onClick={() => setIsLogin(false)}
                className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
              >
                Register
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required={!isLogin}
                    className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2.5"
                disabled={loading}
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streamHealth, setStreamHealth] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchRounds();
    checkStreamHealth();
  }, []);

  const fetchRounds = async () => {
    try {
      const response = await axios.get(`${API}/rounds`);
      setRounds(response.data);
    } catch (error) {
      console.error('Failed to fetch rounds:', error);
      toast.error('Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };

  const checkStreamHealth = async () => {
    try {
      const response = await axios.get(`${API}/stream/health`);
      setStreamHealth(response.data);
    } catch (error) {
      console.error('Stream health check failed:', error);
    }
  };

  const captureTestClip = async () => {
    try {
      const response = await axios.post(`${API}/stream/capture-clip`, {
        hole_number: 1
      });
      toast.success('Test clip captured successfully!');
      console.log('Captured clip:', response.data.clip);
    } catch (error) {
      toast.error('Failed to capture test clip');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your golf rounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Birdieo.ai
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={logout}
                className="border-gray-300 hover:bg-gray-50"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Live Stream Status */}
        <div className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Live Stream Status</span>
                <Badge variant={streamHealth?.ok ? "default" : "destructive"} className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  {streamHealth?.ok ? 'Active' : 'Inactive'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Stream Health</span>
                  <span className="font-semibold text-lg">
                    {streamHealth?.ok ? '✓ Online' : '✗ Offline'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Last Update</span>
                  <span className="font-semibold text-lg">
                    {streamHealth?.age_seconds ? `${streamHealth.age_seconds.toFixed(1)}s ago` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={captureTestClip}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  >
                    Capture Test Clip
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={checkStreamHealth}
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    Refresh Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Stream Preview */}
        <div className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Live Course View - Hole 1</CardTitle>
              <CardDescription>
                Real-time view from Lexington Golf Course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                {streamHealth?.ok ? (
                  <img 
                    src={`${API}/stream/frame`} 
                    alt="Live golf course view"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Stream not available</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Start a new round or manage your golf sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-20 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex flex-col">
                  <Calendar className="w-6 h-6 mb-2" />
                  <span>Start Check-in</span>
                </Button>
                <Button variant="outline" className="h-20 border-gray-300 hover:bg-gray-50 flex flex-col">
                  <div className="w-6 h-6 mb-2 bg-gray-400 rounded"></div>
                  <span>View Analytics</span>
                </Button>
                <Button variant="outline" className="h-20 border-gray-300 hover:bg-gray-50 flex flex-col">
                  <div className="w-6 h-6 mb-2 bg-gray-400 rounded"></div>
                  <span>Course Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rounds History */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Your Golf Rounds</CardTitle>
            <CardDescription>
              {rounds.length === 0 
                ? "No rounds yet. Start your first check-in to begin recording!"
                : `${rounds.length} round${rounds.length !== 1 ? 's' : ''} recorded`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rounds.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No rounds yet</h3>
                <p className="text-gray-500 mb-6">
                  Start your first check-in to begin recording your golf shots with AI-powered player recognition.
                </p>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                  Start Your First Round
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rounds.map((round) => (
                  <div 
                    key={round.id} 
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {round.course_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Subject ID: {round.subject_id}
                        </p>
                        <p className="text-sm text-gray-500">
                          Tee Time: {new Date(round.tee_time).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">
                          {round.handedness} handed
                        </Badge>
                        <div className="text-sm text-gray-500">
                          {round.player_photos?.length || 0} photos
                        </div>
                      </div>
                    </div>
                    {round.clothing_breakdown && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(round.clothing_breakdown).map(([item, description]) => (
                          <Badge key={item} variant="secondary" className="text-xs">
                            {item}: {description}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;