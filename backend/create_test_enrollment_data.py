#!/usr/bin/env python3
"""
Script to create test data for enrollment flow testing
"""

from app import create_app
from app.models import db, User, Student, Room
from datetime import datetime

def create_test_rooms():
    """Create test rooms for assignment"""
    app = create_app()
    with app.app_context():
        rooms_data = [
            ("101", "Single"),
            ("102", "Double"),
            ("103", "Triple"),
            ("201", "Single"),
            ("202", "Double"),
        ]
        
        for room_number, room_type in rooms_data:
            existing_room = Room.query.filter_by(room_number=room_number).first()
            if not existing_room:
                room = Room(room_number=room_number, room_type=room_type, status='Vacant')
                db.session.add(room)
                print(f"Created room: {room_number} ({room_type})")
        
        db.session.commit()
        print("✓ Test rooms created")

def create_pending_student():
    """Create a student with pending enrollment request"""
    app = create_app()
    with app.app_context():
        test_email = "pending.student@test.com"
        existing_user = User.query.filter_by(email=test_email).first()
        
        if existing_user:
            student = Student.query.filter_by(user_id=existing_user.id).first()
            # Update to pending state
            student.is_approved = False
            student.is_enrollment_requested = True
            student.status = 'active'
            student.course = 'Computer Science'
            student.contact_number = '9876543210'
            student.date_of_birth = datetime(2001, 5, 15).date()
            student.semesters_requested = 4
            db.session.commit()
            print(f"Updated existing student to pending: {existing_user.name}")
        else:
            # Create new pending student
            user = User(
                name="Pending Test Student",
                email=test_email,
                role="student"
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
            
            student = Student(
                user_id=user.id,
                roll_number=f"HMS{user.id:04d}",
                course="Computer Science",
                contact_number="9876543210",
                date_of_birth=datetime(2001, 5, 15).date(),
                semesters_requested=4,
                is_approved=False,
                is_enrollment_requested=True,
                status='active'
            )
            db.session.add(student)
            db.session.commit()
            print(f"Created pending student: {user.name} - {test_email}")
        
        print("✓ Pending student ready for testing")

def create_rejected_student():
    """Create a student with rejected status"""
    app = create_app()
    with app.app_context():
        test_email = "rejected.student@test.com"
        existing_user = User.query.filter_by(email=test_email).first()
        
        if existing_user:
            student = Student.query.filter_by(user_id=existing_user.id).first()
            # Update to rejected state
            student.status = 'rejected'
            student.is_enrollment_requested = False
            student.is_approved = False
            student.approval_date = None
            student.join_date = None
            student.room_id = None
            db.session.commit()
            print(f"Updated existing student to rejected: {existing_user.name}")
        else:
            # Create new rejected student
            user = User(
                name="Rejected Test Student",
                email=test_email,
                role="student"
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
            
            student = Student(
                user_id=user.id,
                roll_number=f"HMS{user.id:04d}",
                is_approved=False,
                is_enrollment_requested=False,
                status='rejected'
            )
            db.session.add(student)
            db.session.commit()
            print(f"Created rejected student: {user.name} - {test_email}")
        
        print("✓ Rejected student ready for testing")

def create_approved_student():
    """Create a fully approved student with room assignment"""
    app = create_app()
    with app.app_context():
        test_email = "approved.student@test.com"
        existing_user = User.query.filter_by(email=test_email).first()
        
        # Find a vacant room
        vacant_room = Room.query.filter_by(status='Vacant').first()
        if not vacant_room:
            print("No vacant rooms available for approved student")
            return
        
        if existing_user:
            student = Student.query.filter_by(user_id=existing_user.id).first()
            # Update to approved state
            student.is_approved = True
            student.is_enrollment_requested = True
            student.status = 'active'
            student.approval_date = datetime.utcnow()
            student.join_date = datetime.utcnow().date()
            student.room_id = vacant_room.id
            student.course = 'Information Technology'
            student.contact_number = '9876543211'
            student.date_of_birth = datetime(2000, 8, 20).date()
            student.semesters_requested = 6
            
            # Mark room as occupied
            vacant_room.status = 'Occupied'
            
            db.session.commit()
            print(f"Updated existing student to approved: {existing_user.name} - Room {vacant_room.room_number}")
        else:
            # Create new approved student
            user = User(
                name="Approved Test Student",
                email=test_email,
                role="student"
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
            
            student = Student(
                user_id=user.id,
                roll_number=f"HMS{user.id:04d}",
                course="Information Technology",
                contact_number="9876543211",
                date_of_birth=datetime(2000, 8, 20).date(),
                semesters_requested=6,
                is_approved=True,
                is_enrollment_requested=True,
                status='active',
                approval_date=datetime.utcnow(),
                join_date=datetime.utcnow().date(),
                room_id=vacant_room.id
            )
            db.session.add(student)
            
            # Mark room as occupied
            vacant_room.status = 'Occupied'
            
            db.session.commit()
            print(f"Created approved student: {user.name} - {test_email} - Room {vacant_room.room_number}")
        
        print("✓ Approved student ready for testing")

def main():
    print("Creating test data for enrollment flow testing...")
    print("=" * 50)
    
    create_test_rooms()
    create_pending_student()
    create_rejected_student()
    create_approved_student()
    
    print("\n" + "=" * 50)
    print("Test data creation completed!")
    print("\nTest accounts created:")
    print("1. Admin: sandeepgouda209@gmail.com / Admin@123")
    print("2. Pending Student: pending.student@test.com / password123")
    print("3. Rejected Student: rejected.student@test.com / password123")
    print("4. Approved Student: approved.student@test.com / password123")

if __name__ == '__main__':
    main() 