from app import db
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import random
import string

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='student')  # student, admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    complaints = db.relationship('Complaint', backref='author', lazy='dynamic')
    feedbacks = db.relationship('Feedback', backref='author', lazy='dynamic')
    
    def set_password(self, password):
        """Set the password hash for the user"""
        if not password:
            raise ValueError("Password cannot be empty")
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        """Check if the provided password matches the stored hash"""
        if not password or not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role
        }

class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_number = db.Column(db.String(20), unique=True, nullable=False)
    room_type = db.Column(db.String(20), nullable=False)  # Single, Double, Triple
    status = db.Column(db.String(20), default='Vacant')  # Vacant, Occupied
    students = db.relationship('Student', backref='room', lazy='dynamic')
    
    def get_occupancy(self):
        """Get current number of students in this room"""
        return self.students.filter_by(is_approved=True, status='active').count()
    
    def get_capacity(self):
        """Get maximum capacity of this room (default is 4)"""
        return 4  # Standard capacity for all rooms
    
    def is_full(self):
        """Check if room is at full capacity"""
        return self.get_occupancy() >= self.get_capacity()
    
    def to_dict(self):
        occupancy = self.get_occupancy()
        capacity = self.get_capacity()
        return {
            'id': self.id,
            'room_number': self.room_number,
            'room_type': self.room_type,
            'status': self.status,
            'occupied': occupancy,
            'capacity': capacity,
            'is_full': self.is_full()
        }

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=True)
    roll_number = db.Column(db.String(20), unique=True, nullable=False)
    
    # New profile fields
    profile_picture = db.Column(db.String(255), nullable=True)  # URL to profile picture
    course = db.Column(db.String(100), nullable=True)
    join_date = db.Column(db.Date, nullable=True)
    is_approved = db.Column(db.Boolean, default=False)
    approval_date = db.Column(db.DateTime, nullable=True)
    
    # Additional student profile fields
    contact_number = db.Column(db.String(20), nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    semesters_requested = db.Column(db.Integer, nullable=True, default=1)
    status = db.Column(db.String(20), default='active', nullable=True)
    is_enrollment_requested = db.Column(db.Boolean, default=False)  # Track if student has requested enrollment
    
    attendance = db.relationship('Attendance', backref='student', lazy='dynamic')
    fees = db.relationship('Fee', backref='student', lazy='dynamic')
    fee_notifications = db.relationship('FeeNotification', backref='student', lazy='dynamic')
    fingerprint = db.relationship('FingerprintData', backref='student', uselist=False)
    leave_requests = db.relationship('LeaveRequest', backref='student', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'room_id': self.room_id,
            'roll_number': self.roll_number,
            'profile_picture': self.profile_picture,
            'course': self.course,
            'join_date': self.join_date.strftime('%Y-%m-%d') if self.join_date else None,
            'is_approved': self.is_approved,
            'approval_date': self.approval_date.strftime('%Y-%m-%d %H:%M:%S') if self.approval_date else None,
            'contact_number': self.contact_number,
            'date_of_birth': self.date_of_birth.strftime('%Y-%m-%d') if self.date_of_birth else None,
            'semesters_requested': self.semesters_requested,
            'status': self.status,
            'is_enrollment_requested': self.is_enrollment_requested,
            'has_fingerprint': self.fingerprint is not None
        }

class Complaint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='Pending')  # Pending, Resolved
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    replies = db.relationship('ComplaintReply', backref='complaint', lazy='dynamic', cascade="all, delete-orphan")
    
    def to_dict(self):
        # Get student profile information
        student = Student.query.filter_by(user_id=self.user_id).first()
        user = User.query.get(self.user_id)
        
        return {
            'id': self.id,
            'subject': self.subject,
            'details': self.details,
            'status': self.status,
            'user_id': self.user_id,
            'student_id': self.user_id,
            'student_name': user.name if user else "Unknown",
            'student_profile_picture': student.profile_picture if student else None,
            'student_roll_number': student.roll_number if student else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'replies': [reply.to_dict() for reply in self.replies.order_by(ComplaintReply.created_at.asc())]
        }

class ComplaintReply(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaint.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        user = User.query.get(self.user_id)
        student = Student.query.filter_by(user_id=self.user_id).first() if not self.is_admin else None
        
        return {
            'id': self.id,
            'complaint_id': self.complaint_id,
            'user_id': self.user_id,
            'user_name': user.name if user else "Unknown",
            'user_profile_picture': student.profile_picture if student else None,
            'content': self.content,
            'is_admin': self.is_admin,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)
    rating = db.Column(db.Integer, nullable=False, default=5)
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'is_read': self.is_read,
            'rating': self.rating
        }

class Fee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    description = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Pending')  # Pending, Paid
    due_date = db.Column(db.DateTime, nullable=True)
    payment_date = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'description': self.description,
            'amount': self.amount,
            'status': self.status,
            'due_date': self.due_date.strftime('%Y-%m-%d') if self.due_date else None,
            'payment_date': self.payment_date.strftime('%Y-%m-%d') if self.payment_date else None
        }

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # Present, Absent
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'date': self.date.strftime('%Y-%m-%d'),
            'status': self.status,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else None
        }

