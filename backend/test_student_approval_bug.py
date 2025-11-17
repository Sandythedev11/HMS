#!/usr/bin/env python3
"""
Test script to verify the student approval bug fix
This demonstrates the correct logic flow for approved students
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_approved_student_logic():
    """Test the logic flow for approved students"""
    print("\n=== Testing Approved Student Logic ===")
    
    # Mock student data representing different scenarios
    test_scenarios = [
        {
            "name": "New Student (not approved, no enrollment request)",
            "is_approved": False,
            "is_enrollment_requested": False,
            "expected_view": "Profile Setup Form"
        },
        {
            "name": "Student with pending enrollment request",
            "is_approved": False,
            "is_enrollment_requested": True,
            "expected_view": "Waiting for Approval"
        },
        {
            "name": "APPROVED Student (with enrollment request) - THIS IS THE BUG",
            "is_approved": True,
            "is_enrollment_requested": True,
            "expected_view": "Full Dashboard",
            "current_incorrect_view": "Enrollment Request Pending"
        },
        {
            "name": "APPROVED Student (completed profile)",
            "is_approved": True,
            "is_enrollment_requested": True,
            "course": "Computer Science",
            "contact_number": "1234567890",
            "date_of_birth": "2000-01-01",
            "expected_view": "Full Dashboard"
        }
    ]
    
    print("Testing conditional logic for different student states:")
    print("=" * 60)
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n{i}. {scenario['name']}")
        print(f"   is_approved: {scenario['is_approved']}")
        print(f"   is_enrollment_requested: {scenario['is_enrollment_requested']}")
        
        # Apply the CURRENT (buggy) logic
        if not scenario['is_approved']:
            if scenario.get('status') == 'rejected':
                current_view = "Rejection Message"
            elif scenario['is_enrollment_requested'] and not scenario['is_approved']:
                current_view = "Waiting for Approval"
            else:
                current_view = "Profile Setup Form"
        elif scenario['is_approved'] and scenario['is_enrollment_requested']:
            # THIS IS THE BUG - showing pending for approved students!
            current_view = "Enrollment Request Pending"
        else:
            current_view = "Full Dashboard"
        
        # Apply the FIXED logic
        if not scenario['is_approved']:
            if scenario.get('status') == 'rejected':
                fixed_view = "Rejection Message"
            elif scenario['is_enrollment_requested'] and not scenario['is_approved']:
                fixed_view = "Waiting for Approval"
            else:
                fixed_view = "Profile Setup Form"
        else:
            # FIXED: If approved, always show full dashboard
            fixed_view = "Full Dashboard"
        
        print(f"   Current (buggy) view: {current_view}")
        print(f"   Fixed view: {fixed_view}")
        print(f"   Expected view: {scenario['expected_view']}")
        
        if current_view == scenario['expected_view']:
            print("   ✅ Current logic is CORRECT")
        else:
            print("   ❌ Current logic is WRONG")
            
        if fixed_view == scenario['expected_view']:
            print("   ✅ Fixed logic is CORRECT")
        else:
            print("   ❌ Fixed logic is WRONG")
    
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print("The bug is in the frontend StudentDashboard.tsx around line 1523:")
    print("```")
    print("// BUGGY CODE:")
    print("if (student.is_approved && student.is_enrollment_requested) {")
    print("  return <EnrollmentRequestPending />; // WRONG!")
    print("}")
    print("```")
    print()
    print("This condition incorrectly shows pending message for approved students!")
    print("The fix is to REMOVE this entire section so approved students")
    print("proceed directly to the full dashboard.")

def test_backend_approval_endpoint():
    """Test that the backend approval endpoint works correctly"""
    print("\n=== Testing Backend Approval Endpoint ===")
    
    try:
        # Login as admin
        admin_login = {
            "email": "sandeepgouda209@gmail.com",
            "password": "Admin@123"
        }
        
        response = requests.post(f"{BASE_URL}/login", json=admin_login)
        if response.status_code != 200:
            print(f"❌ Admin login failed: {response.status_code}")
            return False
        
        admin_data = response.json()
        admin_token = admin_data['token']
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Check pending students
        response = requests.get(f"{BASE_URL}/admin/students/pending", headers=headers)
        if response.status_code == 200:
            pending_students = response.json()
            print(f"✅ Found {len(pending_students)} pending students")
            
            # Check approved students
            response = requests.get(f"{BASE_URL}/admin/students/approved", headers=headers)
            if response.status_code == 200:
                approved_students = response.json()
                print(f"✅ Found {len(approved_students)} approved students")
                
                # Check the structure of approved students
                if approved_students:
                    sample_student = approved_students[0]
                    print(f"✅ Sample approved student data:")
                    print(f"   ID: {sample_student.get('id')}")
                    print(f"   Name: {sample_student.get('name')}")
                    print(f"   is_approved: {sample_student.get('is_approved')}")
                    print(f"   is_enrollment_requested: {sample_student.get('is_enrollment_requested')}")
                    print(f"   Room: {sample_student.get('room_number', 'Not assigned')}")
                    
                    if sample_student.get('is_approved'):
                        print("✅ Backend correctly sets is_approved=True for approved students")
                        print("✅ Frontend should show FULL DASHBOARD for this student")
                    else:
                        print("❌ Backend issue: is_approved should be True for approved students")
                
                return True
            else:
                print(f"❌ Failed to get approved students: {response.status_code}")
        else:
            print(f"❌ Failed to get pending students: {response.status_code}")
        
        return False
        
    except Exception as e:
        print(f"❌ Error testing backend: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("STUDENT APPROVAL BUG ANALYSIS & FIX VERIFICATION")
    print("=" * 60)
    
    # Test the logic scenarios
    test_approved_student_logic()
    
    # Test the backend
    backend_test = test_backend_approval_endpoint()
    
    print("\n" + "=" * 60)
    print("CONCLUSION:")
    print("=" * 60)
    if backend_test:
        print("✅ Backend approval logic is working correctly")
        print("❌ Frontend has the bug in StudentDashboard.tsx")
        print("\nFIX REQUIRED:")
        print("Remove the problematic condition in frontend/src/pages/StudentDashboard.tsx:")
        print("Lines around 1523-1593 that show pending message for approved students")
        print("\nOnce fixed, approved students will see the full dashboard immediately!")
    else:
        print("❌ Backend issues detected - check server and database")

if __name__ == "__main__":
    main() 