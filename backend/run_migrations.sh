#!/bin/bash

# Hostel Management System - Database Migration Script
echo "Starting database migration for HMS..."

# Set the Flask app
export FLASK_APP=app.py

# Change to the backend directory if not already there
cd "$(dirname "$0")"

echo "Current directory: $(pwd)"

# Add the enrollment request field to Student table
echo "Adding is_enrollment_requested field to Student table..."
python3 -c "
from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Check if column exists
        result = db.engine.execute(text('PRAGMA table_info(student);'))
        columns = [row[1] for row in result]
        
        if 'is_enrollment_requested' not in columns:
            print('Adding is_enrollment_requested column...')
            db.engine.execute(text('ALTER TABLE student ADD COLUMN is_enrollment_requested BOOLEAN DEFAULT FALSE'))
            db.engine.execute(text('UPDATE student SET is_enrollment_requested = FALSE WHERE is_enrollment_requested IS NULL'))
            print('Successfully added is_enrollment_requested field')
        else:
            print('is_enrollment_requested column already exists')
            
        db.session.commit()
        print('Migration completed successfully!')
    except Exception as e:
        print(f'Migration failed: {e}')
        db.session.rollback()
"

echo "Migration script completed." 