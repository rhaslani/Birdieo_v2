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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Video, Play, Pause, Camera, Users, BarChart3, Settings, Upload, Download, Eye, CheckCircle, Clock, MapPin, User, Check, X, RotateCcw, Plus, Share2, ExternalLink, Trophy, ArrowLeft } from "lucide-react";
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

// Logo Component
const BirdieoLogo = ({ className = "w-10 h-10" }) => {
  return (
    <img 
      src="https://customer-assets.emergentagent.com/job_birdieo-clips/artifacts/xb1o5tv1_BirdieoLogo.jpg"
      alt="Birdieo Logo" 
      className={`${className} object-contain`}
      onError={(e) => {
        // Fallback to icon if logo fails to load
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
  );
};

// Silhouette Guide Component with Your Specific Images
const SilhouetteGuide = ({ photoType, className = "" }) => {
  const silhouetteUrls = {
    face: "https://customer-assets.emergentagent.com/job_birdieo-tracker/artifacts/5tdvrwvk_Face.png",
    front: "https://customer-assets.emergentagent.com/job_birdieo-tracker/artifacts/jc74mj6g_front.png", 
    side: "https://customer-assets.emergentagent.com/job_birdieo-tracker/artifacts/vjvd5lm4_Side.jpeg",
    back: "https://customer-assets.emergentagent.com/job_birdieo-tracker/artifacts/rdgf1f9r_Back.png"
  };
  
  const silhouetteUrl = silhouetteUrls[photoType];
  
  if (!silhouetteUrl) {
    // Fallback for any missing photo type
    return (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
        <div className="w-48 h-48 border-4 border-white/60 rounded-full bg-white/10"></div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <img 
        src={silhouetteUrl}
        alt={`${photoType} silhouette guide`}
        className="max-w-xs max-h-full opacity-40"
        onError={(e) => {
          // Fallback to basic outline if image fails
          e.target.style.display = 'none';
          e.target.parentElement.querySelector('.fallback-outline').style.display = 'block';
        }}
      />
      {/* Fallback outline */}
      <div className="fallback-outline w-24 h-64 border-4 border-white/60 rounded-full bg-white/10" style={{display: 'none'}}></div>
    </div>
  );
};

// Countdown Timer Component
const CountdownTimer = ({ seconds, onComplete, isActive }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(seconds);
      return;
    }

    if (timeLeft === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isActive, onComplete, seconds]);

  if (!isActive || timeLeft === 0) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
      <div className="text-center">
        <div className="text-8xl font-bold text-white mb-4 animate-pulse">
          {timeLeft}
        </div>
        <p className="text-white text-xl">Get ready...</p>
      </div>
    </div>
  );
};

