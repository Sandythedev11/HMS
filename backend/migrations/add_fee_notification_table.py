"""
Migration to add FeeNotification table for fee payment notifications

This migration adds:
- FeeNotification table to store notifications about fee payments
"""

from app import db
from app.models import FeeNotification
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def up():
    try:
        # Create the FeeNotification table
        db.create_all(tables=[FeeNotification.__table__])
        
        logger.info("Created FeeNotification table successfully")
        return True
    except Exception as e:
        logger.error(f"Error in migration: {str(e)}")
        return False

def down():
    try:
        # Drop the FeeNotification table
        FeeNotification.__table__.drop(db.engine)
        
        logger.info("Dropped FeeNotification table successfully")
        return True
    except Exception as e:
        logger.error(f"Error in rollback: {str(e)}")
        return False 