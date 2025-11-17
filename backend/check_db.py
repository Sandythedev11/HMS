from app import create_app
from app.models import db, Student, User
from sqlalchemy import text

def main():
    app = create_app()
    with app.app_context():
        try:
            # Check if the is_enrollment_requested field exists
            students = Student.query.all()
            print(f"Found {len(students)} students in database")
            
            if students:
                print("Sample student data:", students[0].to_dict())
                
            # Check if is_enrollment_requested field exists
            try:
                student_with_enrollment = Student.query.filter_by(is_enrollment_requested=True).all()
                print(f"Students with enrollment requests: {len(student_with_enrollment)}")
                print("Field is_enrollment_requested exists!")
            except Exception as e:
                print(f"Field is_enrollment_requested missing: {e}")
                
            # Check admin user
            admin = User.query.filter_by(role='admin').first()
            if admin:
                print(f"Admin user found: {admin.email}")
            else:
                print("No admin user found")
                
        except Exception as e:
            print(f"Error checking database: {e}")

if __name__ == '__main__':
    main() 