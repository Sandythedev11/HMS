#!/usr/bin/env python3

"""
Database Migration Script for HMS Biometric Fingerprint Feature

This script updates the FingerprintData table to support both thumb fingerprints.
"""

from app import create_app
from app.models import db
from sqlalchemy import text

def migrate_fingerprint_table():
    """Update FingerprintData table to support both thumbs"""
    app = create_app()
    with app.app_context():
        try:
            print("Starting Fingerprint table migration...")
            
            # Check current table structure
            with db.engine.connect() as connection:
                result = connection.execute(text("PRAGMA table_info(fingerprint_data);"))
                columns = result.fetchall()
                column_names = [col[1] for col in columns]
                print(f"Current columns: {column_names}")
            
            # Check if we need to migrate from old structure
            if 'fingerprint_data' in column_names and 'right_thumb_template' not in column_names:
                print("Migrating from old fingerprint_data structure...")
                
                # Create new table structure
                with db.engine.connect() as connection:
                    # Rename old table
                    connection.execute(text("ALTER TABLE fingerprint_data RENAME TO fingerprint_data_old;"))
                    connection.commit()
                
                # Create new table with updated structure
                db.create_all()
                
                # Migrate existing data
                with db.engine.connect() as connection:
                    # Copy data from old table to new table
                    migration_query = text("""
                        INSERT INTO fingerprint_data 
                        (id, student_id, right_thumb_template, created_at, last_updated)
                        SELECT id, student_id, fingerprint_data, created_at, last_updated
                        FROM fingerprint_data_old;
                    """)
                    connection.execute(migration_query)
                    connection.commit()
                    
                    # Count migrated records
                    count_result = connection.execute(text("SELECT COUNT(*) FROM fingerprint_data;"))
                    migrated_count = count_result.fetchone()[0]
                    
                    print(f"✓ Migrated {migrated_count} fingerprint records")
                    
                    # Drop old table
                    connection.execute(text("DROP TABLE fingerprint_data_old;"))
                    connection.commit()
                    print("✓ Removed old table structure")
                
            elif 'right_thumb_template' in column_names:
                print("✓ Table already has new structure")
                
            else:
                # Fresh installation
                print("Creating new fingerprint table...")
                db.create_all()
                print("✓ New fingerprint table created")
            
            print("Fingerprint table migration completed successfully!")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    migrate_fingerprint_table() 