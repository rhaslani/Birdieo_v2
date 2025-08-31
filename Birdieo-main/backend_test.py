import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class BirdieoAPITester:
    def __init__(self, base_url="https://shotspotter-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.round_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@birdieo.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Try to login with the registered user
        if not hasattr(self, 'test_email'):
            return False
            
        login_data = {
            "email": self.test_email,
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_checkin(self):
        """Test creating a check-in (round)"""
        # Create tee time for tomorrow
        tee_time = datetime.now(timezone.utc) + timedelta(days=1)
        
        checkin_data = {
            "tee_time": tee_time.isoformat(),
            "course_id": "pebble_beach",
            "course_name": "Pebble Beach Golf Links",
            "handedness": "right"
        }
        
        success, response = self.run_test(
            "Create Check-in",
            "POST",
            "checkin",
            200,
            data=checkin_data
        )
        
        if success and 'round_id' in response:
            self.round_id = response['round_id']
            print(f"   Round ID: {self.round_id}")
            return True
        return False

    def test_capture_photos(self):
        """Test photo capture step"""
        if not self.round_id:
            self.log_test("Capture Photos", False, "No round_id available")
            return False
            
        photo_data = {
            "round_id": self.round_id,
            "face_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "front_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "side_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "back_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "clothing_descriptor": {
                "top_color": "navy",
                "top_style": "polo",
                "bottom_color": "khaki",
                "hat_color": "white",
                "shoes_color": "brown"
            }
        }
        
        success, response = self.run_test(
            "Capture Photos",
            "POST",
            "checkin/photos",
            200,
            data=photo_data
        )
        return success

    def test_get_user_rounds(self):
        """Test getting user rounds"""
        success, response = self.run_test(
            "Get User Rounds",
            "GET",
            "rounds",
            200
        )
        
        if success:
            print(f"   Found {len(response)} rounds")
        return success

    def test_generate_demo_clips(self):
        """Test generating demo clips for a round"""
        if not self.round_id:
            self.log_test("Generate Demo Clips", False, "No round_id available")
            return False
            
        success, response = self.run_test(
            "Generate Demo Clips",
            "POST",
            f"demo/generate-clips/{self.round_id}",
            200
        )
        return success

    def test_get_round_details(self):
        """Test getting round details"""
        if not self.round_id:
            self.log_test("Get Round Details", False, "No round_id available")
            return False
            
        success, response = self.run_test(
            "Get Round Details",
            "GET",
            f"rounds/{self.round_id}",
            200
        )
        
        if success:
            clips_count = len(response.get('clips', []))
            print(f"   Round has {clips_count} clips")
        return success

    def test_get_round_clips(self):
        """Test getting clips for a round"""
        if not self.round_id:
            self.log_test("Get Round Clips", False, "No round_id available")
            return False
            
        success, response = self.run_test(
            "Get Round Clips",
            "GET",
            f"clips/{self.round_id}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} clips")
        return success

    def run_all_tests(self):
        """Run complete test suite"""
        print("🏌️ Starting Birdieo API Test Suite")
        print("=" * 50)
        
        # Test authentication flow
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
            
        if not self.test_get_current_user():
            print("❌ User verification failed")
            return False
            
        # Test check-in flow
        if not self.test_create_checkin():
            print("❌ Check-in creation failed")
            return False
            
        if not self.test_capture_photos():
            print("❌ Photo capture failed")
            return False
            
        # Test round management
        self.test_get_user_rounds()
        
        # Test demo clip generation
        if not self.test_generate_demo_clips():
            print("❌ Demo clip generation failed")
            return False
            
        # Test round details and clips
        self.test_get_round_details()
        self.test_get_round_clips()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = BirdieoAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        return 0 if success else 1
    except Exception as e:
        print(f"❌ Test suite failed with error: {str(e)}")
        tester.print_summary()
        return 1

if __name__ == "__main__":
    sys.exit(main())