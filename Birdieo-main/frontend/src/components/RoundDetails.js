import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../App';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Video,
  Play,
  Pause,
  Download,
  Share2,
  ExternalLink,
  Camera,
  Trophy
} from 'lucide-react';

export const RoundDetails = () => {
  const { roundId } = useParams();
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const { apiRequest } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRoundDetails();
  }, [roundId]);

  const loadRoundDetails = async () => {
    setLoading(true);
    const result = await apiRequest('GET', `/rounds/${roundId}`);
    if (result.success) {
      setRound(result.data);
    } else {
      navigate('/');
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
      weekday: 'long',
      month: 'long',
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

  const handleClipPlay = (clip) => {
    setSelectedClip(clip);
    setIsVideoModalOpen(true);
    setIsVideoPlaying(false);
    setVideoProgress(0);
  };

  // Golf shot preview images and videos for different holes
  const getGolfShotData = (holeNumber) => {
    const golfData = {
      1: {
        image: 'https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxwZWJibGUlMjBiZWFjaHxlbnwwfHx8fDE3NTY2NTM5Mjl8MA&ixlib=rb-4.1.0&q=85',
        angle: 'Live Camera - Pebble Beach Putting Green',
        description: 'LIVE: Pebble Beach Golf Links putting green',
        videoType: 'live_stream',
        videoUrl: 'https://www.pebblebeach.com/golf/pebble-beach-golf-links/live-golf-cams/pebble-beach-golf-links-putting-green/'
      },
      3: {
        image: 'https://images.unsplash.com/photo-1591491640784-3232eb748d4b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxnb2xmJTIwc3dpbmd8ZW58MHx8fHwxNzU2NjUzOTI5fDA&ixlib=rb-4.1.0&q=85',
        angle: 'Side Camera - Approach',
        description: 'Beautiful follow-through on approach',
        videoType: 'approach'
      },
      5: {
        image: 'https://images.unsplash.com/photo-1662224107406-cfbd51edd90c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwzfHxnb2xmJTIwc3dpbmd8ZW58MHx8fHwxNzU2NjUzOTI5fDA&ixlib=rb-4.1.0&q=85',
        angle: 'Impact Camera - Fairway',
        description: 'Impact moment captured perfectly',
        videoType: 'iron'
      },
      7: {
        image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHw0fHxnb2xmJTIwc3dpbmd8ZW58MHx8fHwxNzU2NjUzOTI5fDA&ixlib=rb-4.1.0&q=85',
        angle: 'Overhead Camera - Long Drive',
        description: 'Dramatic swing against clear sky',
        videoType: 'long_drive'
      },
      9: {
        image: 'https://images.pexels.com/photos/1325653/pexels-photo-1325653.jpeg',
        angle: 'Rear Camera - Follow Through',
        description: 'Powerful drive with great form',
        videoType: 'drive'
      },
      12: {
        image: 'https://images.pexels.com/photos/1637731/pexels-photo-1637731.jpeg',
        angle: 'Close-up Camera - Short Game',
        description: 'Smooth putting stroke',
        videoType: 'putt'
      },
      15: {
        image: 'https://images.unsplash.com/photo-1562589461-cd172cbacbeb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxnb2xmJTIwcHV0dGluZ3xlbnwwfHx8fDE3NTY2NTM5MzV8MA&ixlib=rb-4.1.0&q=85',
        angle: 'Green Camera - Putting',
        description: 'Ball rolling toward the pin',
        videoType: 'putt'
      },
      18: {
        image: 'https://images.unsplash.com/photo-1621005570352-6418df03796b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxnb2xmJTIwcHV0dGluZ3xlbnwwfHx8fDE3NTY2NTM5MzV8MA&ixlib=rb-4.1.0&q=85',
        angle: 'Pin Camera - Final Putt',
        description: 'Final hole finishing shot',
        videoType: 'final_putt'
      }
    };
    return golfData[holeNumber] || golfData[1];
  };

  const playVideo = (clip) => {
    setIsVideoPlaying(true);
    setVideoProgress(0);
    
    // Simulate video playback progress
    const duration = clip.duration_sec * 1000; // Convert to milliseconds
    const interval = 100; // Update every 100ms
    const steps = duration / interval;
    const progressStep = 100 / steps;
    
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += progressStep;
      setVideoProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        setIsVideoPlaying(false);
        setVideoProgress(100);
        
        // Reset after a brief pause
        setTimeout(() => {
          setVideoProgress(0);
        }, 1000);
      }
    }, interval);
  };

  const getGolfShotImage = (holeNumber) => {
    return getGolfShotData(holeNumber).image;
  };

  const getHoleDescription = (holeNumber) => {
    return getGolfShotData(holeNumber).description;
  };

  const getCameraAngle = (holeNumber) => {
    return getGolfShotData(holeNumber).angle;
  };

  const handleShare = async (clip) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My shot from Hole ${clip.hole_number}`,
          text: `Check out my golf shot from ${round.course_name}!`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const renderHoleGrid = () => {
    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const clipsMap = (round?.clips || []).reduce((acc, clip) => {
      acc[clip.hole_number] = clip;
      return acc;
    }, {});

    return (
      <div className="grid grid-cols-6 md:grid-cols-9 gap-4">
        {holes.map((holeNum) => {
          const clip = clipsMap[holeNum];
          const hasClip = !!clip;
          
          return (
            <div
              key={holeNum}
              className={`hole-indicator ${hasClip ? 'has-clip' : ''} ${
                hasClip ? 'cursor-pointer' : 'cursor-default opacity-50'
              }`}
              onClick={hasClip ? () => handleClipPlay(clip) : undefined}
            >
              {holeNum}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-golf mx-auto mb-4"></div>
          <p className="text-emerald-800 font-medium">Loading round details...</p>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <Card className="glass-card border-0 shadow-2xl max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-emerald-800 mb-4">Round Not Found</h2>
            <p className="text-emerald-600 mb-6">
              The round you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/')} className="btn-golf-primary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="glass-card border-0 shadow-lg mb-8">
        <div className="container-padding py-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => navigate('/')}
              className="btn-golf-secondary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center space-x-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_b432ac39-e954-4a9f-affa-6f7c24334e04/artifacts/hv3qu3ev_Birdieo-logo.png" 
                alt="Birdieo" 
                className="birdieo-logo w-10 h-10"
              />
              <div className="text-right">
                <h1 className="text-xl font-bold text-emerald-800">Round Details</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container-padding">
        {/* Round Info */}
        <Card className="glass-card border-0 shadow-lg mb-8 fade-in">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-3xl font-bold text-emerald-800">
                    {round.course_name}
                  </h2>
                  {getStatusBadge(round.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-emerald-600">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-sm">{formatDate(round.tee_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-medium">Tee Time</p>
                      <p className="text-sm">{formatTime(round.tee_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-medium">Player</p>
                      <p className="text-sm capitalize">{round.handedness} handed</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Video className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-medium">Shots</p>
                      <p className="text-sm">{round.clips?.length || 0} captured</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-6 text-center">
                  <Camera className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-emerald-800">{round.clips?.length || 0}</h3>
                  <p className="text-emerald-600">Shots Captured</p>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-blue-800">
                    {Math.round(((round.clips?.length || 0) / 18) * 100)}%
                  </h3>
                  <p className="text-blue-600">Coverage Rate</p>
                </CardContent>
              </Card>
              
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6 text-center">
                  <Play className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-orange-800">
                    {round.clips?.reduce((total, clip) => total + clip.duration_sec, 0) || 0}s
                  </h3>
                  <p className="text-orange-600">Total Duration</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Course Map */}
        <Card className="glass-card border-0 shadow-lg mb-8 slide-up">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center">
              <MapPin className="mr-3 h-6 w-6" />
              Course Map - Hole by Hole
            </CardTitle>
            <CardDescription className="text-emerald-600">
              Click on holes with checkmarks to view your shots
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            {renderHoleGrid()}
            
            <div className="mt-8 flex items-center justify-center space-x-8 text-sm text-emerald-600">
              <div className="flex items-center">
                <div className="hole-indicator has-clip w-8 h-8 text-xs mr-2">✓</div>
                <span>Shot Captured</span>
              </div>
              <div className="flex items-center">
                <div className="hole-indicator opacity-50 w-8 h-8 text-xs mr-2">-</div>
                <span>No Shot Available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clips Grid */}
        {round.clips && round.clips.length > 0 && (
          <Card className="glass-card border-0 shadow-lg mb-8 fade-in">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center">
                <Video className="mr-3 h-6 w-6" />
                Your Golf Shots
              </CardTitle>
              <CardDescription className="text-emerald-600">
                View, share, and download your captured shots
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="clips-grid">
                {round.clips.map((clip) => (
                  <Card key={clip.id} className="course-card overflow-hidden">
                    <div 
                      className="relative h-40 cursor-pointer group overflow-hidden"
                      onClick={() => handleClipPlay(clip)}
                    >
                      {/* Golf shot thumbnail image */}
                      <img 
                        src={getGolfShotImage(clip.hole_number)}
                        alt={`Golf shot hole ${clip.hole_number}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      
                      {/* Play button overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                        <div className="bg-white bg-opacity-80 rounded-full p-3 group-hover:bg-opacity-100 transition-all group-hover:scale-110">
                          <Play className="h-8 w-8 text-emerald-800 fill-emerald-800" />
                        </div>
                      </div>
                      
                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {clip.duration_sec}s
                      </div>
                      
                      {/* Hole number badge */}
                      <div className="absolute top-2 left-2 bg-emerald-600 text-white text-sm font-bold px-2 py-1 rounded">
                        #{clip.hole_number}
                      </div>
                      
                      {/* Camera angle badge */}
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        {getCameraAngle(clip.hole_number).split(' - ')[0]}
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-emerald-800">
                          Hole {clip.hole_number}
                        </h4>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(clip);
                            }}
                            className="btn-golf-secondary text-xs px-2 py-1"
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(clip.hls_manifest, '_blank');
                            }}
                            className="btn-golf-secondary text-xs px-2 py-1"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-emerald-600 text-sm mb-1">
                        {getHoleDescription(clip.hole_number)}
                      </p>
                      <p className="text-blue-600 text-xs">
                        📹 {getCameraAngle(clip.hole_number)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Clips State */}
        {(!round.clips || round.clips.length === 0) && (
          <Card className="glass-card border-0 shadow-lg mb-8">
            <CardContent className="p-12 text-center">
              <Camera className="h-16 w-16 text-emerald-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-emerald-800 mb-4">
                No shots captured yet
              </h3>
              <p className="text-emerald-600 text-lg mb-8">
                Your shots will appear here as you play through the course. 
                Our cameras are actively monitoring and will capture your swings automatically.
              </p>
              {round.status === 'scheduled' && (
                <Badge className="status-badge status-scheduled">
                  Round hasn't started yet
                </Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Video Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-emerald-800">
              <Play className="mr-2 h-5 w-5" />
              Hole {selectedClip?.hole_number} - Your Shot
            </DialogTitle>
            <DialogDescription className="text-emerald-600">
              Duration: {selectedClip?.duration_sec}s • Captured automatically
            </DialogDescription>
          </DialogHeader>
          
          <div className="golf-video-container">
            <div className="aspect-video relative overflow-hidden bg-black">
              {/* Special handling for Hole 1 - Show actual Pebble Beach live stream */}
              {selectedClip?.hole_number === 1 ? (
                <div className="w-full h-full">
                  <iframe
                    src="https://www.pebblebeach.com/golf/pebble-beach-golf-links/live-golf-cams/pebble-beach-golf-links-putting-green/"
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    title="Pebble Beach Live Golf Cam - Hole 1"
                  />
                  
                  {/* Live stream overlay */}
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold animate-pulse">
                    🔴 LIVE - Pebble Beach Putting Green
                  </div>
                  
                  {/* Video info overlay */}
                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">LIVE: Pebble Beach Golf Links</h3>
                    <p className="text-white text-opacity-90 mb-1">
                      Hole {selectedClip?.hole_number} • Live Stream
                    </p>
                    <p className="text-white text-opacity-75 text-sm mb-2">
                      {getHoleDescription(selectedClip?.hole_number)}
                    </p>
                    <p className="text-blue-300 text-sm mb-2">
                      📹 {getCameraAngle(selectedClip?.hole_number)}
                    </p>
                    <p className="text-white text-opacity-60 text-xs">
                      This is the actual live camera feed from Pebble Beach Golf Links putting green
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Regular golf shot image for other holes */}
                  <img 
                    src={getGolfShotImage(selectedClip?.hole_number)}
                    alt={`Golf shot hole ${selectedClip?.hole_number}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Video overlay with play button for other holes */}
                  <div className={`absolute inset-0 ${isVideoPlaying ? 'bg-black bg-opacity-20' : 'bg-black bg-opacity-40'} transition-all duration-300`}>
                    {!isVideoPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white mb-16">
                          <h3 className="text-2xl font-bold mb-2">Golf Shot Video</h3>
                          <p className="text-white text-opacity-90 mb-1">
                            Hole {selectedClip?.hole_number} • {selectedClip?.duration_sec} seconds
                          </p>
                          <p className="text-white text-opacity-75 text-sm mb-2">
                            {getHoleDescription(selectedClip?.hole_number)}
                          </p>
                          <p className="text-blue-300 text-sm mb-4">
                            📹 {getCameraAngle(selectedClip?.hole_number)}
                          </p>
                          <p className="text-white text-opacity-60 text-xs">
                            Click play to watch your shot in action
                          </p>
                        </div>
                        
                        {/* Large Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Button
                            onClick={() => playVideo(selectedClip)}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm border-2 border-white border-opacity-50 rounded-full p-6 transition-all duration-300 hover:scale-110"
                          >
                            <Play className="h-16 w-16 text-white fill-white" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Video Playing State for other holes */}
                    {isVideoPlaying && (
                      <div className="absolute inset-0 flex flex-col">
                        {/* Video content area */}
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center text-white">
                            <div className="animate-pulse mb-4">
                              <Video className="h-16 w-16 mx-auto text-white" />
                            </div>
                            <p className="text-lg font-semibold mb-2">Playing Golf Shot</p>
                            <p className="text-sm text-white text-opacity-75">
                              {getCameraAngle(selectedClip?.hole_number)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Video Controls */}
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="bg-black bg-opacity-50 rounded-lg p-3 backdrop-blur-sm">
                            {/* Progress Bar */}
                            <div className="w-full bg-white bg-opacity-20 rounded-full h-2 mb-3">
                              <div 
                                className="bg-white h-2 rounded-full transition-all duration-100"
                                style={{ width: `${videoProgress}%` }}
                              ></div>
                            </div>
                            
                            {/* Controls */}
                            <div className="flex items-center justify-between text-white text-sm">
                              <div className="flex items-center space-x-3">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setIsVideoPlaying(false);
                                    setVideoProgress(0);
                                  }}
                                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2"
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                                <span>{Math.round((videoProgress / 100) * selectedClip?.duration_sec)}s / {selectedClip?.duration_sec}s</span>
                              </div>
                              <div className="text-blue-300 text-xs">
                                {getCameraAngle(selectedClip?.hole_number)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              )}
            </div>
          </div>
          
          <div className="flex justify-center space-x-4 mt-6">
            {selectedClip?.hole_number === 1 ? (
              <>
                <Button
                  onClick={() => window.open('https://www.pebblebeach.com/golf/pebble-beach-golf-links/live-golf-cams/pebble-beach-golf-links-putting-green/', '_blank')}
                  className="btn-golf-primary"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Live Stream
                </Button>
                <Button
                  onClick={() => handleShare(selectedClip)}
                  className="btn-golf-secondary"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Live Stream
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => playVideo(selectedClip)}
                  disabled={isVideoPlaying}
                  className="btn-golf-primary"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isVideoPlaying ? 'Playing...' : 'Play Video'}
                </Button>
                <Button
                  onClick={() => handleShare(selectedClip)}
                  className="btn-golf-secondary"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Shot
                </Button>
                <Button
                  onClick={() => window.open(selectedClip?.hls_manifest, '_blank')}
                  className="btn-golf-secondary"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};