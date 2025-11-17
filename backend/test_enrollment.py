#!/usr/bin/env python3
"""
Test script to verify the enrollment flow
"""

from app import create_app
from app.models import db, User, Student, Room
from datetime import datetime

def main():
    app = create_app()
    with app.app_context():
        print("Testing enrollment flow...")
        
        # Create a test room if none exists
        room = Room.query.first()
        if not room:
            print("Creating test room...")
            room = Room(
                room_number="101",
                room_type="Single",
                status="Vacant"
            )
            db.session.add(room)
            db.session.commit()
            print(f"Created room: {room.room_number}")
        
        # Create a test student user if none exists
        test_email = "test.student@example.com"
        test_user = User.query.filter_by(email=test_email).first()
        
        if not test_user:
            print("Creating test student user...")
            test_user = User(
                name="Test Student",
                email=test_email,
                role="student"
            )
            test_user.set_password("password123")
            db.session.add(test_user)
            db.session.commit()
            
            # Create student profile
            student = Student(
                user_id=test_user.id,
                roll_number="TS001",
                course="Computer Science",
                contact_number="1234567890",
                date_of_birth=datetime(2000, 1, 1).date(),
                semesters_requested=4,
                is_approved=False,
                is_enrollment_requested=True
            )
            db.session.add(student)
            db.session.commit()
            print(f"Created test student: {test_user.name} with enrollment request")
        
        # Check admin user
        admin = User.query.filter_by(role='admin').first()
        if admin:
            print(f"Admin user exists: {admin.email}")
        else:
            print("No admin user found!")
        
        # Check pending students
        pending_students = Student.query.filter_by(
            is_approved=False,
            is_enrollment_requested=True
        ).all()
        print(f"Found {len(pending_students)} pending enrollment requests")
        
        for student in pending_students:
            user = User.query.get(student.user_id)
            print(f"  - {user.name} ({student.roll_number}) - Course: {student.course}")
        
        # Check available rooms
        vacant_rooms = Room.query.filter_by(status='Vacant').all()
        print(f"Found {len(vacant_rooms)} vacant rooms")
        
        for room in vacant_rooms:
            print(f"  - Room {room.room_number} ({room.room_type})")

if __name__ == '__main__':
    main() 