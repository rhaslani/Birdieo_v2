import React, { useState, useEffect, useRef } from "react";
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
import { Video, Play, Pause, Camera, Users, BarChart3, Settings, Upload, Download, Eye, CheckCircle } from "lucide-react";
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

// Login Component with new Birdieo branding
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 bg-birdieo-navy rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Video className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-birdieo-navy mb-2">
              BIRDIEO.AI
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Transform your golf experience with AI-powered shot recording
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={isLogin ? "login" : "register"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
              <TabsTrigger 
                value="login" 
                onClick={() => setIsLogin(true)}
                className="data-[state=active]:bg-birdieo-navy data-[state=active]:text-white"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                onClick={() => setIsLogin(false)}
                className="data-[state=active]:bg-birdieo-navy data-[state=active]:text-white"
              >
                Register
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-birdieo-navy font-medium">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required={!isLogin}
                    className="border-2 border-gray-200 focus:border-birdieo-blue focus:ring-birdieo-blue"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-birdieo-navy font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="border-2 border-gray-200 focus:border-birdieo-blue focus:ring-birdieo-blue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-birdieo-navy font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  className="border-2 border-gray-200 focus:border-birdieo-blue focus:ring-birdieo-blue"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-birdieo-navy hover:bg-birdieo-navy/90 text-white font-semibold py-3 text-base"
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

// Live Video Stream Component with Computer Vision
const LiveVideoStream = ({ className = "", showDetection = false }) => {
  const [streamUrl, setStreamUrl] = useState(`${API}/stream/frame`);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [persons, setPersons] = useState([]);
  const [detectionEnabled, setDetectionEnabled] = useState(showDetection);
  const imgRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (imgRef.current) {
        // Use detection endpoint if enabled
        const endpoint = detectionEnabled ? '/stream/frame-with-detection' : '/stream/frame';
        setStreamUrl(`${API}${endpoint}?t=${Date.now()}`);
      }
    }, 2000); // Refresh every 2 seconds for better performance with AI processing

    return () => clearInterval(interval);
  }, [detectionEnabled]);

  // Fetch person tracking information
  useEffect(() => {
    if (detectionEnabled) {
      const fetchPersons = async () => {
        try {
          const response = await axios.get(`${API}/stream/persons`);
          setPersons(response.data.active_persons || []);
        } catch (error) {
          console.error('Failed to fetch persons:', error);
        }
      };

      const interval = setInterval(fetchPersons, 3000);
      fetchPersons(); // Initial fetch
      
      return () => clearInterval(interval);
    }
  }, [detectionEnabled]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const toggleDetection = () => {
    setDetectionEnabled(!detectionEnabled);
  };

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {/* Detection Toggle */}
      <div className="absolute top-3 left-3 z-10">
        <Button
          size="sm"
          onClick={toggleDetection}
          className={`${detectionEnabled 
            ? 'bg-birdieo-navy hover:bg-birdieo-navy/90 text-white' 
            : 'bg-white hover:bg-gray-50 text-birdieo-navy border border-gray-300'
          } text-xs`}
        >
          <Eye className="w-3 h-3 mr-1" />
          {detectionEnabled ? 'Hide Detection' : 'Show Detection'}
        </Button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-5">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-birdieo-navy mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">
              {detectionEnabled ? 'Processing with AI...' : 'Loading stream...'}
            </p>
          </div>
        </div>
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Stream temporarily unavailable</p>
          </div>
        </div>
      ) : (
        <img 
          ref={imgRef}
          src={streamUrl}
          alt="Live golf course view"
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      
      {/* Live indicator */}
      <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center z-10">
        <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
        LIVE
      </div>

      {/* Person Count Indicator */}
      {detectionEnabled && persons.length > 0 && (
        <div className="absolute bottom-3 left-3 bg-birdieo-navy text-white px-3 py-1 rounded-full text-xs font-medium z-10">
          <Users className="w-3 h-3 mr-1 inline" />
          {persons.length} Person{persons.length !== 1 ? 's' : ''} Detected
        </div>
      )}
    </div>
  );
};

