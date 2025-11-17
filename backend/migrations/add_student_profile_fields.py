"""
Migration script to add new fields to Student model
"""
import sys
import os

# Add the parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from app import create_app, db
from app.models import Student

def run_migration():
    """
    Adds contact_number, date_of_birth, semesters_requested and status fields to Student model
    """
    print("Starting migration to add new fields to Student model...")
    app = create_app()
    
    with app.app_context():
        # Check if we need to create the columns
        inspector = db.inspect(db.engine)
        student_columns = [column['name'] for column in inspector.get_columns('student')]
        
        # Create contact_number column if it doesn't exist
        if 'contact_number' not in student_columns:
            print("Adding contact_number column to Student model")
            db.session.execute(text('ALTER TABLE student ADD COLUMN contact_number VARCHAR(20);'))
        else:
            print("contact_number column already exists")
            
        # Create date_of_birth column if it doesn't exist
        if 'date_of_birth' not in student_columns:
            print("Adding date_of_birth column to Student model")
            db.session.execute(text('ALTER TABLE student ADD COLUMN date_of_birth DATE;'))
        else:
            print("date_of_birth column already exists")
            
        # Create semesters_requested column if it doesn't exist
        if 'semesters_requested' not in student_columns:
            print("Adding semesters_requested column to Student model")
            db.session.execute(text('ALTER TABLE student ADD COLUMN semesters_requested INTEGER DEFAULT 1;'))
        else:
            print("semesters_requested column already exists")
            
        # Create status column if it doesn't exist
        if 'status' not in student_columns:
            print("Adding status column to Student model")
            db.session.execute(text("ALTER TABLE student ADD COLUMN status VARCHAR(20) DEFAULT 'active';"))
        else:
            print("status column already exists")
        
        # Commit changes
        db.session.commit()
        print("Migration completed successfully!")

if __name__ == '__main__':
    run_migration() 