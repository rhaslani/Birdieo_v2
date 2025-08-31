import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from '../App';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  User, 
  LogOut,
  Play,
  TrendingUp,
  Award,
  Camera,
  Eye,
  Target
} from 'lucide-react';

export const Dashboard = () => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout, apiRequest } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    setLoading(true);
    const result = await apiRequest('GET', '/rounds');
    if (result.success) {
      setRounds(result.data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const variants = {
      scheduled: 'status-scheduled',
      active: 'status-active', 
      completed: 'status-completed'
    };
    
    return (
      <Badge className={`status-badge ${variants[status]}`}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-golf mx-auto mb-4"></div>
          <p className="text-emerald-800 font-medium">Loading your rounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="glass-card border-0 shadow-lg sticky top-0 z-50 mb-8">
        <div className="container-padding py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_b432ac39-e954-4a9f-affa-6f7c24334e04/artifacts/hv3qu3ev_Birdieo-logo.png" 
                alt="Birdieo" 
                className="birdieo-logo w-12 h-12"
              />
              <div>
                <h1 className="text-2xl font-bold text-emerald-800">Birdieo</h1>
                <p className="text-emerald-600 text-sm">Your Golf Shots, Automatically Captured</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-semibold text-emerald-800">{user?.name}</p>
                <p className="text-emerald-600 text-sm">{user?.email}</p>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                className="btn-golf-secondary"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-padding">
        {/* Welcome Section */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-emerald-800 mb-4">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-emerald-600 text-lg mb-8">
            Ready to capture your next round? Your shots are waiting to be recorded.
          </p>
          
          <Link to="/checkin">
            <Button className="btn-golf-primary group mr-4">
              <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
              Start New Round
            </Button>
          </Link>
          
          <Link to="/vision">
            <Button className="btn-golf-secondary group">
              <Eye className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
              AI Vision System
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <Award className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-emerald-800">{rounds.length}</h3>
              <p className="text-emerald-600">Total Rounds</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <Video className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-emerald-800">
                {rounds.reduce((total, round) => total + (round.clips_count || 0), 0)}
              </h3>
              <p className="text-emerald-600">Shots Captured</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <Camera className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-emerald-800">
                {rounds.filter(r => r.status === 'active').length}
              </h3>
              <p className="text-emerald-600">Active Rounds</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Rounds */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-emerald-800">Your Rounds</h3>
            {rounds.length > 0 && (
              <Link to="/checkin">
                <Button className="btn-golf-secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  New Round
                </Button>
              </Link>
            )}
          </div>

          {rounds.length === 0 ? (
            <Card className="glass-card border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Camera className="h-16 w-16 text-emerald-400 mx-auto mb-6" />
                <h4 className="text-2xl font-bold text-emerald-800 mb-4">No rounds yet</h4>
                <p className="text-emerald-600 text-lg mb-8">
                  Start your first round to begin capturing your golf shots automatically
                </p>
                <Link to="/checkin">
                  <Button className="btn-golf-primary">
                    <Plus className="h-5 w-5 mr-2" />
                    Start Your First Round
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {rounds.map((round) => (
                <Card key={round.id} className="course-card fade-in">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <h4 className="text-xl font-bold text-emerald-800">
                            {round.course_name}
                          </h4>
                          {getStatusBadge(round.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-emerald-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{formatDate(round.tee_time)}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{formatTime(round.tee_time)}</span>
                          </div>
                          <div className="flex items-center">
                            <Video className="h-4 w-4 mr-2" />
                            <span>{round.clips_count || 0} shots captured</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center mt-4 text-emerald-600">
                          <User className="h-4 w-4 mr-2" />
                          <span className="capitalize">{round.handedness} handed</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <Link to={`/round/${round.id}`}>
                          <Button className="btn-golf-primary">
                            <Play className="h-4 w-4 mr-2" />
                            View Round
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mb-12">
          <h3 className="text-3xl font-bold text-emerald-800 text-center mb-8">
            How Birdieo Works
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="glass-card border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <User className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
                <h4 className="text-xl font-bold text-emerald-800 mb-4">Check In</h4>
                <p className="text-emerald-600">
                  Simple check-in with tee time, handedness, and photo capture for identification
                </p>
              </CardContent>
            </Card>
            
            <Card className="glass-card border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <Camera className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
                <h4 className="text-xl font-bold text-emerald-800 mb-4">Auto Capture</h4>
                <p className="text-emerald-600">
                  AI-powered cameras automatically detect and record your shots across all 18 holes
                </p>
              </CardContent>
            </Card>
            
            <Card className="glass-card border-0 shadow-lg text-center">
              <CardContent className="p-8">
                <Video className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
                <h4 className="text-xl font-bold text-emerald-800 mb-4">Instant Access</h4>
                <p className="text-emerald-600">
                  View, share, and download your shots immediately after each hole
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};