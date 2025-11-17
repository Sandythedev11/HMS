#!/usr/bin/env python3

"""
Test script to check PyFingerprint library availability
"""

print("Testing PyFingerprint library import...")

try:
    from pyfingerprint import PyFingerprint
    print("✓ PyFingerprint library imported successfully")
    print(f"PyFingerprint module location: {PyFingerprint.__module__}")
    
    # Try to create an instance (this will fail without hardware, but shows library works)
    try:
        sensor = PyFingerprint()
        print("✓ PyFingerprint instance created (but may not connect without hardware)")
    except Exception as e:
        print(f"! PyFingerprint instance creation failed (expected without hardware): {e}")
        print("This is normal without connected fingerprint hardware")
        
except ImportError as e:
    print(f"✗ PyFingerprint library not available: {e}")
    print("Install with: pip install pyfingerprint")
except Exception as e:
    print(f"✗ Error with PyFingerprint library: {e}")

print("\nTesting complete.") 