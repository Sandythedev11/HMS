#!/usr/bin/env python3

import requests
import os
import json

# Test script to verify profile picture upload functionality

def test_upload_endpoint():
    """Test if the upload endpoint is working correctly"""
    
    # Backend URL
    base_url = "http://localhost:5000/api"
    
    print("Testing profile picture upload functionality...")
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{base_url}/test-cors")
        print(f"✓ Server is running (Status: {response.status_code})")
        print(f"✓ CORS headers: {dict(response.headers)}")
    except requests.exceptions.ConnectionError:
        print("✗ Server is not running or not accessible")
        return False
    
    # Test 2: Check uploads directory
    upload_dir = "uploads/profile_pictures"
    if not os.path.exists(upload_dir):
        print(f"⚠ Upload directory doesn't exist: {upload_dir}")
        print("Creating upload directory...")
        os.makedirs(upload_dir, exist_ok=True)
        print(f"✓ Created upload directory: {upload_dir}")
    else:
        print(f"✓ Upload directory exists: {upload_dir}")
    
    # Test 3: Check file serving endpoint
    print("\nTesting file serving...")
    # Create a test file
    test_filename = "test-image.jpg"
    test_filepath = os.path.join(upload_dir, test_filename)
    
    # Create a simple test file
    with open(test_filepath, "w") as f:
        f.write("test image content")
    
    try:
        response = requests.get(f"{base_url}/uploads/profile_pictures/{test_filename}")
        print(f"✓ File serving works (Status: {response.status_code})")
    except Exception as e:
        print(f"✗ File serving failed: {e}")
    finally:
        # Clean up test file
        if os.path.exists(test_filepath):
            os.remove(test_filepath)
    
    return True

def main():
    print("Profile Picture Upload Test")
    print("=" * 40)
    
    test_upload_endpoint()

if __name__ == "__main__":
    main() 