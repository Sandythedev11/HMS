#!/usr/bin/env python3
"""
Migration script to add notification tracking tables
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app, db
from app.models import NotificationState, ComplaintNotification, NoticeNotification

def create_notification_tables():
    """Create notification tracking tables"""
    app = create_app()
    
    with app.app_context():
        try:
            print("Creating notification tracking tables...")
            
            # Create tables
            db.create_all()
            
            print("✓ Successfully created notification tracking tables")
            print("  - NotificationState")
            print("  - ComplaintNotification") 
            print("  - NoticeNotification")
            
            return True
            
        except Exception as e:
            print(f"✗ Error creating notification tables: {str(e)}")
            return False

if __name__ == '__main__':
    success = create_notification_tables()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        sys.exit(1) 