// Dashboard Component with new Birdieo design
const Dashboard = () => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streamHealth, setStreamHealth] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchRounds();
    checkStreamHealth();
    
    // Refresh stream health every 30 seconds
    const interval = setInterval(checkStreamHealth, 30000);
    return () => clearInterval(interval);
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
      setStreamHealth({ ok: false, age_seconds: null });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-birdieo-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your golf rounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-birdieo-navy rounded-lg flex items-center justify-center mr-3">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-birdieo-navy">
                BIRDIEO.AI
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback className="bg-birdieo-blue text-white">
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
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-birdieo-navy">Live Stream Status</CardTitle>
                  <CardDescription>Real-time monitoring of golf course cameras</CardDescription>
                </div>
                <Badge 
                  variant={streamHealth?.ok ? "default" : "destructive"} 
                  className={streamHealth?.ok ? "bg-green-100 text-green-800 border-green-200" : ""}
                >
                  {streamHealth?.ok ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 mb-1">Stream Health</span>
                  <span className="font-semibold text-lg text-birdieo-navy">
                    {streamHealth?.ok ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 mb-1">Last Update</span>
                  <span className="font-semibold text-lg text-birdieo-navy">
                    {streamHealth?.age_seconds ? `${streamHealth.age_seconds.toFixed(1)}s ago` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={captureTestClip}
                    className="bg-birdieo-navy hover:bg-birdieo-navy/90 text-white"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Test Clip
                  </Button>
                </div>
                <div className="flex items-center">
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

        {/* Live Course View with Computer Vision */}
        <div className="mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-birdieo-navy">
                    Live Course View - Hole 1 with AI Person Detection
                  </CardTitle>
                  <CardDescription>
                    Real-time view from Lexington Golf Course with computer vision person tracking
                  </CardDescription>
                </div>
                <Badge className="bg-birdieo-blue/10 text-birdieo-blue border-birdieo-blue/20">
                  AI Vision Enabled
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <LiveVideoStream className="aspect-video" showDetection={true} />
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                    <span>Green boxes: Detected persons with unique IDs</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span>Red dots: Person center points</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-birdieo-navy">Quick Actions</CardTitle>
              <CardDescription>
                Start a new round or manage your golf sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button className="h-24 bg-birdieo-navy hover:bg-birdieo-navy/90 text-white flex flex-col justify-center">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="font-medium">Start Check-in</span>
                </Button>
                <Button variant="outline" className="h-24 border-2 border-gray-200 hover:bg-gray-50 flex flex-col justify-center">
                  <BarChart3 className="w-8 h-8 mb-2 text-birdieo-navy" />
                  <span className="font-medium text-birdieo-navy">View Analytics</span>
                </Button>
                <Button variant="outline" className="h-24 border-2 border-gray-200 hover:bg-gray-50 flex flex-col justify-center">
                  <Users className="w-8 h-8 mb-2 text-birdieo-navy" />
                  <span className="font-medium text-birdieo-navy">Manage Players</span>
                </Button>
                <Button variant="outline" className="h-24 border-2 border-gray-200 hover:bg-gray-50 flex flex-col justify-center">
                  <Settings className="w-8 h-8 mb-2 text-birdieo-navy" />
                  <span className="font-medium text-birdieo-navy">Course Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rounds History */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-birdieo-navy">Your Golf Rounds</CardTitle>
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
                <Video className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No rounds yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Start your first check-in to begin recording your golf shots with AI-powered player recognition.
                </p>
                <Button className="bg-birdieo-navy hover:bg-birdieo-navy/90 text-white">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Your First Round
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rounds.map((round) => (
                  <div 
                    key={round.id} 
                    className="p-6 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h4 className="font-semibold text-birdieo-navy text-lg mr-3">
                            {round.course_name}
                          </h4>
                          <Badge variant="outline" className="bg-birdieo-blue/10 text-birdieo-blue border-birdieo-blue/20">
                            {round.handedness} handed
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Subject ID:</span> {round.subject_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Tee Time:</span> {new Date(round.tee_time).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Photos:</span> {round.player_photos?.length || 0} captured
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="border-birdieo-blue text-birdieo-blue hover:bg-birdieo-blue hover:text-white">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50">
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                    {round.clothing_breakdown && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(round.clothing_breakdown).map(([item, description]) => (
                          <Badge key={item} variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                            <span className="font-medium">{item}:</span> {description}
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