import sqlite3
import os
from datetime import datetime

def run_migration():
    """
    Recreate the feedback table with the correct schema:
    - Keep id, user_id, created_at
    - Make content required (NOT NULL)
    - Add is_read column
    - Make rating and comment nullable
    """
    print("Running migration: Recreate feedback table with correct schema")
    
    # Get the database file path - assumes it's in the instance folder
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'hostel.db')
    print(f"Looking for database at: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
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
        
        # Get current data
        cursor.execute("SELECT * FROM feedback")
        rows = cursor.fetchall()
        
        # Get column names to understand the table structure
        cursor.execute("PRAGMA table_info(feedback)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        print(f"Current feedback table columns: {column_names}")
        
        # Create a temporary table with the new schema
        print("Creating temporary table with new schema...")
        cursor.execute("""
        CREATE TABLE feedback_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rating INTEGER,
            comment TEXT,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL,
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES user(id)
        )
        """)
        
        # Migrate data from old to new table
        print("Migrating data to new table...")
        
        # We need to determine the column indexes
        id_idx = column_names.index('id')
        user_id_idx = column_names.index('user_id')
        created_at_idx = column_names.index('created_at')
        
        # Check if other columns exist
        rating_idx = column_names.index('rating') if 'rating' in column_names else -1
        comment_idx = column_names.index('comment') if 'comment' in column_names else -1
        content_idx = column_names.index('content') if 'content' in column_names else -1
        is_read_idx = column_names.index('is_read') if 'is_read' in column_names else -1
        
        # Insert data into new table
        for row in rows:
            # Prepare the content field
            content = row[content_idx] if content_idx >= 0 and row[content_idx] else (
                row[comment_idx] if comment_idx >= 0 and row[comment_idx] else 
                f"Rating: {row[rating_idx]}" if rating_idx >= 0 else "No content"
            )
            
            # Insert data with new schema
            cursor.execute("""
            INSERT INTO feedback_new (id, rating, comment, user_id, created_at, content, is_read)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                row[id_idx],
                row[rating_idx] if rating_idx >= 0 else None,
                row[comment_idx] if comment_idx >= 0 else None,
                row[user_id_idx],
                row[created_at_idx],
                content,
                row[is_read_idx] if is_read_idx >= 0 else 0
            ))
        
        # Drop the old table and rename the new one
        print("Replacing old table with new table...")
        cursor.execute("DROP TABLE feedback")
        cursor.execute("ALTER TABLE feedback_new RENAME TO feedback")
        
        # Commit the changes
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