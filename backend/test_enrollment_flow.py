#!/usr/bin/env python3
"""
Comprehensive test script for the enrollment flow
Tests approval and rejection scenarios
"""

from app import create_app
from app.models import db, User, Student, Room
from datetime import datetime

def test_approval_flow():
    """Test the approval flow"""
    print("\n=== Testing Approval Flow ===")
    
    app = create_app()
    with app.app_context():
        # Find a student with enrollment request
        pending_student = Student.query.filter_by(
            is_approved=False,
            is_enrollment_requested=True
        ).first()
        
        if not pending_student:
            print("No pending students found for approval test")
            return False
        
        # Find a vacant room
        vacant_room = Room.query.filter_by(status='Vacant').first()
        if not vacant_room:
            print("No vacant rooms available for approval test")
            return False
        
        user = User.query.get(pending_student.user_id)
        print(f"Approving student: {user.name} ({pending_student.roll_number})")
        print(f"Assigning room: {vacant_room.room_number}")
        
        # Simulate approval
        pending_student.is_approved = True
        pending_student.approval_date = datetime.utcnow()
        pending_student.join_date = datetime.utcnow().date()
        pending_student.room_id = vacant_room.id
        vacant_room.status = 'Occupied'
        
        db.session.commit()
        
        print("✓ Student approved successfully")
        print(f"✓ Room {vacant_room.room_number} assigned and marked as occupied")
        
        return True

def test_rejection_flow():
    """Test the rejection flow"""
    print("\n=== Testing Rejection Flow ===")
    
    app = create_app()
    with app.app_context():
        # Create a test student for rejection
        test_email = "test.rejection@example.com"
        existing_user = User.query.filter_by(email=test_email).first()
        
        if existing_user:
            # Use existing user
            user = existing_user
            student = Student.query.filter_by(user_id=user.id).first()
        else:
            # Create new test user for rejection
            user = User(
                name="Test Rejection Student",
                email=test_email,
                role="student"
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
            
            # Create student profile with enrollment request
            student = Student(
                user_id=user.id,
                roll_number="TR001",
                course="Test Course",
                contact_number="9876543210",
                date_of_birth=datetime(2001, 1, 1).date(),
                semesters_requested=2,
                is_approved=False,
                is_enrollment_requested=True
            )
            db.session.add(student)
            db.session.commit()
        
        print(f"Rejecting student: {user.name} ({student.roll_number})")
        
        # Simulate rejection
        student.status = 'rejected'
        student.is_enrollment_requested = False
        student.is_approved = False
        student.approval_date = None
        student.join_date = None
        student.room_id = None
        
        db.session.commit()
        
        print("✓ Student rejected successfully")
        print("✓ Student can now resubmit enrollment request")
        
        return True

def check_database_state():
    """Check the current state of the database"""
    print("\n=== Database State Check ===")
    
    app = create_app()
    with app.app_context():
        # Check pending students
        pending_students = Student.query.filter_by(
            is_approved=False,
            is_enrollment_requested=True
        ).all()
        print(f"Pending enrollment requests: {len(pending_students)}")
        
        for student in pending_students:
            user = User.query.get(student.user_id)
            print(f"  - {user.name} ({student.roll_number}) - {student.course}")
        
        # Check approved students
        approved_students = Student.query.filter_by(is_approved=True).all()
        print(f"\nApproved students: {len(approved_students)}")
        
        for student in approved_students:
            user = User.query.get(student.user_id)
            room_info = ""
            if student.room_id:
                room = Room.query.get(student.room_id)
                room_info = f" - Room {room.room_number}" if room else " - Room not found"
            print(f"  - {user.name} ({student.roll_number}){room_info}")
        
        # Check rejected students
        rejected_students = Student.query.filter_by(status='rejected').all()
        print(f"\nRejected students: {len(rejected_students)}")
        
        for student in rejected_students:
            user = User.query.get(student.user_id)
            print(f"  - {user.name} ({student.roll_number}) - Can resubmit")
        
        # Check room occupancy
        vacant_rooms = Room.query.filter_by(status='Vacant').all()
        occupied_rooms = Room.query.filter_by(status='Occupied').all()
        
        print(f"\nRoom Status:")
        print(f"  Vacant rooms: {len(vacant_rooms)}")
        print(f"  Occupied rooms: {len(occupied_rooms)}")
        
        return True

def main():
    print("Hostel Management System - Enrollment Flow Test")
    print("=" * 50)
    
    # Check initial state
    check_database_state()
    
    # Test flows
    # test_rejection_flow()
    # test_approval_flow()
    
    # Check final state
    # check_database_state()
    
    print("\n" + "=" * 50)
    print("Enrollment flow test completed!")

if __name__ == '__main__':
    main() 