// Enhanced Camera Interface Component
const CameraInterface = ({ onPhotoTaken, photoType, isActive, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(false);

  const photoInstructions = {
    face: "Position your face clearly in the frame for identification",
    front: "Stand facing the camera showing your full body from head to toe", 
    side: "Turn to show your side profile, full body visible",
    back: "Turn around to show your back, full body visible"
  };

  // Reset photo when photoType changes or component becomes active
  useEffect(() => {
    if (isActive) {
      setPhoto(null); // Reset photo for new photo type
      setCountdown(false);
      setIsReady(false); // Also reset camera ready state
      startCamera();
    } else {
      stopCamera();
      setPhoto(null); // Ensure photo is cleared when camera is closed
    }

    return () => stopCamera();
  }, [isActive, photoType]); // Added photoType dependency for proper reset

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: photoType === 'face' ? 'user' : 'environment'
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsReady(false);
  };

  const startCountdown = () => {
    setCountdown(true);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        setPhoto(URL.createObjectURL(blob));
        onPhotoTaken(blob, photoType);
        stopCamera();
        setCountdown(false);
      }, 'image/jpeg', 0.8);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setCountdown(false);
    startCamera();
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-birdieo-navy">
            Take {photoType.charAt(0).toUpperCase() + photoType.slice(1)} Photo
          </h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-gray-600 mb-4">{photoInstructions[photoType]}</p>
        
        <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video mb-4">
          {!photo ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Silhouette Guide Overlay */}
              {isReady && <SilhouetteGuide photoType={photoType} />}
              
              {/* Countdown Timer */}
              <CountdownTimer 
                seconds={5} 
                isActive={countdown}
                onComplete={takePhoto}
              />
              
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-birdieo-navy mx-auto mb-2"></div>
                    <p className="text-gray-600">Starting camera...</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <img src={photo} alt={`${photoType} photo`} className="w-full h-full object-cover" />
          )}
        </div>
        
        <div className="flex justify-center space-x-4">
          {!photo ? (
            <Button
              onClick={startCountdown}
              disabled={!isReady || countdown}
              className="bg-birdieo-navy hover:bg-birdieo-navy/90 text-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              {countdown ? 'Taking Photo...' : 'Take Photo (5s timer)'}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="border-gray-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={() => onClose()}
                className="bg-birdieo-navy hover:bg-birdieo-navy/90 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Use Photo
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Clothing Confirmation Component
const ClothingConfirmation = ({ clothingAnalysis, onConfirm, onSkip, isLoading }) => {
  const [confirmedClothing, setConfirmedClothing] = useState({
    hat: '',
    top: '',
    bottom: '',
    shoes: ''
  });
  
  const [manualEntries, setManualEntries] = useState([]);

  // Clothing options for dropdowns
  const clothingItems = ['Hat', 'Cap', 'Visor', 'Polo Shirt', 'T-Shirt', 'Long Sleeve', 'Sweater', 'Jacket', 'Vest', 'Shorts', 'Pants', 'Skirt', 'Golf Shoes', 'Sneakers', 'Sandals'];
  const colors = ['Black', 'White', 'Gray', 'Navy', 'Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Khaki', 'Cream', 'Maroon'];

  useEffect(() => {
    if (clothingAnalysis) {
      setConfirmedClothing({
        hat: clothingAnalysis.hat?.description || '',
        top: clothingAnalysis.top?.description || '',
        bottom: clothingAnalysis.bottom?.description || '',
        shoes: clothingAnalysis.shoes?.description || ''
      });
    }
  }, [clothingAnalysis]);

  const addManualEntry = () => {
    setManualEntries([...manualEntries, { item: '', color: '', id: Date.now() }]);
  };

  const updateManualEntry = (id, field, value) => {
    setManualEntries(entries => 
      entries.map(entry => 
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeManualEntry = (id) => {
    setManualEntries(entries => entries.filter(entry => entry.id !== id));
  };

  const handleConfirm = () => {
    // Combine AI analysis with manual entries
    const finalClothing = { ...confirmedClothing };
    
    // Add manual entries to description
    manualEntries.forEach(entry => {
      if (entry.item && entry.color) {
        const description = `${entry.color} ${entry.item}`;
        // Add to appropriate category or create additional field
        if (!finalClothing.additional) finalClothing.additional = [];
        finalClothing.additional.push(description);
      }
    });
    
    onConfirm(finalClothing);
  };

  if (!clothingAnalysis) return null;

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-birdieo-navy">
          Confirm Your Clothing
        </CardTitle>
        <CardDescription>
          Please confirm or correct what you're wearing for accurate player identification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Analysis Results */}
        <div className="space-y-4">
          <h4 className="font-medium text-birdieo-navy">AI Analysis Results:</h4>
          {Object.entries(confirmedClothing).map(([item, description]) => {
            const confidence = clothingAnalysis[item]?.confidence || 0;
            return (
              <div key={item} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-birdieo-navy font-medium capitalize">
                    {item}
                  </Label>
                  <Badge 
                    variant="outline" 
                    className={confidence > 0.7 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                  >
                    {confidence > 0 ? `${Math.round(confidence * 100)}% confident` : 'Not detected'}
                  </Badge>
                </div>
                <Input
                  value={description}
                  onChange={(e) => setConfirmedClothing(prev => ({
                    ...prev,
                    [item]: e.target.value
                  }))}
                  placeholder={`Describe your ${item}...`}
                  className="border-2 border-gray-200 focus:border-birdieo-blue"
                />
              </div>
            );
          })}
        </div>

        {/* Manual Entry Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-birdieo-navy">Additional Items:</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addManualEntry}
              className="border-birdieo-blue text-birdieo-blue hover:bg-birdieo-blue hover:text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
          
          {manualEntries.map((entry) => (
            <div key={entry.id} className="flex items-center space-x-2 mb-3">
              <Select value={entry.color} onValueChange={(value) => updateManualEntry(entry.id, 'color', value)}>
                <SelectTrigger className="w-32 border-gray-200">
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  {colors.map(color => (
                    <SelectItem key={color} value={color}>{color}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={entry.item} onValueChange={(value) => updateManualEntry(entry.id, 'item', value)}>
                <SelectTrigger className="flex-1 border-gray-200">
                  <SelectValue placeholder="Item" />
                </SelectTrigger>
                <SelectContent>
                  {clothingItems.map(item => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeManualEntry(entry.id)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          
          {manualEntries.length === 0 && (
            <p className="text-sm text-gray-500">Click "Add Item" to manually specify additional clothing items</p>
          )}
        </div>
        
        <div className="flex space-x-4 pt-4">
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 bg-birdieo-navy hover:bg-birdieo-navy/90 text-white"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirm Clothing
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            className="border-gray-300"
          >
            Skip for Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Round Start Component
const RoundStart = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState([]);
  const [roundData, setRoundData] = useState({
    course_name: '',
    tee_time: '',
    handedness: ''
  });
  const [currentRound, setCurrentRound] = useState(null);
  const [photos, setPhotos] = useState({});
  const [activeCamera, setActiveCamera] = useState(null);
  const [clothingAnalysis, setClothingAnalysis] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const photoTypes = ['face', 'front', 'side', 'back'];
  const completedPhotos = Object.keys(photos);

  useEffect(() => {
    fetchCourses();
    // Set today's date and time
    const now = new Date();
    const timeString = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
    setRoundData(prev => ({ ...prev, tee_time: timeString }));
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API}/courses`);
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const handleStartRound = async () => {
    try {
      const response = await axios.post(`${API}/checkin/start`, roundData);
      setCurrentRound(response.data.round);
      setStep(2);
      toast.success('Round started! Now take your photos.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start round');
    }
  };

  const handlePhotoTaken = async (blob, photoType) => {
    if (!currentRound) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, `${photoType}.jpg`);
      formData.append('angle', photoType);

      const response = await axios.post(
        `${API}/checkin/upload-photo/${currentRound.id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPhotos(prev => ({ ...prev, [photoType]: response.data.photo }));
      
      // If this photo has clothing analysis, store it
      if (response.data.photo.clothing_analysis) {
        setClothingAnalysis(response.data.photo.clothing_analysis);
      }

      toast.success(`${photoType.charAt(0).toUpperCase() + photoType.slice(1)} photo uploaded!`);
      
      // If all photos are taken, move to clothing confirmation
      if (completedPhotos.length === photoTypes.length - 1) { // -1 because we just added one
        setStep(3);
      }
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      setActiveCamera(null);
    }
  };

  const handleClothingConfirm = async (confirmedClothing) => {
    if (!currentRound) return;

    setIsConfirming(true);
    try {
      await axios.post(`${API}/checkin/confirm-clothing/${currentRound.id}`, confirmedClothing);
      
      // Complete the check-in
      const response = await axios.post(`${API}/checkin/complete/${currentRound.id}`);
      
      toast.success('Round setup complete! Automatic clip generated for Hole 1.');
      onComplete(response.data);
    } catch (error) {
      toast.error('Failed to complete round setup');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSkipClothing = async () => {
    if (!currentRound) return;

    try {
      const response = await axios.post(`${API}/checkin/complete/${currentRound.id}`);
      toast.success('Round setup complete!');
      onComplete(response.data);
    } catch (error) {
      toast.error('Failed to complete round setup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BirdieoLogo className="w-16 h-16 mr-4" />
            <div className="w-10 h-10 bg-birdieo-navy rounded-lg flex items-center justify-center" style={{display: 'none'}}>
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-birdieo-navy">Start Your Round</h1>
              <p className="text-gray-600">Set up your golf round with AI-powered player tracking</p>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            {[
              { number: 1, title: "Round Details", icon: Clock },
              { number: 2, title: "Take Photos", icon: Camera },
              { number: 3, title: "Confirm Clothing", icon: CheckCircle }
            ].map(({ number, title, icon: Icon }) => (
              <div key={number} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= number ? 'bg-birdieo-navy text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > number ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step >= number ? 'text-birdieo-navy' : 'text-gray-500'
                }`}>
                  {title}
                </span>
                {number < 3 && <div className="w-8 h-px bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Round Details */}
        {step === 1 && (
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-birdieo-navy">Round Details</CardTitle>
              <CardDescription>Enter your tee time and course information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-birdieo-navy font-medium">Golf Course</Label>
                <Select 
                  value={roundData.course_name} 
                  onValueChange={(value) => setRoundData(prev => ({ ...prev, course_name: value }))}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-birdieo-blue">
                    <SelectValue placeholder="Select your golf course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.name}>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          <div>
                            <div className="font-medium">{course.name}</div>
                            <div className="text-sm text-gray-500">{course.location}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-birdieo-navy font-medium">Tee Time</Label>
                <Input
                  type="datetime-local"
                  value={roundData.tee_time}
                  onChange={(e) => setRoundData(prev => ({ ...prev, tee_time: e.target.value }))}
                  className="border-2 border-gray-200 focus:border-birdieo-blue"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-birdieo-navy font-medium">Handedness</Label>
                <Select value={roundData.handedness} onValueChange={(value) =>
                  setRoundData(prev => ({ ...prev, handedness: value }))
                }>
                  <SelectTrigger className="border-2 border-gray-200 focus:border-birdieo-blue">
                    <SelectValue placeholder="Select your handedness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right-handed</SelectItem>
                    <SelectItem value="left">Left-handed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-4 pt-4">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStartRound}
                  disabled={!roundData.course_name || !roundData.tee_time || !roundData.handedness}
                  className="flex-1 bg-birdieo-navy hover:bg-birdieo-navy/90 text-white"
                >
                  Continue to Photos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Take Photos */}
        {step === 2 && (
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-birdieo-navy">Player Photos</CardTitle>
              <CardDescription>
                Take photos from different angles for AI identification (with 5-second timer and silhouette guides)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {photoTypes.map(photoType => (
                  <div key={photoType} className="text-center">
                    <div className={`aspect-square border-2 border-dashed rounded-lg flex items-center justify-center mb-2 ${
                      photos[photoType] ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
                    }`}>
                      {photos[photoType] ? (
                        <div className="text-center">
                          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                          <span className="text-xs text-green-700 font-medium">Complete</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                          <span className="text-xs text-gray-500">Not taken</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={photos[photoType] ? "outline" : "default"}
                      onClick={() => setActiveCamera(photoType)}
                      disabled={isUploading}
                      className={photos[photoType] ? "border-gray-300" : "bg-birdieo-navy hover:bg-birdieo-navy/90 text-white"}
                    >
                      {photos[photoType] ? 'Retake' : 'Take'} {photoType.charAt(0).toUpperCase() + photoType.slice(1)}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Progress value={(completedPhotos.length / photoTypes.length) * 100} className="mb-4" />
                <p className="text-sm text-gray-600">
                  {completedPhotos.length} of {photoTypes.length} photos completed
                  {completedPhotos.length > 0 && " • Photos include silhouette guides and 5-second countdown"}
                </p>
                {completedPhotos.length === photoTypes.length && (
                  <Button
                    onClick={() => setStep(3)}
                    className="mt-4 bg-birdieo-navy hover:bg-birdieo-navy/90 text-white"
                  >
                    Continue to Clothing Confirmation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Clothing Confirmation */}
        {step === 3 && (
          <ClothingConfirmation
            clothingAnalysis={clothingAnalysis}
            onConfirm={handleClothingConfirm}
            onSkip={handleSkipClothing}
            isLoading={isConfirming}
          />
        )}

        {/* Enhanced Camera Interface */}
        <CameraInterface
          photoType={activeCamera}
          isActive={!!activeCamera}
          onPhotoTaken={handlePhotoTaken}
          onClose={() => setActiveCamera(null)}
        />
      </div>
    </div>
  );
};

// Round Details Component - Advanced UI
const RoundDetails = ({ roundId, onBack }) => {
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  useEffect(() => {
    loadRoundDetails();
  }, [roundId]);

  const loadRoundDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/rounds/${roundId}`);
      setRound(response.data);
    } catch (error) {
      console.error('Failed to load round details:', error);
      toast.error('Failed to load round details');
    } finally {
      setLoading(false);
    }
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
      toast.success('Link copied to clipboard!');
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

  const getGolfShotImage = (holeNumber) => {
    const images = {
      1: 'https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?w=400',
      3: 'https://images.unsplash.com/photo-1591491640784-3232eb748d4b?w=400',
      5: 'https://images.unsplash.com/photo-1662224107406-cfbd51edd90c?w=400',
      7: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400',
      9: 'https://images.pexels.com/photos/1325653/pexels-photo-1325653.jpeg?w=400',
      12: 'https://images.pexels.com/photos/1637731/pexels-photo-1637731.jpeg?w=400',
      15: 'https://images.unsplash.com/photo-1562589461-cd172cbacbeb?w=400',
      18: 'https://images.unsplash.com/photo-1621005570352-6418df03796b?w=400'
    };
    return images[holeNumber] || images[1];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-birdieo-navy mx-auto mb-4"></div>
          <p className="text-birdieo-navy font-medium">Loading round details...</p>
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
            <Button onClick={onBack} className="btn-golf-primary">
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
              onClick={onBack}
              className="btn-golf-secondary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center space-x-4">
              <BirdieoLogo className="w-10 h-10" />
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
                  <Badge className="bg-green-100 text-green-800">
                    {round.completed ? 'Completed' : 'Active'}
                  </Badge>
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
                      <p className="font-medium">Subject ID</p>
                      <p className="text-sm">{round.subject_id}</p>
                    </div>
                  </div>
                </div>
              </div>
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
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs mr-2">-</div>
                <span>No Shot Available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mock Clips for Demo */}
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
              {[1, 3, 5, 7, 9, 12, 15, 18].map((holeNum) => (
                <Card key={holeNum} className="course-card overflow-hidden">
                  <div 
                    className="relative h-40 cursor-pointer group overflow-hidden"
                    onClick={() => handleClipPlay({ hole_number: holeNum, duration_sec: 10 })}
                  >
                    <img 
                      src={getGolfShotImage(holeNum)}
                      alt={`Golf shot hole ${holeNum}`}
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
                      10s
                    </div>
                    
                    {/* Hole number badge */}
                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-sm font-bold px-2 py-1 rounded">
                      #{holeNum}
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-emerald-800">
                        Hole {holeNum}
                      </h4>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare({ hole_number: holeNum });
                          }}
                          className="btn-golf-secondary text-xs px-2 py-1"
                        >
                          <Share2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success('Download started!');
                          }}
                          className="btn-golf-secondary text-xs px-2 py-1"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-emerald-600 text-sm mb-1">
                      Great shot captured automatically
                    </p>
                    <p className="text-blue-600 text-xs">
                      📹 AI Camera Angle
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
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
              <img 
                src={getGolfShotImage(selectedClip?.hole_number)}
                alt={`Golf shot hole ${selectedClip?.hole_number}`}
                className="w-full h-full object-cover"
              />
              
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <div className="text-center text-white">
                  <h3 className="text-2xl font-bold mb-2">Golf Shot Video</h3>
                  <p className="text-white text-opacity-90 mb-4">
                    Hole {selectedClip?.hole_number} • {selectedClip?.duration_sec} seconds
                  </p>
                  <Button
                    onClick={() => toast.success('Video playback simulation!')}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm border-2 border-white border-opacity-50 rounded-full p-6"
                  >
                    <Play className="h-16 w-16 text-white fill-white" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4 mt-6">
            <Button
              onClick={() => toast.success('Video playback simulation!')}
              className="btn-golf-primary"
            >
              <Play className="mr-2 h-4 w-4" />
              Play Video
            </Button>
            <Button
              onClick={() => handleShare(selectedClip)}
              className="btn-golf-secondary"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share Shot
            </Button>
            <Button
              onClick={() => toast.success('Download started!')}
              className="btn-golf-secondary"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
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
          <div className="mx-auto mb-4">
            <BirdieoLogo className="w-20 h-20 mx-auto" />
            <div className="w-20 h-20 bg-birdieo-navy rounded-2xl flex items-center justify-center shadow-lg mx-auto" style={{display: 'none'}}>
              <Video className="w-10 h-10 text-white" />
            </div>
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

// Live Video Stream Component with Enhanced Computer Vision
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
        // Use enhanced detection endpoint
        const endpoint = detectionEnabled ? '/stream/frame-with-detection' : '/stream/frame';
        setStreamUrl(`${API}${endpoint}?t=${Date.now()}`);
      }
    }, 1500); // Faster refresh for better detection visibility

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

      const interval = setInterval(fetchPersons, 2000); // More frequent updates
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
          {detectionEnabled ? 'Enhanced AI' : 'Show Detection'}
        </Button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-5">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-birdieo-navy mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">
              {detectionEnabled ? 'Processing with Enhanced AI...' : 'Loading stream...'}
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

      {/* Enhanced Person Detection Indicator */}
      {detectionEnabled && (
        <div className="absolute bottom-3 left-3 bg-birdieo-navy text-white px-3 py-1 rounded-full text-xs font-medium z-10">
          <Users className="w-3 h-3 mr-1 inline" />
          {persons.length > 0 
            ? `${persons.length} Person${persons.length !== 1 ? 's' : ''} Tracked`
            : 'Enhanced AI Active'
          }
        </div>
      )}
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streamHealth, setStreamHealth] = useState(null);
  const [showRoundStart, setShowRoundStart] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);
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

  const handleRoundStartComplete = (roundData) => {
    setShowRoundStart(false);
    fetchRounds(); // Refresh rounds list
    toast.success(`Round setup complete! Subject ID: ${roundData.subject_id}`);
  };

  const handleViewRound = (round) => {
    setSelectedRound(round);
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

  if (showRoundStart) {
    return (
      <RoundStart 
        onComplete={handleRoundStartComplete}
        onCancel={() => setShowRoundStart(false)}
      />
    );
  }

  if (selectedRound) {
    return (
      <RoundDetails 
        roundId={selectedRound.id}
        onBack={() => setSelectedRound(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BirdieoLogo className="w-10 h-10 mr-3" />
              <div className="w-10 h-10 bg-birdieo-navy rounded-lg flex items-center justify-center mr-3" style={{display: 'none'}}>
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
          <Card className="glass-card border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-birdieo-navy flex items-center">
                    <Video className="mr-3 h-6 w-6" />
                    Live Stream Status
                  </CardTitle>
                  <CardDescription>Real-time monitoring with enhanced AI person detection</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={streamHealth?.ok ? "default" : "destructive"} 
                    className={streamHealth?.ok 
                      ? "bg-green-100 text-green-800 border-green-200 animate-pulse" 
                      : "bg-red-100 text-red-800 border-red-200"
                    }
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      streamHealth?.ok ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    {streamHealth?.ok ? 'LIVE' : 'Offline'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm font-medium text-green-800">Stream Health</span>
                  </div>
                  <span className="text-lg font-bold text-green-900">
                    {streamHealth?.ok ? '✓ Enhanced AI Active' : '✗ Inactive'}
                  </span>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-2">
                    <Clock className="w-3 h-3 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">Last Update</span>
                  </div>
                  <span className="text-lg font-bold text-blue-900">
                    {streamHealth?.age_seconds ? `${streamHealth.age_seconds.toFixed(1)}s ago` : 'N/A'}
                  </span>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                  <div className="flex items-center mb-2">
                    <Users className="w-3 h-3 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-800">Detection Mode</span>
                  </div>
                  <span className="text-lg font-bold text-purple-900">Enhanced AI</span>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-center space-x-4">
                <Button 
                  onClick={captureTestClip}
                  className="btn-golf-primary"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Test Clip
                </Button>
                <Button 
                  variant="outline" 
                  onClick={checkStreamHealth}
                  className="btn-golf-secondary"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Live Course View */}
        <div className="mb-8">
          <Card className="glass-card border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-birdieo-navy flex items-center">
                    <Video className="mr-3 h-6 w-6" />
                    Live Course View - Enhanced AI Detection
                  </CardTitle>
                  <CardDescription>
                    Real-time view from Lexington Golf Course with precision person tracking
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Enhanced AI Model
                  </Badge>
                  <Badge 
                    variant={streamHealth?.ok ? "default" : "destructive"} 
                    className={streamHealth?.ok ? "bg-green-100 text-green-800 border-green-200" : ""}
                  >
                    {streamHealth?.ok ? 'LIVE' : 'Offline'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <LiveVideoStream className="aspect-video rounded-lg overflow-hidden" showDetection={true} />
                
                {/* Enhanced Stream Info Overlay */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-green-800 font-medium">Enhanced AI Detection Active</span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-blue-800 font-medium">
                      Last Update: {streamHealth?.age_seconds ? `${streamHealth.age_seconds.toFixed(1)}s ago` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                    <Users className="w-3 h-3 text-purple-600" />
                    <span className="text-purple-800 font-medium">Person Tracking: Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card className="glass-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-birdieo-navy flex items-center">
                <Trophy className="mr-3 h-6 w-6" />
                Quick Actions
              </CardTitle>
              <CardDescription>Start your round or capture test footage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-birdieo-navy to-birdieo-blue rounded-xl text-white relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300"
                     onClick={() => setShowRoundStart(true)}>
                  <div className="relative z-10">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                        <Plus className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Start New Round</h3>
                        <p className="text-white/80 text-sm">Set up player tracking and begin recording</p>
                      </div>
                    </div>
                    <div className="text-sm text-white/70 mb-3">
                      • AI-powered player identification
                    </div>
                    <div className="text-sm text-white/70 mb-3">
                      • Automatic shot detection
                    </div>
                    <div className="text-sm text-white/70">
                      • Real-time clip generation
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300"
                     onClick={captureTestClip}>
                  <div className="relative z-10">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Capture Test Clip</h3>
                        <p className="text-white/80 text-sm">Test the live stream recording functionality</p>
                      </div>
                    </div>
                    <div className="text-sm text-white/70 mb-3">
                      • 30-second test recording
                    </div>
                    <div className="text-sm text-white/70 mb-3">
                      • Stream quality verification
                    </div>
                    <div className="text-sm text-white/70">
                      • AI detection preview
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
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
                ? "No rounds yet. Start your first round with enhanced camera and AI features!"
                : `${rounds.length} round${rounds.length !== 1 ? 's' : ''} recorded with AI precision`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rounds.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No rounds yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Start your first round with enhanced camera interface, silhouette guides, 5-second countdown timer, and AI-powered clothing analysis.
                </p>
                <Button 
                  className="bg-birdieo-navy hover:bg-birdieo-navy/90 text-white"
                  onClick={() => setShowRoundStart(true)}
                >
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
                    onClick={() => handleViewRound(round)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h4 className="font-semibold text-birdieo-navy text-lg mr-3">
                            {round.course_name}
                          </h4>
                          <Badge variant="outline" className="bg-birdieo-blue/10 text-birdieo-blue border-birdieo-blue/20 mr-2">
                            {round.handedness} handed
                          </Badge>
                          {round.completed && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Complete
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Subject ID:</span> {round.subject_id}
                          </p>
                          {round.round_id && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Round ID:</span> {round.round_id}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Tee Time:</span> {new Date(round.tee_time).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Photos:</span> {round.player_photos?.length || 0} captured with AI analysis
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
                    {round.confirmed_clothing && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(round.confirmed_clothing).map(([item, description]) => (
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