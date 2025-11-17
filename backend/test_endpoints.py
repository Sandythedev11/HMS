#!/usr/bin/env python3

"""
Test script to verify fingerprint endpoints are working correctly
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_fingerprint_endpoints():
    print("Testing fingerprint endpoints...")
    
    # Test sensor status endpoint (no auth required for testing)
    try:
        print("\n1. Testing sensor status endpoint...")
        response = requests.get(f"{BASE_URL}/admin/fingerprint/sensor/status")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 401:
            print("✓ Endpoint requires authentication (expected)")
        else:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test sensor initialize endpoint (no auth required for testing)
    try:
        print("\n2. Testing sensor initialize endpoint...")
        response = requests.post(f"{BASE_URL}/admin/fingerprint/sensor/initialize")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 401:
            print("✓ Endpoint requires authentication (expected)")
        else:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test attendance window status endpoint
    try:
        print("\n3. Testing attendance window status endpoint...")
        response = requests.get(f"{BASE_URL}/admin/attendance/window")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 401:
            print("✓ Endpoint requires authentication (expected)")
        else:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test CORS endpoint
    try:
        print("\n4. Testing CORS endpoint...")
        response = requests.get(f"{BASE_URL}/test-cors")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_fingerprint_endpoints() 