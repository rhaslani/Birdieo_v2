import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export const PersonDetection = ({ 
  videoRef, 
  onDetection, 
  isActive = false,
  showBoundingBoxes = true,
  targetClothingColors = ['blue', 'red', 'white', 'green']
}) => {
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detections, setDetections] = useState([]);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      loadModel();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (model && isActive && videoRef.current) {
      startDetection();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [model, isActive]);

  const loadModel = async () => {
    try {
      setIsLoading(true);
      console.log('Loading TensorFlow.js model...');
      
      // Load the COCO-SSD model for object detection
      const loadedModel = await cocoSsd.load({
        base: 'mobilenet_v2' // Faster for real-time detection
      });
      
      setModel(loadedModel);
      console.log('Model loaded successfully');
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeClothingColor = (imageData, bbox) => {
    // Extract region of interest (person's upper body for clothing)
    const [x, y, width, height] = bbox;
    const upperBodyHeight = height * 0.4; // Focus on upper 40% of person
    
    // Sample colors from the upper body region
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = upperBodyHeight;
    
    try {
      // Create a temporary canvas for color analysis
      ctx.putImageData(imageData, 0, 0, x, y, width, upperBodyHeight);
      const tempImageData = ctx.getImageData(0, 0, width, upperBodyHeight);
      
      // Analyze dominant colors
      const colorCounts = {};
      const data = tempImageData.data;
      
      // Sample every 10th pixel for performance
      for (let i = 0; i < data.length; i += 40) { // RGBA = 4 bytes per pixel
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        
        if (alpha > 128) { // Only count non-transparent pixels
          const colorCategory = categorizeColor(r, g, b);
          colorCounts[colorCategory] = (colorCounts[colorCategory] || 0) + 1;
        }
      }
      
      // Find dominant color
      const dominantColor = Object.entries(colorCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
      
      return dominantColor;
    } catch (error) {
      console.error('Color analysis error:', error);
      return 'unknown';
    }
  };

  const categorizeColor = (r, g, b) => {
    // Simple color categorization based on RGB values
    if (r > 200 && g > 200 && b > 200) return 'white';
    if (r < 80 && g < 80 && b < 80) return 'black';
    if (r > g + 50 && r > b + 50) return 'red';
    if (b > r + 50 && b > g + 50) return 'blue';
    if (g > r + 50 && g > b + 50) return 'green';
    if (r > 150 && g > 150 && b < 100) return 'yellow';
    if (r > 100 && g < 80 && b > 100) return 'purple';
    if (r > 100 && g > 80 && b < 80) return 'orange';
    if (r > 80 && g > 60 && b < 60) return 'brown';
    return 'gray';
  };

  const startDetection = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth || video.width || 640;
    canvas.height = video.videoHeight || video.height || 480;

    const detectFrame = async () => {
      if (!isActive || !model) return;

      try {
        // Run inference
        const predictions = await model.detect(video);
        
        // Filter for person detections only
        const personDetections = predictions.filter(
          prediction => prediction.class === 'person' && prediction.score > 0.5
        );

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame
        if (showBoundingBoxes) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // Process each person detection
        const enrichedDetections = [];
        
        for (const detection of personDetections) {
          const [x, y, width, height] = detection.bbox;
          
          // Get image data for color analysis
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(x, y, width, height);
          
          // Analyze clothing color
          const clothingColor = analyzeClothingColor(imageData, detection.bbox);
          
          const enrichedDetection = {
            ...detection,
            clothingColor,
            isTarget: targetClothingColors.includes(clothingColor),
            timestamp: Date.now(),
            id: `person_${x}_${y}_${Date.now()}`
          };

          enrichedDetections.push(enrichedDetection);

          if (showBoundingBoxes) {
            // Draw bounding box
            const boxColor = enrichedDetection.isTarget ? '#00ff00' : '#ff6b6b';
            const boxWidth = enrichedDetection.isTarget ? 4 : 2;
            
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = boxWidth;
            ctx.strokeRect(x, y, width, height);

            // Draw label background
            const label = `Person ${(detection.score * 100).toFixed(0)}% - ${clothingColor}`;
            const labelWidth = ctx.measureText(label).width + 10;
            const labelHeight = 25;

            ctx.fillStyle = boxColor;
            ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

            // Draw label text
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText(label, x + 5, y - 8);

            // Add target indicator for specific colors
            if (enrichedDetection.isTarget) {
              ctx.fillStyle = '#00ff00';
              ctx.font = 'bold 16px Arial';
              ctx.fillText('🎯 TARGET', x + 5, y + height + 20);
            }
          }
        }

        setDetections(enrichedDetections);
        
        // Callback with detection results
        if (onDetection) {
          onDetection(enrichedDetections);
        }

      } catch (error) {
        console.error('Detection error:', error);
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    // Start detection loop
    detectFrame();
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 ${showBoundingBoxes ? 'pointer-events-none' : 'hidden'}`}
        style={{ zIndex: 10 }}
      />
      
      {isLoading && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Loading AI Model...</span>
          </div>
        </div>
      )}

      {model && isActive && (
        <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm">AI Detection Active</span>
          </div>
        </div>
      )}

      {detections.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg">
          <div className="text-sm">
            <div className="font-semibold mb-1">Detected: {detections.length} people</div>
            {detections.map((detection, index) => (
              <div key={detection.id} className="text-xs">
                Person {index + 1}: {detection.clothingColor} 
                {detection.isTarget && <span className="text-green-400 ml-1">🎯</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};