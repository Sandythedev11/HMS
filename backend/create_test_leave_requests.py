#!/usr/bin/env python3

"""
Create Test Leave Request Data

This script creates test leave requests for approved students to test the admin leave management functionality.
"""

from app import create_app
from app.models import db, Student, LeaveRequest, User
from datetime import datetime, date, timedelta

def create_test_leave_requests():
    """Create test leave requests for approved students"""
    app = create_app()
    with app.app_context():
        try:
            print("Creating test leave requests...")
            
            # Get approved students
            approved_students = Student.query.filter_by(is_approved=True).all()
            
            if not approved_students:
                print("No approved students found. Please create approved students first.")
                return
                
            for i, student in enumerate(approved_students[:3]):  # Create for first 3 students
                user = User.query.get(student.user_id)
                
                # Create multiple leave requests for each student
                requests = [
                    {
                        'start_date': date.today() + timedelta(days=7),
                        'end_date': date.today() + timedelta(days=9),
                        'reason': 'Family wedding ceremony',
                        'status': 'Pending'
                    },
                    {
                        'start_date': date.today() + timedelta(days=20),
                        'end_date': date.today() + timedelta(days=22),
                        'reason': 'Medical appointment and follow-up',
                        'status': 'Pending'
                    },
                    {
                        'start_date': date.today() - timedelta(days=10),
                        'end_date': date.today() - timedelta(days=8),
                        'reason': 'Personal emergency',
                        'status': 'Granted',
                        'processed_at': datetime.utcnow() - timedelta(days=12),
                        'processed_by': 1  # Assuming admin user with ID 1
                    },
                    {
                        'start_date': date.today() - timedelta(days=30),
                        'end_date': date.today() - timedelta(days=28),
                        'reason': 'Vacation with friends',
                        'status': 'Denied',
                        'processed_at': datetime.utcnow() - timedelta(days=35),
                        'processed_by': 1,
                        'admin_response': 'Leave conflicts with important academic schedule. Please reschedule for a more appropriate time.'
                    }
                ]
                
                for req_data in requests:
                    # Check if this request already exists
                    existing = LeaveRequest.query.filter_by(
                        student_id=student.id,
                        start_date=req_data['start_date'],
                        end_date=req_data['end_date']
                    ).first()
                    
                    if not existing:
                        leave_request = LeaveRequest(
                            student_id=student.id,
                            start_date=req_data['start_date'],
                            end_date=req_data['end_date'],
                            reason=req_data['reason'],
                            status=req_data['status'],
                            processed_at=req_data.get('processed_at'),
                            processed_by=req_data.get('processed_by'),
                            admin_response=req_data.get('admin_response')
                        )
                        db.session.add(leave_request)
                        print(f"✓ Created leave request for {user.name}: {req_data['reason']} ({req_data['status']})")
                    else:
                        print(f"  Leave request already exists for {user.name}: {req_data['reason']}")
            
            db.session.commit()
            print("\n✓ Test leave requests created successfully!")
            
            # Print summary
            total_requests = LeaveRequest.query.count()
            pending_requests = LeaveRequest.query.filter_by(status='Pending').count()
            granted_requests = LeaveRequest.query.filter_by(status='Granted').count()
            denied_requests = LeaveRequest.query.filter_by(status='Denied').count()
            
            print(f"\nSummary:")
            print(f"Total Leave Requests: {total_requests}")
            print(f"Pending: {pending_requests}")
            print(f"Granted: {granted_requests}")
            print(f"Denied: {denied_requests}")
            
        except Exception as e:
            print(f"Error creating test leave requests: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    create_test_leave_requests() 