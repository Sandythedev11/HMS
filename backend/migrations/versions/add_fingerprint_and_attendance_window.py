"""add fingerprint data and attendance window tables

Revision ID: a2f5b8c1d3e4
Revises: 
Create Date: 2023-07-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a2f5b8c1d3e4'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add timestamp column to Attendance table
    op.add_column('attendance', sa.Column('timestamp', sa.DateTime(), nullable=True))
    
    # Create FingerprintData table
    op.create_table('fingerprint_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('fingerprint_data', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['student.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create AttendanceWindow table
    op.create_table('attendance_window',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('is_open', sa.Boolean(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('opened_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['opened_by'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('attendance_window')
    op.drop_table('fingerprint_data')
    op.drop_column('attendance', 'timestamp') 