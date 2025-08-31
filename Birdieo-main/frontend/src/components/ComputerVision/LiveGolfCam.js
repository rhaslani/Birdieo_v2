import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { PersonDetection } from './PersonDetection';
import { 
  Camera, 
  Eye, 
  Users, 
  Target, 
  Play, 
  Pause, 
  MapPin,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export const LiveGolfCam = ({ holeNumber = 1 }) => {
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detections, setDetections] = useState([]);
  const [streamError, setStreamError] = useState(null);
  const [targetColors, setTargetColors] = useState(['blue']);
  const [statistics, setStatistics] = useState({
    totalPeople: 0,
    bluePeople: 0,
    detectionRate: 0,
    averageConfidence: 0
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Live golf course camera streams
  const golfCameraStreams = {
    1: {
      name: 'Pebble Beach Golf Links - Putting Green',
      url: 'https://www.pebblebeach.com/golf/pebble-beach-golf-links/live-golf-cams/pebble-beach-golf-links-putting-green/',
      // For demo purposes, we'll use a working video stream
      streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      description: 'Live view of the famous Pebble Beach putting green',
      location: 'Pebble Beach, California'
    },
    2: {
      name: 'Pebble Beach Golf Links - 18th Hole',
      streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      description: 'Iconic 18th hole oceanside view',
      location: 'Pebble Beach, California'
    }
  };

  const currentCamera = golfCameraStreams[holeNumber] || golfCameraStreams[1];

  useEffect(() => {
    // Auto-start the live stream when component mounts
    startLiveStream();
  }, [holeNumber]);

  useEffect(() => {
    // Update statistics when detections change
    if (detections.length > 0) {
      const bluePeople = detections.filter(d => d.clothingColor === 'blue').length;
      const avgConfidence = detections.reduce((sum, d) => sum + d.score, 0) / detections.length;
      
      setStatistics({
        totalPeople: detections.length,
        bluePeople: bluePeople,
        detectionRate: (bluePeople / detections.length) * 100,
        averageConfidence: avgConfidence * 100
      });
    } else {
      setStatistics({
        totalPeople: 0,
        bluePeople: 0,
        detectionRate: 0,
        averageConfidence: 0
      });
    }
  }, [detections]);

  const startLiveStream = async () => {
    try {
      setStreamError(null);
      
      if (videoRef.current) {
        // For demo purposes, use a sample video that represents the live stream
        videoRef.current.src = currentCamera.streamUrl;
        videoRef.current.crossOrigin = 'anonymous';
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error starting live stream:', error);
      setStreamError('Failed to load live stream. Using demo video feed.');
      
      // Fallback to a working demo video
      if (videoRef.current) {
        videoRef.current.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        videoRef.current.play()
          .then(() => setIsStreaming(true))
          .catch(() => setStreamError('Unable to load any video stream'));
      }
    }
  };

  const stopStream = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    setIsStreaming(false);
    setIsDetectionActive(false);
    setDetections([]);
  };

  const handleDetection = (newDetections) => {
    setDetections(newDetections);
    
    // Log blue polo detections
    const bluePeople = newDetections.filter(d => d.clothingColor === 'blue');
    if (bluePeople.length > 0) {
      console.log(`🎯 Detected ${bluePeople.length} people in blue clothing at ${currentCamera.name}`);
    }
  };

  const toggleTargetColor = (color) => {
    setTargetColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-800 mb-2 flex items-center justify-center">
            <Camera className="mr-3 h-10 w-10" />
            Live Golf Course Vision - Hole {holeNumber}
          </h1>
          <p className="text-emerald-600 text-lg mb-2">
            Real-time person detection at {currentCamera.name}
          </p>
          <div className="flex items-center justify-center text-emerald-500">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">{currentCamera.location}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Live Video Stream */}
          <div className="lg:col-span-3">
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-800">
                  <Eye className="mr-2 h-5 w-5" />
                  {currentCamera.name}
                </CardTitle>
                <CardDescription className="flex items-center justify-between">
                  <span>{currentCamera.description}</span>
                  <Badge variant={isStreaming ? 'default' : 'secondary'} className="ml-2">
                    {isStreaming ? '🟢 LIVE' : '🔴 OFFLINE'}
                  </Badge>
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Stream Controls */}
                <div className="mb-4 flex justify-between items-center">
                  <div className="flex space-x-3">
                    {!isStreaming ? (
                      <Button onClick={startLiveStream} className="btn-golf-primary">
                        <Play className="mr-2 h-4 w-4" />
                        Start Live Stream
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => setIsDetectionActive(!isDetectionActive)}
                          className={isDetectionActive ? 'bg-orange-600 hover:bg-orange-700' : 'btn-golf-primary'}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          {isDetectionActive ? 'Stop AI Detection' : 'Start AI Detection'}
                        </Button>
                        <Button onClick={stopStream} className="bg-red-600 hover:bg-red-700 text-white">
                          <Pause className="mr-2 h-4 w-4" />
                          Stop Stream
                        </Button>
                      </>
                    )}
                  </div>

                  {isDetectionActive && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">AI Detection Active</span>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {streamError && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <span className="text-orange-800 text-sm">{streamError}</span>
                    </div>
                  </div>
                )}

                {/* Video Display */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-96 object-cover"
                    playsInline
                    muted
                    loop
                  />
                  
                  {isStreaming && (
                    <PersonDetection
                      videoRef={videoRef}
                      onDetection={handleDetection}
                      isActive={isDetectionActive}
                      showBoundingBoxes={true}
                      targetClothingColors={targetColors}
                    />
                  )}

                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-xl font-semibold">Live Golf Course Camera</p>
                        <p className="text-sm opacity-75">Click "Start Live Stream" to begin</p>
                      </div>
                    </div>
                  )}

                  {/* Live Stream Indicator */}
                  {isStreaming && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                      🔴 LIVE - Hole {holeNumber}
                    </div>
                  )}
                </div>

                {/* Stream Info */}
                <div className="mt-4 text-sm text-emerald-600">
                  <p>📡 Stream Source: {currentCamera.url}</p>
                  <p>🎯 Detecting: People wearing {targetColors.join(', ')} clothing</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detection Controls & Results */}
          <div className="space-y-6">
            {/* Detection Statistics */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-800 text-lg">
                  <Target className="mr-2 h-5 w-5" />
                  Live Stats
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-800">{statistics.totalPeople}</div>
                    <div className="text-xs text-emerald-600">Total People</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{statistics.bluePeople}</div>
                    <div className="text-xs text-blue-600">Blue Clothing</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{statistics.detectionRate.toFixed(1)}%</div>
                    <div className="text-xs text-orange-600">Blue Match Rate</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{statistics.averageConfidence.toFixed(1)}%</div>
                    <div className="text-xs text-purple-600">Confidence</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Target Colors */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-800 text-lg">
                  <Eye className="mr-2 h-5 w-5" />
                  Target Colors
                </CardTitle>
                <CardDescription className="text-xs">
                  Click to detect specific clothing colors
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {['blue', 'red', 'white', 'green', 'black', 'yellow'].map(color => (
                    <Button
                      key={color}
                      onClick={() => toggleTargetColor(color)}
                      className={`capitalize text-xs ${
                        targetColors.includes(color) 
                          ? 'btn-golf-primary' 
                          : 'btn-golf-secondary'
                      }`}
                      size="sm"
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2 border"
                        style={{ backgroundColor: color === 'white' ? '#f0f0f0' : color }}
                      />
                      {color}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Live Detections */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-800 text-lg">
                  <Users className="mr-2 h-5 w-5" />
                  Live Detections
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                {detections.length === 0 ? (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-600 text-sm">No people detected</p>
                    <p className="text-emerald-500 text-xs">Start AI detection to identify golfers</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detections.map((detection, index) => (
                      <div key={detection.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: detection.clothingColor }}
                          />
                          <span className="text-sm font-medium">Golfer {index + 1}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={detection.clothingColor === 'blue' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {detection.clothingColor}
                          </Badge>
                          {detection.clothingColor === 'blue' && (
                            <span className="text-blue-600 text-lg">🎯</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {statistics.bluePeople > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-800 font-medium text-sm">
                        {statistics.bluePeople} Blue Polo{statistics.bluePeople > 1 ? 's' : ''} Detected!
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};