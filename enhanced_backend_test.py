#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime, timezone, timedelta

class EnhancedBirdieoAPITester:
    def __init__(self, base_url="https://birdieo-clips.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def test_enhanced_ai_detection_quality(self):
        """Test enhanced AI detection with higher quality processing"""
        try:
            response = self.session.get(f"{self.api_url}/stream/analyze")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for enhanced detection features
                persons = data.get('persons', [])
                detections = data.get('detections', [])
                
                enhanced_features = []
                
                # Check for higher confidence scores (≥0.7 as mentioned in review)
                high_confidence_detections = 0
                for person in persons:
                    confidence = person.get('confidence', 0)
                    if confidence >= 0.7:
                        high_confidence_detections += 1
                        enhanced_features.append(f"High confidence: {confidence:.2f}")
                
                # Check for precision bounding boxes
                precision_boxes = 0
                for person in persons:
                    box = person.get('box', {})
                    if all(key in box for key in ['x', 'y', 'w', 'h']):
                        # Check for reasonable box dimensions (not too small/large)
                        if box['w'] >= 10 and box['h'] >= 20:  # Minimum sizes as per code
                            precision_boxes += 1
                            enhanced_features.append(f"Precision box: {box['w']}x{box['h']}")
                
                # Check for enhanced coordinate validation
                valid_coordinates = 0
                for person in persons:
                    box = person.get('box', {})
                    center = person.get('center_point', {})
                    if box and center and 'x' in center and 'y' in center:
                        valid_coordinates += 1
                
                details = f"- High confidence: {high_confidence_detections}, Precision boxes: {precision_boxes}, Valid coords: {valid_coordinates}"
                if enhanced_features:
                    details += f", Features: {', '.join(enhanced_features[:3])}"
                
                return self.log_test("Enhanced AI Detection Quality", 
                                   high_confidence_detections > 0 and precision_boxes > 0, 
                                   details)
            else:
                return self.log_test("Enhanced AI Detection Quality", False, f"- Status: {response.status_code}")
                
        except Exception as e:
            return self.log_test("Enhanced AI Detection Quality", False, f"- Error: {str(e)}")

    def test_enhanced_frame_processing(self):
        """Test enhanced frame processing with better accuracy"""
        try:
            # Test regular frame
            frame_response = self.session.get(f"{self.api_url}/stream/frame")
            
            # Test enhanced frame with detection
            enhanced_response = self.session.get(f"{self.api_url}/stream/frame-with-detection")
            
            if frame_response.status_code == 200 and enhanced_response.status_code == 200:
                frame_size = len(frame_response.content)
                enhanced_size = len(enhanced_response.content)
                
                # Enhanced frame should be larger due to processing (bounding boxes, etc.)
                size_increase = enhanced_size > frame_size
                
                # Check for reasonable image sizes (should be substantial)
                reasonable_size = enhanced_size > 50000  # At least 50KB for processed image
                
                details = f"- Frame: {frame_size} bytes, Enhanced: {enhanced_size} bytes"
                if size_increase:
                    details += f", Size increase: {((enhanced_size - frame_size) / frame_size * 100):.1f}%"
                
                return self.log_test("Enhanced Frame Processing", 
                                   size_increase and reasonable_size, 
                                   details)
            else:
                return self.log_test("Enhanced Frame Processing", False, 
                                   f"- Frame: {frame_response.status_code}, Enhanced: {enhanced_response.status_code}")
                
        except Exception as e:
            return self.log_test("Enhanced Frame Processing", False, f"- Error: {str(e)}")

    def test_person_tracking_persistence(self):
        """Test person ID tracking persistence across multiple calls"""
        try:
            person_tracking = {}
            
            # Make multiple calls to track person IDs over time
            for i in range(5):
                response = self.session.get(f"{self.api_url}/stream/analyze")
                
                if response.status_code == 200:
                    data = response.json()
                    persons = data.get('persons', [])
                    
                    for person in persons:
                        person_id = person.get('person_id', '')
                        confidence = person.get('confidence', 0)
                        box = person.get('box', {})
                        
                        if person_id not in person_tracking:
                            person_tracking[person_id] = {
                                'first_seen': i,
                                'last_seen': i,
                                'appearances': 1,
                                'avg_confidence': confidence,
                                'positions': [box]
                            }
                        else:
                            tracking = person_tracking[person_id]
                            tracking['last_seen'] = i
                            tracking['appearances'] += 1
                            tracking['avg_confidence'] = (tracking['avg_confidence'] + confidence) / 2
                            tracking['positions'].append(box)
                
                time.sleep(0.5)  # Wait between calls
            
            # Analyze tracking results
            persistent_persons = 0
            total_appearances = 0
            
            for person_id, tracking in person_tracking.items():
                total_appearances += tracking['appearances']
                if tracking['appearances'] >= 3:  # Appeared in at least 3 calls
                    persistent_persons += 1
            
            details = f"- Tracked IDs: {len(person_tracking)}, Persistent: {persistent_persons}, Total appearances: {total_appearances}"
            if person_tracking:
                sample_id = list(person_tracking.keys())[0]
                sample_tracking = person_tracking[sample_id]
                details += f", Sample {sample_id}: {sample_tracking['appearances']} appearances"
            
            return self.log_test("Person Tracking Persistence", 
                               len(person_tracking) > 0 and total_appearances >= 5, 
                               details)
                
        except Exception as e:
            return self.log_test("Person Tracking Persistence", False, f"- Error: {str(e)}")

    def test_enhanced_coordinate_precision(self):
        """Test enhanced coordinate precision and validation"""
        try:
            response = self.session.get(f"{self.api_url}/stream/analyze")
            
            if response.status_code == 200:
                data = response.json()
                persons = data.get('persons', [])
                width = data.get('width', 0)
                height = data.get('height', 0)
                
                precision_checks = {
                    'valid_bounds': 0,
                    'minimum_sizes': 0,
                    'center_accuracy': 0,
                    'coordinate_types': 0
                }
                
                for person in persons:
                    box = person.get('box', {})
                    center = person.get('center_point', {})
                    
                    # Check coordinate bounds
                    if (box.get('x', -1) >= 0 and box.get('y', -1) >= 0 and 
                        box.get('x', 0) + box.get('w', 0) <= width and 
                        box.get('y', 0) + box.get('h', 0) <= height):
                        precision_checks['valid_bounds'] += 1
                    
                    # Check minimum sizes (as per enhanced detection code)
                    if box.get('w', 0) >= 10 and box.get('h', 0) >= 20:
                        precision_checks['minimum_sizes'] += 1
                    
                    # Check center point accuracy
                    expected_center_x = box.get('x', 0) + box.get('w', 0) // 2
                    expected_center_y = box.get('y', 0) + box.get('h', 0) // 2
                    if (abs(center.get('x', 0) - expected_center_x) <= 1 and 
                        abs(center.get('y', 0) - expected_center_y) <= 1):
                        precision_checks['center_accuracy'] += 1
                    
                    # Check coordinate types (should be integers)
                    if (isinstance(box.get('x'), int) and isinstance(box.get('y'), int) and
                        isinstance(box.get('w'), int) and isinstance(box.get('h'), int)):
                        precision_checks['coordinate_types'] += 1
                
                total_persons = len(persons)
                all_precise = all(check == total_persons for check in precision_checks.values()) if total_persons > 0 else False
                
                details = f"- Persons: {total_persons}, Frame: {width}x{height}"
                for check_name, count in precision_checks.items():
                    details += f", {check_name}: {count}/{total_persons}"
                
                return self.log_test("Enhanced Coordinate Precision", 
                                   all_precise and total_persons > 0, 
                                   details)
            else:
                return self.log_test("Enhanced Coordinate Precision", False, f"- Status: {response.status_code}")
                
        except Exception as e:
            return self.log_test("Enhanced Coordinate Precision", False, f"- Error: {str(e)}")

    def test_local_clip_processing(self):
        """Test local clip processing functionality"""
        try:
            # Test the capture clip endpoint which should use local processing
            response = self.session.post(f"{self.api_url}/stream/capture-clip", 
                                       json={"hole_number": 1})
            
            if response.status_code == 200:
                data = response.json()
                clip = data.get('clip', {})
                
                # Check for enhanced clip features
                enhanced_features = []
                
                # Check confidence scores (should be high for enhanced processing)
                confidence_score = clip.get('confidence_score', 0)
                if confidence_score >= 0.8:
                    enhanced_features.append(f"High confidence: {confidence_score}")
                
                # Check frame accuracy score
                frame_accuracy = clip.get('frame_accuracy_score', 0)
                if frame_accuracy >= 0.8:
                    enhanced_features.append(f"High accuracy: {frame_accuracy}")
                
                # Check clip metadata
                clip_id = clip.get('id', '')
                subject_id = clip.get('subject_id', '')
                file_path = clip.get('file_path', '')
                
                if clip_id and subject_id and file_path:
                    enhanced_features.append("Complete metadata")
                
                details = f"- Clip ID: {clip_id[:8]}..., Confidence: {confidence_score}, Accuracy: {frame_accuracy}"
                if enhanced_features:
                    details += f", Features: {', '.join(enhanced_features)}"
                
                return self.log_test("Local Clip Processing", 
                                   len(enhanced_features) >= 2, 
                                   details)
            else:
                return self.log_test("Local Clip Processing", False, f"- Status: {response.status_code}")
                
        except Exception as e:
            return self.log_test("Local Clip Processing", False, f"- Error: {str(e)}")

    def test_enhanced_ai_model_indicators(self):
        """Test for enhanced AI model indicators and status"""
        try:
            # Test stream health for enhanced indicators
            health_response = self.session.get(f"{self.api_url}/stream/health")
            
            # Test persons endpoint for enhanced tracking
            persons_response = self.session.get(f"{self.api_url}/stream/persons")
            
            if health_response.status_code == 200 and persons_response.status_code == 200:
                health_data = health_response.json()
                persons_data = persons_response.json()
                
                enhanced_indicators = []
                
                # Check stream health
                if health_data.get('ok', False):
                    enhanced_indicators.append("Stream active")
                
                # Check for active person tracking
                active_persons = persons_data.get('active_persons', [])
                total_tracked = persons_data.get('total_tracked', 0)
                
                if total_tracked > 0:
                    enhanced_indicators.append(f"Tracking {total_tracked} persons")
                
                # Check for recent tracking activity
                timestamp = persons_data.get('timestamp', '')
                if timestamp:
                    enhanced_indicators.append("Real-time tracking")
                
                # Validate person data quality
                valid_tracking_data = 0
                for person in active_persons:
                    if all(key in person for key in ['person_id', 'confidence', 'box', 'center_point', 'duration_seconds']):
                        valid_tracking_data += 1
                
                if valid_tracking_data == len(active_persons) and len(active_persons) > 0:
                    enhanced_indicators.append("High-quality tracking data")
                
                details = f"- Active persons: {len(active_persons)}, Total tracked: {total_tracked}"
                if enhanced_indicators:
                    details += f", Indicators: {', '.join(enhanced_indicators)}"
                
                return self.log_test("Enhanced AI Model Indicators", 
                                   len(enhanced_indicators) >= 2, 
                                   details)
            else:
                return self.log_test("Enhanced AI Model Indicators", False, 
                                   f"- Health: {health_response.status_code}, Persons: {persons_response.status_code}")
                
        except Exception as e:
            return self.log_test("Enhanced AI Model Indicators", False, f"- Error: {str(e)}")

    def run_enhanced_tests(self):
        """Run enhanced feature tests"""
        print("🚀 Starting Enhanced Birdieo.ai API Tests")
        print(f"📡 Testing enhanced features against: {self.base_url}")
        print("=" * 60)
        
        print("\n🤖 Enhanced AI Detection Tests")
        print("-" * 40)
        self.test_enhanced_ai_detection_quality()
        self.test_enhanced_frame_processing()
        self.test_person_tracking_persistence()
        self.test_enhanced_coordinate_precision()
        
        print("\n🎬 Enhanced Processing Tests")
        print("-" * 40)
        self.test_local_clip_processing()
        self.test_enhanced_ai_model_indicators()
        
        # Final Results
        print("\n" + "=" * 60)
        print(f"📈 Enhanced Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All enhanced features are working correctly!")
            return 0
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} enhanced feature test(s) failed.")
            return 1

def main():
    """Main test execution"""
    tester = EnhancedBirdieoAPITester()
    return tester.run_enhanced_tests()

if __name__ == "__main__":
    sys.exit(main())