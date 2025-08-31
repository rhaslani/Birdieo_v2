import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Camera, X, RotateCcw, Check, AlertTriangle, Settings } from 'lucide-react';

export const CameraCapture = ({ isOpen, onClose, onCapture, photoType }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt'); // 'granted', 'denied', 'prompt'
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back camera
  const [cameraTimeout, setCameraTimeout] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      checkCameraPermission();
      // Set a timeout to show demo option if camera takes too long
      timeoutRef.current = setTimeout(() => {
        if (!isStreaming && !error) {
          setCameraTimeout(true);
        }
      }, 5000); // 5 second timeout
    } else {
      stopCamera();
      clearTimeout(timeoutRef.current);
    }
    
    return () => {
      stopCamera();
      clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && permissionState === 'granted') {
      startCamera();
    }
  }, [facingMode, permissionState, isOpen]);

  const checkCameraPermission = async () => {
    try {
      // Check if permissions API is supported
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' });
        setPermissionState(permission.state);
        
        if (permission.state === 'granted') {
          startCamera();
        }
        
        // Listen for permission changes
        permission.onchange = () => {
          setPermissionState(permission.state);
          if (permission.state === 'granted') {
            startCamera();
          } else {
            stopCamera();
          }
        };
      } else {
        // Fallback: try to start camera directly
        startCamera();
      }
    } catch (err) {
      console.error('Error checking camera permission:', err);
      startCamera(); // Fallback to direct camera access
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setCameraTimeout(false);
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      };

      // Add a race condition with timeout
      const cameraPromise = navigator.mediaDevices.getUserMedia(constraints);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Camera access timed out')), 10000)
      );

      const stream = await Promise.race([cameraPromise, timeoutPromise]);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        setPermissionState('granted');
        setCameraTimeout(false);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsStreaming(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setError('Camera permission denied. Please allow camera access to take photos.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device. Please check your camera connection.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is being used by another application. Please close other apps using the camera.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Camera configuration not supported. Trying alternative settings...');
        // Try with less restrictive constraints
        retryWithBasicConstraints();
      } else if (err.message.includes('timed out')) {
        setError('Camera is taking too long to start. Please try using the demo photo option.');
        setCameraTimeout(true);
      } else {
        setError(err.message || 'Failed to access camera. Please check your camera and permissions.');
      }
    }
  };

  const retryWithBasicConstraints = async () => {
    try {
      const basicConstraints = {
        video: { facingMode: facingMode },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError('Unable to access camera with current settings.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsStreaming(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      setCapturedImage(null);
      onClose();
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setCapturedImage(null);
  };

  const requestPermissionAgain = () => {
    setError(null);
    setPermissionState('prompt');
    startCamera();
  };

  const handleUseDemoPhoto = () => {
    // Create a demo photo when camera is not available
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Create a professional-looking demo photo
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(1, '#059669');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`DEMO ${photoType.toUpperCase()} PHOTO`, 200, 130);
    ctx.font = '16px Arial';
    ctx.fillText('Simulated for Demo', 200, 160);
    ctx.fillText(`${new Date().toLocaleTimeString()}`, 200, 180);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Call the onCapture callback with the demo photo
    onCapture(imageDataUrl);
    onClose();
  };

  const getPhotoTypeInstructions = () => {
    const instructions = {
      face: 'Position your face clearly in the center of the frame for identification',
      front: 'Stand facing the camera to capture your full outfit from the front',
      side: 'Turn to your side to show your profile and clothing details',
      back: 'Turn around to capture your outfit from behind'
    };
    return instructions[photoType] || 'Position yourself for the photo';
  };

  const getBrowserSpecificInstructions = () => {
    const userAgent = navigator.userAgent;
    const isHttps = window.location.protocol === 'https:';
    
    let instructions = '';
    if (userAgent.includes('Chrome')) {
      instructions = 'Click the camera icon in the address bar and select "Allow"';
    } else if (userAgent.includes('Firefox')) {
      instructions = 'Click "Allow" when prompted, or click the camera icon in the address bar';
    } else if (userAgent.includes('Safari')) {
      instructions = 'Go to Safari > Settings > Websites > Camera and allow access';
    } else if (userAgent.includes('Edge')) {
      instructions = 'Click the camera icon in the address bar and select "Allow"';
    } else {
      instructions = 'Allow camera access when prompted by your browser';
    }
    
    if (!isHttps) {
      instructions += ' | ⚠️ Camera requires HTTPS - make sure URL starts with https://';
    }
    
    return instructions;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-emerald-800 capitalize">
              Capture {photoType} Photo
            </h3>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="rounded-full p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-emerald-600 text-sm mb-4">
            {getPhotoTypeInstructions()}
          </p>

          {/* Permission Denied Error */}
          {permissionState === 'denied' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-red-800 font-semibold mb-2">Camera Permission Required</h4>
                  <p className="text-red-700 text-sm mb-4">
                    To take photos, Birdieo needs access to your camera. Please allow camera access to continue.
                  </p>
                  
                  <div className="bg-red-100 rounded-lg p-4 mb-4">
                    <h5 className="text-red-800 font-medium mb-2">How to enable camera access:</h5>
                    <ul className="text-red-700 text-sm space-y-1 mb-3">
                      <li>• {getBrowserSpecificInstructions()}</li>
                      <li>• Look for a camera icon in your browser's address bar</li>
                      <li>• Make sure you're using HTTPS (secure connection)</li>
                      <li>• Refresh the page if needed after granting permission</li>
                    </ul>
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      <strong>Note:</strong> Camera access requires a secure (HTTPS) connection and may not work in some browsers or incognito mode.
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <div className="flex space-x-3">
                      <Button
                        onClick={requestPermissionAgain}
                        className="bg-red-600 hover:bg-red-700 text-white flex-1"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50 flex-1"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Refresh Page
                      </Button>
                    </div>
                    
                    {/* Prominent demo photo option in camera modal */}
                    <div className="border-t border-red-200 pt-4">
                      <p className="text-red-700 text-sm mb-3">
                        <strong>Alternative:</strong> Can't enable camera access? Use a demo photo instead:
                      </p>
                      <Button
                        onClick={() => {
                          handleUseDemoPhoto();
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Use Demo Photo Instead
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Errors */}
          {error && permissionState !== 'denied' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-orange-800 text-sm font-medium">Camera Error</p>
                  <p className="text-orange-700 text-sm mt-1 mb-3">{error}</p>
                  <div className="flex flex-col space-y-2">
                    <Button
                      onClick={requestPermissionAgain}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      size="sm"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      onClick={handleUseDemoPhoto}
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Use Demo Photo Instead
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Camera Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden mb-4">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {isStreaming && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                    <Button
                      onClick={switchCamera}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-full p-3"
                      title="Switch Camera"
                    >
                      <RotateCcw className="h-5 w-5 text-white" />
                    </Button>
                    
                    <Button
                      onClick={capturePhoto}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-full p-4"
                      title="Take Photo"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </Button>
                  </div>
                )}
                
                {!isStreaming && !error && permissionState !== 'denied' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                      <p className="text-lg font-semibold mb-2">Starting Camera...</p>
                      <p className="text-sm opacity-75 mb-4">Please wait while we access your camera</p>
                      <Button
                        onClick={handleUseDemoPhoto}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                        size="sm"
                      >
                        Skip & Use Demo Photo
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <img 
                  src={capturedImage} 
                  alt="Captured photo"
                  className="w-full h-64 object-cover"
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                  <Button
                    onClick={retakePhoto}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  
                  <Button
                    onClick={confirmPhoto}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 py-2"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Use Photo
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Camera Info */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Camera: {facingMode === 'user' ? 'Front' : 'Back'}</span>
            {isStreaming ? (
              <span>📹 Camera active - Tap camera button to capture</span>
            ) : (
              <span>Camera not active</span>
            )}
          </div>

          {/* Help Text */}
          {!isStreaming && permissionState !== 'denied' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-sm">
                <strong>Need help?</strong> Make sure your camera isn't being used by other apps, 
                and that you've allowed camera access for this website.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};