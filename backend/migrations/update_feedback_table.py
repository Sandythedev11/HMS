import sqlite3
import os
from datetime import datetime

def run_migration():
    """
    Update the feedback table to ensure rating column exists with proper constraints:
    - Add 'content' column if not exists
    - Add 'is_read' column if not exists
    - Make sure 'rating' column exists and has NOT NULL constraint with default 5
    """
    print("Running migration: Update feedback table structure")
    
    # Get the database file path - assumes it's in the instance folder
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'hostel.db')
    print(f"Looking for database at: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        # Try alternate locations
        alt_paths = [
            os.path.join(os.path.dirname(os.path.dirname(__file__)), 'hostel.db'),
            os.path.join(os.path.dirname(__file__), 'hostel.db'),
            './hostel.db',
            '../instance/hostel.db'
        ]
        
        for alt_path in alt_paths:
            print(f"Checking alternative path: {alt_path}")
            if os.path.exists(alt_path):
                db_path = alt_path
                print(f"Found database at: {db_path}")
                break
        else:
            print("Database not found in any expected location")
            return
    
    conn = None
    try:
        # Connect to the database
        print(f"Connecting to database: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the feedback table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'")
        if not cursor.fetchone():
            print("Feedback table not found in the database")
            conn.close()
            return
        
        # Check current table structure
        cursor.execute("PRAGMA table_info(feedback)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        print(f"Current feedback table columns: {column_names}")
        
        # Create a temporary table with the correct schema
        print("Creating a temporary table with the correct schema...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            rating INTEGER NOT NULL DEFAULT 5,
            FOREIGN KEY (user_id) REFERENCES user(id)
        )
        """)
        
        # Migrate data from the original table to the new one
        print("Migrating data to the new table...")
        
        # Determine if the rating column exists
        has_rating = 'rating' in column_names
        
        # Copy data with appropriate SQL based on column existence
        if has_rating:
            cursor.execute("""
            INSERT INTO feedback_new (id, user_id, content, created_at, is_read, rating)
            SELECT id, user_id, 
                   CASE WHEN content IS NULL OR content = '' 
                        THEN COALESCE(comment, 'No content provided') 
                        ELSE content END,
                   created_at, 
                   COALESCE(is_read, 0),
                   COALESCE(rating, 5)
            FROM feedback
            """)
        else:
            cursor.execute("""
            INSERT INTO feedback_new (id, user_id, content, created_at, is_read, rating)
            SELECT id, user_id, 
                   CASE WHEN content IS NULL OR content = '' 
                        THEN COALESCE(comment, 'No content provided') 
                        ELSE content END,
                   created_at, 
                   COALESCE(is_read, 0),
                   5
            FROM feedback
            """)
        
        # Replace the original table with the new one
        print("Replacing the original table with the new one...")
        cursor.execute("DROP TABLE feedback")
        cursor.execute("ALTER TABLE feedback_new RENAME TO feedback")
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
    print("Migration script finished") 