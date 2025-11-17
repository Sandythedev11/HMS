import requests
import sys

def test_image_serving():
    """Test if the profile picture file serving endpoint works"""
    
    # Test the image URL from the previous test
    image_url = "http://localhost:5000/api/uploads/profile_pictures/7a1da9d6-f1eb-40c3-8be2-14323d60f73a.jpg"
    
    try:
        print(f"Testing image URL: {image_url}")
        print("Making HEAD request...")
        
        response = requests.head(image_url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
        print(f"Content-Length: {response.headers.get('Content-Length', 'Not specified')}")
        
        if response.status_code == 200:
            print("✅ Image serving is working correctly!")
            
            # Test with a GET request to make sure the image data is actually returned
            print("Making GET request...")
            get_response = requests.get(image_url, timeout=10)
            if get_response.status_code == 200 and len(get_response.content) > 0:
                print(f"✅ Image data retrieved successfully! Size: {len(get_response.content)} bytes")
            else:
                print(f"❌ Failed to retrieve image data. Status: {get_response.status_code}, Size: {len(get_response.content)}")
        else:
            print(f"❌ Image serving failed with status code: {response.status_code}")
            print(f"Response text: {response.text}")
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error: {str(e)}")
        print("Make sure the Flask server is running on http://localhost:5000")
    except requests.exceptions.Timeout as e:
        print(f"❌ Timeout error: {str(e)}")
    except Exception as e:
        print(f"❌ Error testing image serving: {str(e)}")

if __name__ == "__main__":
    print("Starting image serving test...")
    test_image_serving()
    print("Test completed.") 