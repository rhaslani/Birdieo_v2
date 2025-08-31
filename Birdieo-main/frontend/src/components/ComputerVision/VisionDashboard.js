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
  Settings,
  Download,
  Share2,
  Zap
} from 'lucide-react';

export const VisionDashboard = () => {
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detections, setDetections] = useState([]);
  const [targetColors, setTargetColors] = useState(['blue']);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [streamSource, setStreamSource] = useState('camera'); // 'camera' or 'url'
  const [streamUrl, setStreamUrl] = useState('');
  const [statistics, setStatistics] = useState({
    totalPeople: 0,
    targetPeople: 0,
    detectionRate: 0,
    averageConfidence: 0
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Update statistics when detections change
    if (detections.length > 0) {
      const targetCount = detections.filter(d => d.isTarget).length;
      const avgConfidence = detections.reduce((sum, d) => sum + d.score, 0) / detections.length;
      
      setStatistics({
        totalPeople: detections.length,
        targetPeople: targetCount,
        detectionRate: (targetCount / detections.length) * 100,
        averageConfidence: avgConfidence * 100
      });
    }
  }, [detections]);

  const startCameraStream = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera if available
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      alert('Camera access denied or not available');
    }
  };

  const startUrlStream = () => {
    if (!streamUrl) {
      alert('Please enter a valid stream URL');
      return;
    }

    if (videoRef.current) {
      videoRef.current.src = streamUrl;
      videoRef.current.crossOrigin = 'anonymous';
      videoRef.current.play()
        .then(() => setIsStreaming(true))
        .catch(error => {
          console.error('Error loading stream:', error);
          alert('Failed to load video stream. Check URL and CORS settings.');
        });
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    
    setIsStreaming(false);
    setIsDetectionActive(false);
  };

  const handleDetection = (newDetections) => {
    setDetections(newDetections);
  };

  const toggleTargetColor = (color) => {
    setTargetColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const exportDetectionData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      detections: detections.map(d => ({
        id: d.id,
        confidence: d.score,
        clothingColor: d.clothingColor,
        isTarget: d.isTarget,
        bbox: d.bbox
      })),
      statistics,
      settings: {
        targetColors,
        showBoundingBoxes
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `birdieo-detection-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">
            🎯 Birdieo AI Vision System
          </h1>
          <p className="text-emerald-600 text-lg">
            Real-time person detection and clothing analysis for golf courses
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Stream */}
          <div className="lg:col-span-2">
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-800">
                  <Camera className="mr-2 h-5 w-5" />
                  Live Video Stream
                </CardTitle>
                <CardDescription>
                  Real-time person detection with clothing color analysis
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Stream Controls */}
                <div className="mb-4 space-y-4">
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => setStreamSource('camera')}
                      className={`${streamSource === 'camera' ? 'btn-golf-primary' : 'btn-golf-secondary'}`}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Device Camera
                    </Button>
                    <Button
                      onClick={() => setStreamSource('url')}
                      className={`${streamSource === 'url' ? 'btn-golf-primary' : 'btn-golf-secondary'}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Stream URL
                    </Button>
                  </div>

                  {streamSource === 'url' && (
                    <input
                      type="text"
                      placeholder="Enter video stream URL (e.g., https://example.com/stream.m3u8)"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      className="golf-input w-full"
                    />
                  )}

                  <div className="flex space-x-4">
                    {!isStreaming ? (
                      <Button
                        onClick={streamSource === 'camera' ? startCameraStream : startUrlStream}
                        className="btn-golf-primary"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Start Stream
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={stopStream}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Stop Stream
                        </Button>
                        <Button
                          onClick={() => setIsDetectionActive(!isDetectionActive)}
                          className={isDetectionActive ? 'bg-orange-600 hover:bg-orange-700' : 'btn-golf-primary'}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          {isDetectionActive ? 'Stop Detection' : 'Start AI Detection'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Video Display */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-96 object-cover"
                    playsInline
                    muted
                  />
                  
                  {isStreaming && (
                    <PersonDetection
                      videoRef={videoRef}
                      onDetection={handleDetection}
                      isActive={isDetectionActive}
                      showBoundingBoxes={showBoundingBoxes}
                      targetClothingColors={targetColors}
                    />
                  )}

                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-semibold">No Video Stream</p>
                        <p className="text-sm opacity-75">Start a camera or URL stream to begin</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls & Statistics */}
          <div className="space-y-6">
            {/* Detection Statistics */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-800">
                  <Target className="mr-2 h-5 w-5" />
                  Detection Stats
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-800">{statistics.totalPeople}</div>
                    <div className="text-sm text-emerald-600">Total People</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.targetPeople}</div>
                    <div className="text-sm text-emerald-600">Target Clothing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{statistics.detectionRate.toFixed(1)}%</div>
                    <div className="text-sm text-emerald-600">Match Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.averageConfidence.toFixed(1)}%</div>
                    <div className="text-sm text-emerald-600">Confidence</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Target Colors */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-800">
                  <Settings className="mr-2 h-5 w-5" />
                  Target Colors
                </CardTitle>
                <CardDescription>
                  Select clothing colors to detect and highlight
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {['blue', 'red', 'white', 'green', 'black', 'yellow', 'purple', 'orange'].map(color => (
                    <Button
                      key={color}
                      onClick={() => toggleTargetColor(color)}
                      className={`capitalize ${
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

                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showBoundingBoxes}
                      onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-emerald-700">Show Bounding Boxes</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Detection Results */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-800">
                  <Users className="mr-2 h-5 w-5" />
                  Live Detections
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                {detections.length === 0 ? (
                  <p className="text-emerald-600 text-sm">No people detected</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {detections.map((detection, index) => (
                      <div key={detection.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: detection.clothingColor }}
                          />
                          <span className="text-sm font-medium">Person {index + 1}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={detection.isTarget ? 'default' : 'secondary'}>
                            {detection.clothingColor}
                          </Badge>
                          {detection.isTarget && <span className="text-green-600">🎯</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detections.length > 0 && (
                  <div className="mt-4 flex space-x-2">
                    <Button
                      onClick={exportDetectionData}
                      size="sm"
                      className="btn-golf-secondary flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      className="btn-golf-secondary flex-1"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
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