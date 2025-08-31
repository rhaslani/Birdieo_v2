import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CameraCapture } from './CameraCapture';
import { useAuth } from '../App';
import { 
  ArrowLeft, 
  ArrowRight, 
  Calendar,
  MapPin,
  Camera,
  User,
  Clock,
  CheckCircle
} from 'lucide-react';

export const CheckinFlow = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState(null);
  const [checkinData, setCheckinData] = useState({
    courseId: '',
    courseName: '',
    teeTime: '',
    handedness: '',
    photos: {
      face: null,
      front: null,
      side: null,
      back: null
    },
    clothingDescriptor: {
      top_color: '',
      top_style: '',
      bottom_color: '',
      hat_color: '',
      shoes_color: ''
    }
  });
  
  const { apiRequest, user } = useAuth();
  const navigate = useNavigate();

  // Auto-populate handedness from user profile and skip step 2 if available
  React.useEffect(() => {
    if (user?.handedness) {
      setCheckinData(prev => ({
        ...prev,
        handedness: user.handedness
      }));
    }
  }, [user]);

  // Mock golf courses
  const courses = [
    { id: 'pebble-beach', name: 'Pebble Beach Golf Links' },
    { id: 'augusta-national', name: 'Augusta National Golf Club' },
    { id: 'st-andrews', name: 'The Old Course at St Andrews' },
    { id: 'pine-valley', name: 'Pine Valley Golf Club' },
    { id: 'cypress-point', name: 'Cypress Point Club' },
    { id: 'shinnecock', name: 'Shinnecock Hills Golf Club' }
  ];

  const handleCourseSelect = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    setCheckinData({
      ...checkinData,
      courseId,
      courseName: course?.name || ''
    });
  };

  const handlePhotoCapture = (photoType) => {
    setCurrentPhotoType(photoType);
    setCameraOpen(true);
  };

  const handleCameraCapture = async (photoDataUrl) => {
    // Update the photos in checkin data
    setCheckinData({
      ...checkinData,
      photos: {
        ...checkinData.photos,
        [currentPhotoType]: photoDataUrl
      }
    });

    // If this is the front photo (best for clothing analysis), analyze it
    if (currentPhotoType === 'front') {
      await analyzeClothing(photoDataUrl);
    }
    
    setCameraOpen(false);
    setCurrentPhotoType(null);
  };

  const handleSimulatedCapture = (photoType) => {
    // Fallback: Create simulated photo for users who can't use camera
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Create a professional-looking placeholder
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(1, '#059669');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${photoType.toUpperCase()} PHOTO`, 200, 130);
    ctx.font = '16px Arial';
    ctx.fillText('Simulated for Demo', 200, 160);
    ctx.fillText(`${new Date().toLocaleTimeString()}`, 200, 180);
    
    const dataUrl = canvas.toDataURL('image/png');
    
    setCheckinData({
      ...checkinData,
      photos: {
        ...checkinData.photos,
        [photoType]: dataUrl
      }
    });

    // If this is the front photo, analyze it
    if (photoType === 'front') {
      analyzeClothing(dataUrl);
    }
  };

  const handleHandednessSelect = async (handedness) => {
    setCheckinData({...checkinData, handedness});
    
    // Save handedness to user profile for future check-ins
    if (!user?.handedness || user.handedness !== handedness) {
      try {
        await apiRequest('PUT', '/auth/profile', { handedness });
      } catch (error) {
        console.error('Failed to save handedness preference:', error);
      }
    }
  };

  const handleCameraClose = () => {
    setCameraOpen(false);
    setCurrentPhotoType(null);
  };

  const analyzeClothing = async (photoDataUrl) => {
    setAnalyzingPhoto(true);
    try {
      const result = await apiRequest('POST', '/analyze-photo', {
        photo_base64: photoDataUrl,
        photo_type: 'front'
      });

      if (result.success) {
        setAiAnalysis(result.data);
        // Auto-populate clothing descriptor with AI results
        setCheckinData(prev => ({
          ...prev,
          clothingDescriptor: {
            top_color: result.data.top_color,
            top_style: result.data.top_style,
            bottom_color: result.data.bottom_color,
            hat_color: result.data.hat_color === 'none' ? '' : result.data.hat_color,
            shoes_color: result.data.shoes_color
          }
        }));
        setShowVerification(true);
      }
    } catch (error) {
      console.error('Photo analysis failed:', error);
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Step 1: Create check-in
      const checkinResult = await apiRequest('POST', '/checkin', {
        tee_time: new Date(checkinData.teeTime).toISOString(),
        course_id: checkinData.courseId,
        course_name: checkinData.courseName,
        handedness: checkinData.handedness
      });

      if (!checkinResult.success) {
        setLoading(false);
        return;
      }

      const roundId = checkinResult.data.round_id;

      // Step 2: Submit photos and clothing descriptor
      const photoResult = await apiRequest('POST', '/checkin/photos', {
        round_id: roundId,
        face_photo: checkinData.photos.face || '',
        front_photo: checkinData.photos.front || '',
        side_photo: checkinData.photos.side || '',
        back_photo: checkinData.photos.back || '',
        clothing_descriptor: checkinData.clothingDescriptor
      });

      if (photoResult.success) {
        // Generate demo clips for the round
        await apiRequest('POST', `/demo/generate-clips/${roundId}`);
        
        setStep(5); // Success step
      }
    } catch (error) {
      console.error('Check-in failed:', error);
    }
    
    setLoading(false);
  };

  const nextStep = () => {
    // Skip handedness step if user already has it saved in profile
    if (step === 1 && user?.handedness) {
      setStep(3); // Skip step 2 (handedness) and go to step 3 (photos)
    } else {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const canProceedFromStep = (currentStep) => {
    switch (currentStep) {
      case 1:
        return checkinData.courseId && checkinData.teeTime;
      case 2:
        return checkinData.handedness;
      case 3:
        return Object.values(checkinData.photos).every(photo => photo !== null) && !showVerification;
      case 4:
        return checkinData.clothingDescriptor.top_color && 
               checkinData.clothingDescriptor.bottom_color;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card className="glass-card border-0 shadow-2xl max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center justify-center">
                <MapPin className="mr-3 h-6 w-6" />
                Course & Tee Time
              </CardTitle>
              <CardDescription className="text-emerald-600">
                Select your golf course and tee time
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-emerald-800 font-medium">Golf Course</Label>
                <Select value={checkinData.courseId} onValueChange={handleCourseSelect}>
                  <SelectTrigger className="golf-input">
                    <SelectValue placeholder="Select a golf course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-emerald-800 font-medium">Tee Time</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5" />
                  <Input
                    type="datetime-local"
                    value={checkinData.teeTime}
                    onChange={(e) => setCheckinData({...checkinData, teeTime: e.target.value})}
                    className="golf-input pl-12"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="glass-card border-0 shadow-2xl max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center justify-center">
                <User className="mr-3 h-6 w-6" />
                Player Preferences
              </CardTitle>
              <CardDescription className="text-emerald-600">
                {user?.handedness ? 
                  'Your saved handedness is shown below. You can change it if needed.' :
                  'Tell us about your playing style - this will be saved for future rounds'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-emerald-800 font-medium text-lg">Handedness</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${
                      checkinData.handedness === 'right' 
                        ? 'ring-2 ring-emerald-500 bg-emerald-50' 
                        : 'hover:bg-emerald-50'
                    }`}
                    onClick={() => handleHandednessSelect('right')}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-2">🏌️‍♂️</div>
                      <h3 className="font-semibold text-emerald-800">Right Handed</h3>
                      <p className="text-emerald-600 text-sm">Most common grip</p>
                      {user?.handedness === 'right' && (
                        <div className="mt-2 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                          ✓ Saved preference
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${
                      checkinData.handedness === 'left' 
                        ? 'ring-2 ring-emerald-500 bg-emerald-50' 
                        : 'hover:bg-emerald-50'
                    }`}
                    onClick={() => handleHandednessSelect('left')}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-2">🏌️‍♂️</div>
                      <h3 className="font-semibold text-emerald-800">Left Handed</h3>
                      <p className="text-emerald-600 text-sm">Southpaw swing</p>
                      {user?.handedness === 'left' && (
                        <div className="mt-2 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                          ✓ Saved preference
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <>
            <Card className="glass-card border-0 shadow-2xl max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center justify-center">
                  <Camera className="mr-3 h-6 w-6" />
                  Photo Capture
                </CardTitle>
                <CardDescription className="text-emerald-600">
                  Take photos using your device camera for automatic identification during your round
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {['face', 'front', 'side', 'back'].map((photoType) => (
                    <div key={photoType} className="text-center">
                      <div className="w-full h-48 bg-emerald-100 rounded-lg border-2 border-dashed border-emerald-300 flex items-center justify-center mb-4 overflow-hidden">
                        {checkinData.photos[photoType] ? (
                          <img 
                            src={checkinData.photos[photoType]} 
                            alt={`${photoType} photo`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <Camera className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                            <p className="text-emerald-600 font-medium capitalize">{photoType}</p>
                            <p className="text-emerald-500 text-xs mt-1">
                              {photoType === 'face' && 'For identification'}
                              {photoType === 'front' && 'Full outfit view'}
                              {photoType === 'side' && 'Profile view'}
                              {photoType === 'back' && 'Back view'}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handlePhotoCapture(photoType)}
                        disabled={analyzingPhoto && photoType === 'front'}
                        className="btn-golf-secondary w-full mb-2"
                      >
                        {analyzingPhoto && photoType === 'front' ? (
                          <>
                            <div className="loading-golf mr-2"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            {checkinData.photos[photoType] ? 'Retake' : 'Take'} Photo
                          </>
                        )}
                      </Button>
                      
                      {/* Fallback option for users who can't use camera */}
                      {!checkinData.photos[photoType] && (
                        <Button
                          onClick={() => handleSimulatedCapture(photoType)}
                          variant="outline"
                          className="w-full text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                        >
                          Use Demo Photo
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                {showVerification && aiAnalysis && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">
                      🤖 AI Detected Your Clothing
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Top:</strong> {aiAnalysis.top_color} {aiAnalysis.top_style}
                      </div>
                      <div>
                        <strong>Bottom:</strong> {aiAnalysis.bottom_color}
                      </div>
                      <div>
                        <strong>Hat:</strong> {aiAnalysis.hat_color || 'None detected'}
                      </div>
                      <div>
                        <strong>Shoes:</strong> {aiAnalysis.shoes_color}
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-blue-600">
                      Confidence: {Math.round(aiAnalysis.confidence * 100)}% • 
                      Items: {aiAnalysis.detected_items.join(', ')}
                    </div>
                    
                    <div className="mt-6 flex gap-4">
                      <Button
                        onClick={() => setShowVerification(false)}
                        className="btn-golf-primary flex-1"
                      >
                        ✅ Looks Correct
                      </Button>
                      <Button
                        onClick={() => {
                          setShowVerification(false);
                          setStep(4); // Go to manual correction step
                        }}
                        className="btn-golf-secondary flex-1"
                      >
                        ❌ Needs Correction
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h4 className="font-semibold text-emerald-800 mb-2">📱 Camera Tips:</h4>
                  <ul className="text-emerald-700 text-sm space-y-1">
                    <li>• Ensure good lighting for best results</li>
                    <li>• Face the camera directly for face photo</li>
                    <li>• Stand back to capture full outfit in front photo</li>
                    <li>• AI will analyze your clothing automatically</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            {/* Camera Component */}
            <CameraCapture
              isOpen={cameraOpen}
              onClose={handleCameraClose}
              onCapture={handleCameraCapture}
              photoType={currentPhotoType}
            />
          </>
        );

      case 4:
        return (
          <Card className="glass-card border-0 shadow-2xl max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-emerald-800">
                {aiAnalysis ? 'Verify Clothing Details' : 'Clothing Details'}
              </CardTitle>
              <CardDescription className="text-emerald-600">
                {aiAnalysis 
                  ? 'Review and adjust the AI-detected clothing details' 
                  : 'Describe your outfit for better identification'
                }
              </CardDescription>
              {aiAnalysis && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    🤖 AI has pre-filled these details based on your photo. Please verify they're correct.
                  </p>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">Top Color</Label>
                  <Select 
                    value={checkinData.clothingDescriptor.top_color} 
                    onValueChange={(value) => setCheckinData({
                      ...checkinData,
                      clothingDescriptor: {...checkinData.clothingDescriptor, top_color: value}
                    })}
                  >
                    <SelectTrigger className="golf-input">
                      <SelectValue placeholder="Select top color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                      <SelectItem value="navy">Navy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">Top Style</Label>
                  <Select 
                    value={checkinData.clothingDescriptor.top_style} 
                    onValueChange={(value) => setCheckinData({
                      ...checkinData,
                      clothingDescriptor: {...checkinData.clothingDescriptor, top_style: value}
                    })}
                  >
                    <SelectTrigger className="golf-input">
                      <SelectValue placeholder="Select top style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="polo">Polo Shirt</SelectItem>
                      <SelectItem value="t-shirt">T-Shirt</SelectItem>
                      <SelectItem value="sweater">Sweater</SelectItem>
                      <SelectItem value="jacket">Jacket</SelectItem>
                      <SelectItem value="vest">Vest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">Bottom Color</Label>
                  <Select 
                    value={checkinData.clothingDescriptor.bottom_color} 
                    onValueChange={(value) => setCheckinData({
                      ...checkinData,
                      clothingDescriptor: {...checkinData.clothingDescriptor, bottom_color: value}
                    })}
                  >
                    <SelectTrigger className="golf-input">
                      <SelectValue placeholder="Select bottom color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="khaki">Khaki</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="navy">Navy</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                      <SelectItem value="brown">Brown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-emerald-800 font-medium">Hat Color (Optional)</Label>
                  <Select 
                    value={checkinData.clothingDescriptor.hat_color} 
                    onValueChange={(value) => setCheckinData({
                      ...checkinData,
                      clothingDescriptor: {...checkinData.clothingDescriptor, hat_color: value}
                    })}
                  >
                    <SelectTrigger className="golf-input">
                      <SelectValue placeholder="Select hat color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Hat</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-emerald-800 font-medium">Shoe Color</Label>
                  <Select 
                    value={checkinData.clothingDescriptor.shoes_color} 
                    onValueChange={(value) => setCheckinData({
                      ...checkinData,
                      clothingDescriptor: {...checkinData.clothingDescriptor, shoes_color: value}
                    })}
                  >
                    <SelectTrigger className="golf-input">
                      <SelectValue placeholder="Select shoe color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="brown">Brown</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="glass-card border-0 shadow-2xl max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-emerald-800 mb-4">Check-in Complete!</h2>
              <p className="text-emerald-600 text-lg mb-8">
                You're all set! Our cameras will automatically identify and capture your shots during your round.
              </p>
              <div className="space-y-4">
                <Button
                  onClick={() => navigate('/')}
                  className="btn-golf-primary w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen hero-background flex items-center justify-center p-4">
      <div className="w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="https://customer-assets.emergentagent.com/job_b432ac39-e954-4a9f-affa-6f7c24334e04/artifacts/hv3qu3ev_Birdieo-logo.png" 
              alt="Birdieo" 
              className="birdieo-logo"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Round Check-in</h1>
          <p className="text-emerald-100 text-lg">
            Step {step > 2 && user?.handedness ? step - 1 : step} of {user?.handedness ? 3 : 4} - {step < 5 ? 'Complete your check-in process' : 'All done!'}
          </p>
        </div>

        {/* Progress Bar */}
        {step < 5 && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="w-full bg-emerald-200 rounded-full h-2">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${user?.handedness ? 
                    ((step > 2 ? step - 1 : step) / 3) * 100 : 
                    (step / 4) * 100
                  }%` 
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="fade-in">
          {renderStep()}
        </div>

        {/* Navigation */}
        {step < 5 && (
          <div className="max-w-2xl mx-auto mt-8 flex justify-between">
            <Button
              onClick={step === 1 ? () => navigate('/') : prevStep}
              className="btn-golf-secondary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 1 ? 'Cancel' : 'Previous'}
            </Button>
            
            <Button
              onClick={step === 4 ? handleSubmit : nextStep}
              disabled={!canProceedFromStep(step) || loading}
              className="btn-golf-primary"
            >
              {loading ? (
                <div className="loading-golf"></div>
              ) : (
                <>
                  {step === 4 ? 'Complete Check-in' : 'Next'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};