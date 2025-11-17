import requests
import json

# Test the admin students API endpoint
API_URL = "http://localhost:5000/api"

def test_admin_students_api():
    """Test the /admin/students/approved endpoint"""
    
    # First, login as admin to get token
    login_data = {
        "email": "sandeepgouda209@gmail.com",  # Admin email
        "password": "Admin@123"  # Admin password
    }
    
    try:
        # Login
        print("Logging in as admin...")
        login_response = requests.post(f"{API_URL}/login", json=login_data)
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code} - {login_response.text}")
            return
        
        login_result = login_response.json()
        token = login_result.get('token')
        
        if not token:
            print("No token received from login")
            return
        
        print("Login successful!")
        
        # Test the approved students endpoint
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        print("Fetching approved students...")
        students_response = requests.get(f"{API_URL}/admin/students/approved", headers=headers)
        
        if students_response.status_code != 200:
            print(f"Failed to fetch students: {students_response.status_code} - {students_response.text}")
            return
        
        students_data = students_response.json()
        print(f"Successfully fetched {len(students_data)} approved students")
        
        # Check for profile pictures
        students_with_pictures = 0
        for student in students_data:
            print(f"\nStudent: {student.get('name', 'Unknown')} ({student.get('roll_number', 'No roll number')})")
            print(f"  Email: {student.get('email', 'No email')}")
            profile_picture = student.get('profile_picture')
            if profile_picture:
                print(f"  Profile Picture: {profile_picture}")
                students_with_pictures += 1
            else:
                print("  Profile Picture: None")
            
            print(f"  Course: {student.get('course', 'Not specified')}")
            print(f"  Room: {student.get('room_number', 'Not allocated')}")
        
        print(f"\nSummary: {students_with_pictures} out of {len(students_data)} students have profile pictures")
        
    except Exception as e:
        print(f"Error testing API: {str(e)}")

if __name__ == "__main__":
    test_admin_students_api() 