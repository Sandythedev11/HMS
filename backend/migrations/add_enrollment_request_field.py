"""Add is_enrollment_requested field to Student table

This migration adds a new Boolean field to track if a student has submitted
an enrollment request to the hostel administration.
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Add the is_enrollment_requested column to the student table
    op.add_column('student', sa.Column('is_enrollment_requested', sa.Boolean(), nullable=True, default=False))
    
    # Update existing records to set default value
    op.execute("UPDATE student SET is_enrollment_requested = FALSE WHERE is_enrollment_requested IS NULL")
    
    # Make the column non-nullable after setting default values
    op.alter_column('student', 'is_enrollment_requested', nullable=False)


def downgrade():
    # Remove the is_enrollment_requested column
    op.drop_column('student', 'is_enrollment_requested') 