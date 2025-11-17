#!/usr/bin/env python3

"""
Database Migration Script for HMS Leave Request Feature

This script adds the LeaveRequest table to the existing database.
"""

from app import create_app
from app.models import db
from sqlalchemy import text

def migrate_leave_request_table():
    """Add LeaveRequest table to the database"""
    app = create_app()
    with app.app_context():
        try:
            print("Starting Leave Request table migration...")
            
            # Check if table already exists
            with db.engine.connect() as connection:
                result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='leave_request';"))
                existing_table = result.fetchone()
            
            if existing_table:
                print("LeaveRequest table already exists")
                return
            
            # Create all tables (this will create the new LeaveRequest table)
            db.create_all()
            
            print("✓ LeaveRequest table created successfully")
            print("Migration completed!")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    migrate_leave_request_table() 