class Notice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class FeeNotification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), default='fee_payment')
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'title': self.title,
            'content': self.content,
            'notification_type': self.notification_type,
            'is_read': self.is_read,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class OTP(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    
    @staticmethod
    def generate_otp():
        """Generate a 6-digit OTP code"""
        return ''.join(random.choices(string.digits, k=6))
    
    @staticmethod
    def create_otp_for_email(email):
        """Create a new OTP for the given email"""
        # First, invalidate any existing OTPs for this email
        existing_otps = OTP.query.filter_by(email=email, is_verified=False).all()
        for otp in existing_otps:
            db.session.delete(otp)
        
        # Create a new OTP
        otp_code = OTP.generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)  # OTP expires in 10 minutes
        
        new_otp = OTP(
            email=email,
            otp_code=otp_code,
            expires_at=expires_at
        )
        
        db.session.add(new_otp)
        db.session.commit()
        
        return otp_code
    
    @staticmethod
    def verify_otp(email, otp_code):
        """Verify an OTP code for the given email"""
        otp = OTP.query.filter_by(
            email=email,
            otp_code=otp_code,
            is_verified=False
        ).first()
        
        if not otp:
            return False
        
        if otp.expires_at < datetime.utcnow():
            return False
        
        # Mark the OTP as verified
        otp.is_verified = True
        db.session.commit()
        
        return True

class FingerprintData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    right_thumb_template = db.Column(db.Text, nullable=True)  # Store right thumb fingerprint template
    left_thumb_template = db.Column(db.Text, nullable=True)   # Store left thumb fingerprint template
    device_id = db.Column(db.String(50), nullable=True)  # Track which device was used
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'has_fingerprint': (self.right_thumb_template is not None or self.left_thumb_template is not None),
            'has_right_thumb': self.right_thumb_template is not None,
            'has_left_thumb': self.left_thumb_template is not None,
            'device_id': self.device_id,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'last_updated': self.last_updated.strftime('%Y-%m-%d %H:%M:%S')
        }

class AttendanceWindow(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    is_open = db.Column(db.Boolean, default=False)
    opened_at = db.Column(db.DateTime, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)
    opened_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'is_open': self.is_open,
            'opened_at': self.opened_at.strftime('%Y-%m-%d %H:%M:%S') if self.opened_at else None,
            'closed_at': self.closed_at.strftime('%Y-%m-%d %H:%M:%S') if self.closed_at else None
        }

class LeaveRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='Pending')  # Pending, Granted, Denied
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    admin_response = db.Column(db.Text, nullable=True)  # For denial reasons or additional notes
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'start_date': self.start_date.strftime('%Y-%m-%d'),
            'end_date': self.end_date.strftime('%Y-%m-%d'),
            'reason': self.reason,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'processed_at': self.processed_at.strftime('%Y-%m-%d %H:%M:%S') if self.processed_at else None,
            'processed_by': self.processed_by,
            'admin_response': self.admin_response
        }

# Notification tracking models
class NotificationState(db.Model):
    """Track notification states for users (complaints and notices)"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # 'complaint_replies', 'new_complaints', 'new_notices'
    entity_id = db.Column(db.Integer, nullable=True)  # ID of the specific complaint, notice, etc.
    is_viewed = db.Column(db.Boolean, default=False)
    viewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Composite indexes for better performance
    __table_args__ = (
        db.Index('idx_user_notification_type', 'user_id', 'notification_type'),
        db.Index('idx_user_entity', 'user_id', 'notification_type', 'entity_id'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'notification_type': self.notification_type,
            'entity_id': self.entity_id,
            'is_viewed': self.is_viewed,
            'viewed_at': self.viewed_at.strftime('%Y-%m-%d %H:%M:%S') if self.viewed_at else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class ComplaintNotification(db.Model):
    """Track when admin replies to student complaints"""
    id = db.Column(db.Integer, primary_key=True)
    student_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaint.id'), nullable=False)
    reply_id = db.Column(db.Integer, db.ForeignKey('complaint_reply.id'), nullable=False)
    is_viewed = db.Column(db.Boolean, default=False)
    viewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_user_id': self.student_user_id,
            'complaint_id': self.complaint_id,
            'reply_id': self.reply_id,
            'is_viewed': self.is_viewed,
            'viewed_at': self.viewed_at.strftime('%Y-%m-%d %H:%M:%S') if self.viewed_at else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class NoticeNotification(db.Model):
    """Track when students view notices"""
    id = db.Column(db.Integer, primary_key=True)
    student_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    notice_id = db.Column(db.Integer, db.ForeignKey('notice.id'), nullable=False)
    is_viewed = db.Column(db.Boolean, default=False)
    viewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Ensure one entry per student per notice
    __table_args__ = (
        db.UniqueConstraint('student_user_id', 'notice_id', name='unique_student_notice'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_user_id': self.student_user_id,
            'notice_id': self.notice_id,
            'is_viewed': self.is_viewed,
            'viewed_at': self.viewed_at.strftime('%Y-%m-%d %H:%M:%S') if self.viewed_at else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } 