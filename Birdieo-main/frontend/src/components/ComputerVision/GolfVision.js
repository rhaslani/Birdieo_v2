import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PersonDetection } from './PersonDetection';
import { useAuth } from '../../App';
import { 
  Camera, 
  Users, 
  Target, 
  Play, 
  Pause, 
  CheckCircle,
  AlertCircle,
  Eye,
  MapPin
} from 'lucide-react';

export const GolfVision = ({ 
  roundId, 
  holeNumber = 1, 
  onPlayerDetected, 
  expectedPlayers = [] 
}) => {
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detections, setDetections] = useState([]);
  const [matchedPlayers, setMatchedPlayers] = useState([]);
  const [cameraAngle, setCameraAngle] = useState('tee-box');
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { apiRequest } = useAuth();

  // Define camera positions for different holes
  const cameraPositions = {
    'tee-box': { name: 'Tee Box Camera', targetColors: ['blue', 'red', 'white', 'green'] },
    'fairway': { name: 'Fairway Camera', targetColors: ['blue', 'red', 'white'] },
    'approach': { name: 'Approach Camera', targetColors: ['blue', 'red', 'white', 'green'] },
    'green': { name: 'Green Camera', targetColors: ['blue', 'red', 'white'] }
  };

  useEffect(() => {
    // Auto-start detection when component mounts for active rounds
    if (roundId) {
      startCameraStream();
    }
  }, [roundId]);

  const startCameraStream = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: 'environment'
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
      console.error('Golf camera access error:', error);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setIsDetectionActive(false);
  };

  const handleDetection = async (newDetections) => {
    setDetections(newDetections);
    
    // Match detections with expected players
    const matches = await matchPlayersToDetections(newDetections);
    setMatchedPlayers(matches);
    
    // Trigger callbacks for matched players
    if (onPlayerDetected && matches.length > 0) {
      onPlayerDetected(matches);
    }
    
    // Log detection events for the round
    if (roundId && matches.length > 0) {
      logDetectionEvent(matches);
    }
  };

  const matchPlayersToDetections = async (detections) => {
    const matches = [];
    
    for (const detection of detections) {
      // Find matching player based on clothing color
      const matchingPlayer = expectedPlayers.find(player => {
        if (!player.clothingDescriptor) return false;
        
        const playerColors = [
          player.clothingDescriptor.top_color?.toLowerCase(),
          player.clothingDescriptor.bottom_color?.toLowerCase()
        ].filter(Boolean);
        
        return playerColors.includes(detection.clothingColor?.toLowerCase());
      });
      
      if (matchingPlayer) {
        matches.push({
          ...detection,
          playerId: matchingPlayer.user_id,
          playerName: matchingPlayer.name,
          confidence: detection.score,
          clothingMatch: true,
          timestamp: Date.now()
        });
      }
    }
    
    return matches;
  };

  const logDetectionEvent = async (matches) => {
    try {
      // Log detection event to backend for shot capture triggering
      await apiRequest('POST', '/vision/detection-event', {
        round_id: roundId,
        hole_number: holeNumber,
        camera_angle: cameraAngle,
        detections: matches.map(match => ({
          player_id: match.playerId,
          confidence: match.confidence,
          clothing_color: match.clothingColor,
          bbox: match.bbox,
          timestamp: match.timestamp
        }))
      });
    } catch (error) {
      console.error('Failed to log detection event:', error);
    }
  };

  const triggerShotCapture = async (playerId) => {
    try {
      // Trigger automatic shot capture for detected player
      await apiRequest('POST', '/vision/trigger-capture', {
        round_id: roundId,
        player_id: playerId,
        hole_number: holeNumber,
        camera_angle: cameraAngle,
        trigger_reason: 'player_detected'
      });
    } catch (error) {
      console.error('Failed to trigger shot capture:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Golf Vision Header */}
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-emerald-800">
            <Eye className="mr-2 h-5 w-5" />
            Golf Vision System - Hole {holeNumber}
          </CardTitle>
          <CardDescription>
            AI-powered player detection and shot capture for {cameraPositions[cameraAngle]?.name}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Camera Controls */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex space-x-2">
              {Object.entries(cameraPositions).map(([key, position]) => (
                <Button
                  key={key}
                  onClick={() => setCameraAngle(key)}
                  className={`text-xs ${cameraAngle === key ? 'btn-golf-primary' : 'btn-golf-secondary'}`}
                  size="sm"
                >
                  {position.name}
                </Button>
              ))}
            </div>

            <div className="flex space-x-2 ml-auto">
              {!isStreaming ? (
                <Button onClick={startCameraStream} className="btn-golf-primary">
                  <Play className="mr-2 h-4 w-4" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setIsDetectionActive(!isDetectionActive)}
                    className={isDetectionActive ? 'bg-orange-600 hover:bg-orange-700' : 'btn-golf-primary'}
                  >
                    <Target className="mr-2 h-4 w-4" />
                    {isDetectionActive ? 'Stop Detection' : 'Start Detection'}
                  </Button>
                  <Button onClick={stopStream} className="bg-red-600 hover:bg-red-700 text-white">
                    <Pause className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Video Display */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-80 object-cover"
              playsInline
              muted
            />
            
            {isStreaming && (
              <PersonDetection
                videoRef={videoRef}
                onDetection={handleDetection}
                isActive={isDetectionActive}
                showBoundingBoxes={true}
                targetClothingColors={cameraPositions[cameraAngle]?.targetColors || []}
              />
            )}

            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold">Golf Course Camera</p>
                  <p className="text-sm opacity-75">Click "Start Camera" to begin player detection</p>
                </div>
              </div>
            )}

            {/* Shot Capture Overlay */}
            {matchedPlayers.length > 0 && isDetectionActive && (
              <div className="absolute top-4 left-4 space-y-2">
                {matchedPlayers.map((player, index) => (
                  <div key={player.playerId} className="bg-green-600 text-white p-2 rounded-lg text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Player Detected: {player.playerName}</span>
                    </div>
                    <Button
                      onClick={() => triggerShotCapture(player.playerId)}
                      size="sm"
                      className="mt-1 bg-white text-green-600 hover:bg-green-50"
                    >
                      Capture Shot
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player Matching Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expected Players */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-emerald-800 text-lg">
              <Users className="mr-2 h-5 w-5" />
              Expected Players
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {expectedPlayers.length === 0 ? (
              <p className="text-emerald-600 text-sm">No players expected</p>
            ) : (
              <div className="space-y-2">
                {expectedPlayers.map((player, index) => (
                  <div key={player.user_id} className="flex items-center justify-between p-2 bg-emerald-50 rounded">
                    <div>
                      <div className="font-medium text-sm">{player.name}</div>
                      <div className="text-xs text-emerald-600">
                        {player.clothingDescriptor?.top_color} top, {player.clothingDescriptor?.bottom_color} bottom
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: player.clothingDescriptor?.top_color || 'gray' }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: player.clothingDescriptor?.bottom_color || 'gray' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detection Results */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-emerald-800 text-lg">
              <Target className="mr-2 h-5 w-5" />
              Live Detection
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {detections.length === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-600 text-sm">No people detected</p>
                <p className="text-emerald-500 text-xs">Start detection to identify golfers</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detections.map((detection, index) => {
                  const isMatched = matchedPlayers.some(p => p.id === detection.id);
                  const matchedPlayer = matchedPlayers.find(p => p.id === detection.id);
                  
                  return (
                    <div key={detection.id} className={`p-2 rounded ${isMatched ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: detection.clothingColor }}
                          />
                          <span className="text-sm font-medium">
                            {isMatched ? matchedPlayer.playerName : `Person ${index + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600">
                            {(detection.score * 100).toFixed(0)}%
                          </span>
                          {isMatched && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {detection.clothingColor} clothing detected
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};