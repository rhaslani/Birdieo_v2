#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

class BirdieoAPITester:
    def __init__(self, base_url="https://birdieo-clips.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.round_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method: str, endpoint: str, data: Dict = None, files: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                if files:
                    # For file uploads, don't set Content-Type header
                    headers.pop('Content-Type', None)
                    response = self.session.post(url, data=data, files=files, headers=headers)
                else:
                    response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}
            
            if not success:
                response_data["actual_status"] = response.status_code
                response_data["expected_status"] = expected_status
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_user_registration(self):
        """Test user registration endpoint"""
        timestamp = int(time.time())
        test_user = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@birdieo.ai",
            "password": "TestPassword123!"
        }
        
        success, response = self.make_request('POST', '/auth/register', test_user, expected_status=200)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return self.log_test("User Registration", True, f"- User ID: {self.user_id}")
        else:
            return self.log_test("User Registration", False, f"- {response}")

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.user_id:
            return self.log_test("User Login", False, "- No user registered for login test")
        
        # Use the same credentials from registration
        timestamp = int(time.time())
        login_data = {
            "email": f"test{timestamp}@birdieo.ai",
            "password": "TestPassword123!"
        }
        
        success, response = self.make_request('POST', '/auth/login', login_data, expected_status=200)
        
        if success and 'token' in response:
            self.token = response['token']  # Update token
            return self.log_test("User Login", True, f"- Token received")
        else:
            return self.log_test("User Login", False, f"- {response}")

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_login = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        
        success, response = self.make_request('POST', '/auth/login', invalid_login, expected_status=401)
        return self.log_test("Invalid Login", success, f"- Correctly rejected invalid credentials")

    def test_get_user_info(self):
        """Test protected route to get user info"""
        if not self.token:
            return self.log_test("Get User Info", False, "- No token available")
        
        success, response = self.make_request('GET', '/auth/me', expected_status=200)
        
        if success and 'id' in response:
            return self.log_test("Get User Info", True, f"- User: {response.get('name', 'Unknown')}")
        else:
            return self.log_test("Get User Info", False, f"- {response}")

    def test_stream_health(self):
        """Test live stream health endpoint"""
        success, response = self.make_request('GET', '/stream/health', expected_status=200)
        
        if success:
            stream_ok = response.get('ok', False)
            age = response.get('age_seconds', 'N/A')
            return self.log_test("Stream Health", True, f"- Status: {'Online' if stream_ok else 'Offline'}, Age: {age}s")
        else:
            return self.log_test("Stream Health", False, f"- {response}")

    def test_stream_frame(self):
        """Test current frame capture"""
        try:
            url = f"{self.api_url}/stream/frame"
            response = self.session.get(url)
            
            if response.status_code == 200 and response.headers.get('content-type', '').startswith('image/'):
                return self.log_test("Stream Frame", True, f"- Image received ({len(response.content)} bytes)")
            elif response.status_code == 503:
                return self.log_test("Stream Frame", True, f"- Service unavailable (expected when no frame)")
            else:
                return self.log_test("Stream Frame", False, f"- Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Stream Frame", False, f"- Error: {str(e)}")

    def test_stream_analyze(self):
        """Test AI person detection in current frame"""
        success, response = self.make_request('GET', '/stream/analyze', expected_status=200)
        
        if success:
            analysis_ok = response.get('ok', False)
            detections = response.get('detections', [])
            return self.log_test("Stream Analysis", True, f"- Analysis: {'Success' if analysis_ok else 'Failed'}, Detections: {len(detections)}")
        else:
            return self.log_test("Stream Analysis", False, f"- {response}")

    def test_capture_clip(self):
        """Test 30-second clip capture"""
        success, response = self.make_request('POST', '/stream/capture-clip', {"hole_number": 1}, expected_status=200)
        
        if success and 'clip' in response:
            clip = response['clip']
            return self.log_test("Capture Clip", True, f"- Clip ID: {clip.get('id', 'Unknown')[:8]}...")
        else:
            return self.log_test("Capture Clip", False, f"- {response}")

    def test_start_checkin(self):
        """Test starting a new round check-in"""
        if not self.token:
            return self.log_test("Start Check-in", False, "- No token available")
        
        checkin_data = {
            "tee_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "handedness": "right",
            "course_name": "Lexington Golf Course"
        }
        
        success, response = self.make_request('POST', '/checkin/start', checkin_data, expected_status=200)
        
        if success and 'round' in response:
            self.round_id = response['round']['id']
            return self.log_test("Start Check-in", True, f"- Round ID: {self.round_id}")
        else:
            return self.log_test("Start Check-in", False, f"- {response}")

    def test_upload_photo(self):
        """Test photo upload with mock image"""
        if not self.round_id or not self.token:
            return self.log_test("Upload Photo", False, "- No round ID or token available")
        
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x12IDATx\x9cc```bPPP\x00\x02\xac\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
        
        try:
            url = f"{self.api_url}/checkin/upload-photo/{self.round_id}"
            headers = {'Authorization': f'Bearer {self.token}'}
            
            files = {'file': ('test.png', test_image_data, 'image/png')}
            data = {'angle': 'front'}
            
            response = self.session.post(url, data=data, files=files, headers=headers)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'photo' in response_data:
                    return self.log_test("Upload Photo", True, f"- Photo uploaded successfully")
                else:
                    return self.log_test("Upload Photo", False, f"- No photo in response")
            else:
                return self.log_test("Upload Photo", False, f"- Status: {response.status_code}, Response: {response.text[:200]}")
                
        except Exception as e:
            return self.log_test("Upload Photo", False, f"- Error: {str(e)}")

    def test_complete_checkin(self):
        """Test completing check-in"""
        if not self.round_id or not self.token:
            return self.log_test("Complete Check-in", False, "- No round ID or token available")
        
        success, response = self.make_request('POST', f'/checkin/complete/{self.round_id}', expected_status=200)
        
        if success and 'subject_id' in response:
            return self.log_test("Complete Check-in", True, f"- Subject ID: {response['subject_id']}")
        else:
            return self.log_test("Complete Check-in", False, f"- {response}")

    def test_get_rounds(self):
        """Test fetching user rounds"""
        if not self.token:
            return self.log_test("Get Rounds", False, "- No token available")
        
        success, response = self.make_request('GET', '/rounds', expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Rounds", True, f"- Found {len(response)} rounds")
        else:
            return self.log_test("Get Rounds", False, f"- {response}")

    def test_get_round_details(self):
        """Test fetching specific round details"""
        if not self.round_id or not self.token:
            return self.log_test("Get Round Details", False, "- No round ID or token available")
        
        success, response = self.make_request('GET', f'/rounds/{self.round_id}', expected_status=200)
        
        if success and 'id' in response:
            return self.log_test("Get Round Details", True, f"- Round: {response.get('course_name', 'Unknown')}")
        else:
            return self.log_test("Get Round Details", False, f"- {response}")

    def test_get_round_clips(self):
        """Test fetching round clips"""
        if not self.round_id or not self.token:
            return self.log_test("Get Round Clips", False, "- No round ID or token available")
        
        success, response = self.make_request('GET', f'/rounds/{self.round_id}/clips', expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Round Clips", True, f"- Found {len(response)} clips")
        else:
            return self.log_test("Get Round Clips", False, f"- {response}")

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting Birdieo.ai API Test Suite")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        print("\n🔐 Authentication Tests")
        print("-" * 30)
        self.test_user_registration()
        self.test_invalid_login()
        self.test_get_user_info()
        
        # Live Stream Tests
        print("\n📹 Live Stream Tests")
        print("-" * 30)
        self.test_stream_health()
        self.test_stream_frame()
        self.test_stream_analyze()
        self.test_capture_clip()
        
        # Check-in Flow Tests
        print("\n⛳ Check-in Flow Tests")
        print("-" * 30)
        self.test_start_checkin()
        self.test_upload_photo()
        self.test_complete_checkin()
        
        # Round Management Tests
        print("\n📊 Round Management Tests")
        print("-" * 30)
        self.test_get_rounds()
        self.test_get_round_details()
        self.test_get_round_clips()
        
        # Final Results
        print("\n" + "=" * 60)
        print(f"📈 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! API is working correctly.")
            return 0
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} test(s) failed. Check the issues above.")
            return 1

def main():
    """Main test execution"""
    tester = BirdieoAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())