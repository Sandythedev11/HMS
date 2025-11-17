#!/usr/bin/env python3

"""
Test script for fingerprint hardware detection
"""

from app.fingerprint_service import fingerprint_service, PYFINGERPRINT_AVAILABLE

def main():
    print("FINGERPRINT HARDWARE DETECTION TEST")
    print("=" * 50)
    
    # Test PyFingerprint library
    if PYFINGERPRINT_AVAILABLE:
        print("✓ PyFingerprint library is available")
    else:
        print("✗ PyFingerprint library is NOT available")
        print("  Install with: pip install pyfingerprint")
        return
    
    # Test port detection
    available_ports = fingerprint_service.get_available_ports()
    print(f"Detected {len(available_ports)} COM ports: {available_ports}")
    
    # Test initialization
    success, message = fingerprint_service.initialize_sensor()
    if success:
        print(f"✓ Initialization successful: {message}")
        sensor_info = fingerprint_service.get_sensor_info()
        print(f"✓ Sensor Info: {sensor_info}")
    else:
        print(f"✗ Initialization failed: {message}")

if __name__ == "__main__":
    main() 