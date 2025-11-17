#!/usr/bin/env python3

"""
Script to detect and test fingerprint sensor on available COM ports
This helps identify which port the fingerprint device is connected to.
"""

import serial.tools.list_ports
import time

def list_available_ports():
    """List all available COM ports on the system"""
    print("Scanning for available COM ports...")
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("No COM ports found!")
        return []
    
    available_ports = []
    for port in ports:
        print(f"Found: {port.device} - {port.description}")
        if 'USB' in port.description.upper() or 'SERIAL' in port.description.upper():
            print(f"  -> Likely USB/Serial device: {port.device}")
            available_ports.append(port.device)
        available_ports.append(port.device)
    
    return available_ports

def test_fingerprint_on_port(port, baudrate=57600):
    """Test if a fingerprint sensor is on the given port"""
    try:
        print(f"\nTesting fingerprint sensor on {port}...")
        
        # Try importing PyFingerprint
        try:
            from pyfingerprint.pyfingerprint import PyFingerprint
        except ImportError:
            try:
                from pyfingerprint import PyFingerprint
            except ImportError:
                print("PyFingerprint library not available")
                return False
        
        # Try to connect
        sensor = PyFingerprint(port, baudrate, 0xFFFFFFFF, 0x00000000)
        
        # Test password verification
        if sensor.verifyPassword():
            print(f"✓ Fingerprint sensor found on {port}!")
            print(f"  Templates: {sensor.getTemplateCount()}/{sensor.getStorageCapacity()}")
            return True
        else:
            print(f"✗ Device on {port} doesn't respond to fingerprint commands")
            return False
            
    except Exception as e:
        print(f"✗ Error testing {port}: {str(e)}")
        return False

def main():
    print("Fingerprint Device Detection Tool")
    print("=" * 40)
    
    # List available ports
    available_ports = list_available_ports()
    
    if not available_ports:
        print("\nNo COM ports available. Please check:")
        print("- Fingerprint device is connected")
        print("- Device drivers are installed")
        print("- Device is recognized by Windows")
        return
    
    print(f"\nTesting {len(available_ports)} ports for fingerprint sensors...")
    
    found_sensors = []
    
    # Test each port
    for port in available_ports:
        if test_fingerprint_on_port(port):
            found_sensors.append(port)
    
    print("\n" + "=" * 40)
    print("RESULTS:")
    
    if found_sensors:
        print(f"✓ Found {len(found_sensors)} fingerprint sensor(s):")
        for port in found_sensors:
            print(f"  - {port}")
        print(f"\nRecommendation: Use {found_sensors[0]} in your configuration")
    else:
        print("✗ No fingerprint sensors detected")
        print("\nTroubleshooting:")
        print("1. Check if device is properly connected")
        print("2. Verify device drivers are installed")
        print("3. Try different USB ports")
        print("4. Check Device Manager for COM port assignments")
        print("5. Try different baudrates (9600, 57600, 115200)")

if __name__ == "__main__":
    main() 