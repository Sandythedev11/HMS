from flask import Blueprint, jsonify, request, current_app, send_from_directory
from app import db
from app.models import User, Room, Student, Complaint, Feedback, Fee, Attendance, Notice, OTP, FeeNotification, ComplaintReply, AttendanceWindow, FingerprintData, NotificationState, ComplaintNotification, NoticeNotification, LeaveRequest
from app.email import send_otp_email, send_password_reset_otp_email
from app.fingerprint_service import fingerprint_service
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
import traceback
import os
import uuid
from werkzeug.utils import secure_filename

api = Blueprint('api', __name__, url_prefix='/api')

# Add CORS headers to all responses
@api.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = ['http://localhost:3000', 'http://localhost:8080']
    
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8080')
        
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    return response

# Handle OPTIONS requests for CORS preflight
@api.route('/<path:path>', methods=['OPTIONS'])
@api.route('/', defaults={'path': ''}, methods=['OPTIONS'])
def handle_options(path):
    """Handle OPTIONS requests for CORS preflight"""
    current_app.logger.info(f"OPTIONS request for path: {path}")
    
    # Log request headers
    headers = dict(request.headers)
    current_app.logger.info(f"Request headers: {headers}")
    
    response = jsonify({})
    
    # Set CORS headers
    origin = request.headers.get('Origin')
    allowed_origins = ['http://localhost:3000', 'http://localhost:8080']
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8080'
        
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Max-Age'] = '3600'  # Cache preflight for 1 hour
    
    current_app.logger.info(f"OPTIONS response headers: {dict(response.headers)}")
    
    return response, 200

# Authentication routes
@api.route('/register', methods=['POST'])
def register():
    current_app.logger.info('Registration attempt')
    
    data = request.get_json()
    current_app.logger.info(f"Registration request for email: {data.get('email')}")
    
    if not data or 'email' not in data or 'name' not in data or 'password' not in data:
        current_app.logger.warning('Registration failed: Missing required fields')
        return jsonify({'message': 'Missing required fields'}), 400
    
    # Check if email already exists in the system, regardless of user status
    if User.query.filter_by(email=data['email']).first():
        current_app.logger.warning(f"Registration failed: Email already registered - {data.get('email')}")
        return jsonify({'message': 'An account with this email already exists.'}), 400
    
    # Generate OTP and send email
    try:
        otp_code = OTP.create_otp_for_email(data['email'])
        current_app.logger.info(f"OTP generated for {data.get('email')}")
        
        # Send OTP via email
        send_otp_email(data['email'], otp_code)
        current_app.logger.info(f"OTP email sent to {data.get('email')}")
        
        return jsonify({
            'message': 'Registration initiated. Please check your email for OTP verification.',
            'email': data['email']
        }), 200
    except Exception as e:
        # Log detailed error
        current_app.logger.error(f"Failed to process registration: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'message': 'Failed to send verification email'}), 500

@api.route('/verify-otp', methods=['POST'])
def verify_otp():
    current_app.logger.info('OTP verification attempt')
    
    data = request.get_json()
    if not data or 'email' not in data or 'otp' not in data or 'name' not in data or 'password' not in data:
        current_app.logger.warning('OTP verification failed: Missing required fields')
        return jsonify({'message': 'Missing required fields'}), 400
    
    email = data['email']
    otp_code = data['otp']
    
    current_app.logger.info(f"OTP verification for email: {email}")
    
    # Verify OTP
    if not OTP.verify_otp(email, otp_code):
        current_app.logger.warning(f"OTP verification failed for {email}: Invalid or expired OTP")
        return jsonify({'message': 'Invalid or expired OTP'}), 400
    
    try:
        # Create the user
        user = User(name=data['name'], email=email)
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        current_app.logger.info(f"User created successfully: {email}")
        
        # Create a Student record - initially not approved and no enrollment request
        student = Student(
            user_id=user.id,
            roll_number=f"HMS{user.id:04d}",  # Simple roll number generation
            is_approved=False,  # Set as not approved by default
            is_enrollment_requested=False  # Student must complete profile and request enrollment
        )
        db.session.add(student)
        db.session.commit()
        
        current_app.logger.info(f"Student record created for user: {email} - Profile completion required before enrollment request")
        
        # Generate JWT token
        identity = str(user.id)
        additional_claims = {
            'email': user.email,
            'role': user.role
        }
    
        access_token = create_access_token(
            identity=identity, 
            additional_claims=additional_claims,
            expires_delta=timedelta(days=1)
        )
        
        # Return user data with proper flags for profile completion flow
        user_data = user.to_dict()
        user_data.update({
            'student_id': student.id,
            'is_approved': False,
            'is_enrollment_requested': False,
            'requires_profile_completion': True,
            'course': None,
            'contact_number': None,
            'date_of_birth': None,
            'semesters_requested': None,
            'status': 'active'
        })
        
        return jsonify({
            'message': 'Registration successful. Please complete your profile to submit an enrollment request.',
            'token': access_token,
            'user': user_data,
            'isAdmin': False,
            'requiresProfileCompletion': True,
            'student': student.to_dict()
        }), 201
    except Exception as e:
        current_app.logger.error(f"Failed to complete registration: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'message': 'Failed to complete registration'}), 500

def notify_admins_about_new_registration(user, student):
    """Notify admins about a new student registration"""
    try:
        # Find all admin users
        admins = User.query.filter_by(role='admin').all()
        
        if not admins:
            current_app.logger.warning("No admin users found to notify about new registration")
            return
        
        admin_emails = [admin.email for admin in admins]
        current_app.logger.info(f"Notifying admins about new registration: {admin_emails}")
        
        # You could implement email notifications here
        # For now, we'll just log it
        current_app.logger.info(f"New student registration pending approval: {user.email}")
    except Exception as e:
        current_app.logger.error(f"Failed to notify admins: {str(e)}")
        current_app.logger.error(traceback.format_exc())

@api.route('/resend-otp', methods=['POST'])
def resend_otp():
    current_app.logger.info('OTP resend attempt')
    
    data = request.get_json()
    if not data or 'email' not in data:
        current_app.logger.warning('OTP resend failed: Missing email')
        return jsonify({'message': 'Email is required'}), 400
    
    email = data['email']
    current_app.logger.info(f"OTP resend for email: {email}")
    
    try:
        # Generate new OTP
        otp_code = OTP.create_otp_for_email(email)
        current_app.logger.info(f"New OTP generated for {email}")
        
        # Send OTP via email
        send_otp_email(email, otp_code)
        current_app.logger.info(f"New OTP email sent to {email}")
        
        return jsonify({
            'message': 'OTP resent. Please check your email.',
            'email': email
        }), 200
    except Exception as e:
        current_app.logger.error(f"Failed to resend OTP: {str(e)}")
        return jsonify({'message': 'Failed to resend OTP'}), 500

@api.route('/forgot-password', methods=['POST'])
def forgot_password():
    current_app.logger.info('Forgot password request')
    
    data = request.get_json()
    if not data or 'email' not in data:
        current_app.logger.warning('Forgot password failed: Missing email')
        return jsonify({'message': 'Email is required'}), 400
    
    email = data['email']
    current_app.logger.info(f"Forgot password request for email: {email}")
    
    # Check if user exists
    user = User.query.filter_by(email=email).first()
    if not user:
        current_app.logger.warning(f"Forgot password failed: User not found - {email}")
        # For security, don't reveal if email exists or not
        return jsonify({'message': 'If this email is registered, you will receive an OTP to reset your password.'}), 200
    
    try:
        # Generate OTP for password reset
        otp_code = OTP.create_otp_for_email(email)
        current_app.logger.info(f"Password reset OTP generated for {email}")
        
        # Send OTP via email
        send_password_reset_otp_email(email, otp_code)
        current_app.logger.info(f"Password reset OTP email sent to {email}")
        
        return jsonify({
            'message': 'If this email is registered, you will receive an OTP to reset your password.',
            'email': email
        }), 200
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset OTP: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'message': 'Failed to send password reset email'}), 500

@api.route('/verify-password-reset-otp', methods=['POST'])
def verify_password_reset_otp():
    current_app.logger.info('Password reset OTP verification attempt')
    
    data = request.get_json()
    if not data or 'email' not in data or 'otp' not in data:
        current_app.logger.warning('Password reset OTP verification failed: Missing required fields')
        return jsonify({'message': 'Email and OTP are required'}), 400
    
    email = data['email']
    otp_code = data['otp']
    
    current_app.logger.info(f"Password reset OTP verification for email: {email}")
    
    # Check if user exists
    user = User.query.filter_by(email=email).first()
    if not user:
        current_app.logger.warning(f"Password reset OTP verification failed: User not found - {email}")
        return jsonify({'message': 'Invalid OTP'}), 400
    
    # Verify OTP
    if not OTP.verify_otp(email, otp_code):
        current_app.logger.warning(f"Password reset OTP verification failed for {email}: Invalid or expired OTP")
        return jsonify({'message': 'Invalid or expired OTP'}), 400
    
    current_app.logger.info(f"Password reset OTP verified successfully for {email}")
    
    # Generate a temporary token for password reset (valid for 15 minutes)
    reset_token = create_access_token(
        identity=str(user.id), 
        additional_claims={'purpose': 'password_reset', 'email': email},
        expires_delta=timedelta(minutes=15)
    )
    
    return jsonify({
        'message': 'OTP verified successfully. You can now reset your password.',
        'reset_token': reset_token
    }), 200

@api.route('/reset-password', methods=['POST'])
@jwt_required()
def reset_password():
    current_app.logger.info('Password reset attempt')
    
    data = request.get_json()
    if not data or 'password' not in data:
        current_app.logger.warning('Password reset failed: Missing password')
        return jsonify({'message': 'New password is required'}), 400
    
    # Get the current user from JWT
    user_id = get_jwt_identity()
    claims = get_jwt()
    
    # Verify this is a password reset token
    if claims.get('purpose') != 'password_reset':
        current_app.logger.warning(f"Password reset failed: Invalid token purpose for user {user_id}")
        return jsonify({'message': 'Invalid token for password reset'}), 400
    
    user = User.query.get(user_id)
    if not user:
        current_app.logger.warning(f"Password reset failed: User not found - {user_id}")
        return jsonify({'message': 'User not found'}), 400
    
    try:
        # Update password
        user.set_password(data['password'])
        db.session.commit()
        
        current_app.logger.info(f"Password reset successfully for user: {user.email}")
        
        return jsonify({
            'message': 'Password reset successfully. You can now login with your new password.'
        }), 200
    except Exception as e:
        current_app.logger.error(f"Failed to reset password for user {user_id}: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'message': 'Failed to reset password'}), 500

@api.route('/login', methods=['POST'])
def login():
    current_app.logger.info('Login attempt')
    
    data = request.get_json()
    if not data or 'email' not in data or 'password' not in data:
        current_app.logger.warning('Login failed: Missing required fields')
        return jsonify({'message': 'Missing required fields'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user:
        current_app.logger.warning(f"Login failed: User not found - {data.get('email')}")
        return jsonify({'message': 'Account not registered.'}), 401
    
    if not user.check_password(data['password']):
        current_app.logger.warning(f"Login failed: Invalid password for {data.get('email')}")
        return jsonify({'message': 'Invalid credentials'}), 401
    
    current_app.logger.info(f"Login successful for {data.get('email')} (Role: {user.role})")
    
    # For admin users, proceed with normal login
    if user.role == 'admin':
        # Create JWT token with proper identity and claims
        identity = str(user.id)
        additional_claims = {
            'email': user.email,
            'role': user.role
        }
        
        access_token = create_access_token(
            identity=identity, 
            additional_claims=additional_claims,
            expires_delta=timedelta(days=1)
        )
        
        current_app.logger.info(f"JWT token created for admin user {user.id}")
        
        return jsonify({
            'token': access_token,
            'user': user.to_dict(),
            'isAdmin': True
        }), 200
    
    # For student users, check their student record and status
    student = Student.query.filter_by(user_id=user.id).first()
    
    if not student:
        current_app.logger.error(f"Student record not found for user {user.id}")
        return jsonify({'message': 'Student record not found. Please contact administration.'}), 500
        
    # Check if student has been removed by admin (status is 'rejected')
    if student.status == 'rejected':
        current_app.logger.info(f"Rejected student attempted login: {user.email}")
        return jsonify({
            'message': 'You have been removed from the hostel.',
            'status': 'rejected',
            'registerAgain': True
        }), 403
    
    # Create JWT token for student
    identity = str(user.id)
    additional_claims = {
        'email': user.email,
        'role': user.role
    }
    
    access_token = create_access_token(
        identity=identity, 
        additional_claims=additional_claims,
        expires_delta=timedelta(days=1)
    )
    
    current_app.logger.info(f"JWT token created for student user {user.id}")
    
    # Return user data with student information
    user_data = user.to_dict()
    user_data.update({
        'student_id': student.id,
        'is_approved': student.is_approved,
        'is_enrollment_requested': student.is_enrollment_requested,
        'course': student.course,
        'contact_number': student.contact_number,
        'date_of_birth': student.date_of_birth.strftime('%Y-%m-%d') if student.date_of_birth else None,
        'semesters_requested': student.semesters_requested,
        'status': student.status
    })
    
    return jsonify({
        'token': access_token,
        'user': user_data,
        'isAdmin': False,
        'student': student.to_dict()
    }), 200

# Helper function to get user from JWT identity
def get_current_user():
    """Get the current user from JWT identity"""
    try:
        identity = get_jwt_identity()
        current_app.logger.info(f"JWT identity: {identity}, type: {type(identity)}")
        
        # Handle case where identity is None
        if identity is None:
            current_app.logger.error("JWT identity is None")
            return None
        
        # Always convert identity to integer for user lookup
        try:
            if isinstance(identity, str):
                user_id = int(identity)
            else:
                user_id = identity
                
            current_app.logger.info(f"Looking up user with ID: {user_id}")
            user = User.query.get(user_id)
            
            if user:
                current_app.logger.info(f"Found user: {user.email}, role: {user.role}")
            else:
                current_app.logger.error(f"No user found with ID: {user_id}")
                
            return user
        except ValueError:
            current_app.logger.error(f"Invalid user ID format: {identity}")
            return None
    except Exception as e:
        current_app.logger.error(f"Error getting current user: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return None

# User related routes
@api.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user = get_current_user()
    
    if not current_user:
        current_app.logger.error("User not found from token identity")
        return jsonify({'message': 'User not found'}), 404
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@api.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin' and current_user.id != user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), 200

# Room related routes
@api.route('/rooms', methods=['GET'])
@jwt_required()
def get_rooms():
    try:
        # Get all rooms with enhanced occupancy information
        rooms = Room.query.all()
        
        # Convert to dictionary with occupancy data
        room_data = []
        for room in rooms:
            room_dict = room.to_dict()
            room_data.append(room_dict)
        
        response = jsonify(room_data)
        response = _add_cors_headers_to_response(response)
        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error getting rooms: {str(e)}")
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/rooms', methods=['POST'])
@jwt_required()
def create_room():
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    room = Room(
        room_number=data['room_number'],
        room_type=data['room_type'],
        status=data.get('status', 'Vacant')
    )
    
    db.session.add(room)
    db.session.commit()
    
    return jsonify(room.to_dict()), 201

@api.route('/rooms/<int:room_id>', methods=['PUT'])
@jwt_required()
def update_room(room_id):
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    room = Room.query.get_or_404(room_id)
    data = request.get_json()
    
    room.room_number = data.get('room_number', room.room_number)
    room.room_type = data.get('room_type', room.room_type)
    room.status = data.get('status', room.status)
    
    db.session.commit()
    
    return jsonify(room.to_dict()), 200

@api.route('/rooms/<int:room_id>', methods=['DELETE'])
@jwt_required()
def delete_room(room_id):
    """Delete a room"""
    try:
        # Get current user from token
        current_user = get_current_user()
        
        if not current_user:
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Check if user is admin
        if current_user.role != 'admin':
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        # Get the room
        room = Room.query.get_or_404(room_id)
        
        # Check if room has students assigned - use the students relationship
        if room.students.count() > 0:
            # Get student names for more detailed error
            student_names = [student.roll_number for student in room.students]
            error_msg = f"Cannot delete room with assigned students: {', '.join(student_names)}"
            current_app.logger.warning(f"Room deletion failed: {error_msg}")
            
            response = jsonify({
                'message': 'Cannot delete room with assigned students', 
                'detail': error_msg,
                'students': student_names
            })
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        # Delete the room
        db.session.delete(room)
        db.session.commit()
        
        response = jsonify({'message': 'Room deleted successfully'})
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting room: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({
            'message': 'Server error', 
            'error': str(e),
            'detail': 'An error occurred while trying to delete the room.'
        })
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/rooms/available', methods=['GET'])
@jwt_required()
def get_available_rooms():
    """Get rooms that are not at full capacity for allocation"""
    try:
        current_user = get_current_user()
        
        if not current_user:
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        if current_user.role != 'admin':
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        # Get all rooms with their current occupancy
        rooms = Room.query.all()
        available_rooms = []
        
        for room in rooms:
            room_dict = room.to_dict()
            # Include rooms that are not at full capacity
            if room_dict['occupied'] < room_dict['capacity']:
                available_rooms.append(room_dict)
        
        response = jsonify(available_rooms)
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting available rooms: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

# Complaint related routes
@api.route('/complaints', methods=['GET'])
@jwt_required()
def get_complaints():
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role == 'admin':
        complaints = Complaint.query.order_by(Complaint.created_at.desc()).all()
    else:
        complaints = Complaint.query.filter_by(user_id=current_user.id).order_by(Complaint.created_at.desc()).all()
    
    return jsonify([complaint.to_dict() for complaint in complaints]), 200

@api.route('/complaints', methods=['POST'])
@jwt_required()
def create_complaint():
    current_user = User.query.get(get_jwt_identity())
    data = request.get_json()
    
    complaint = Complaint(
        subject=data['subject'],
        details=data['details'],
        user_id=current_user.id
    )
    
    db.session.add(complaint)
    db.session.commit()
    
    return jsonify(complaint.to_dict()), 201

@api.route('/complaints/<int:complaint_id>', methods=['PUT'])
@jwt_required()
def update_complaint(complaint_id):
    current_user = User.query.get(get_jwt_identity())
    complaint = Complaint.query.get_or_404(complaint_id)
    
    if current_user.role != 'admin' and current_user.id != complaint.user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if 'subject' in data:
        complaint.subject = data['subject']
    
    if 'details' in data:
        complaint.details = data['details']
    
    if current_user.role == 'admin' and 'status' in data:
        complaint.status = data['status']
    
    db.session.commit()
    
    return jsonify(complaint.to_dict()), 200

@api.route('/complaints/<int:complaint_id>', methods=['DELETE'])
@jwt_required()
def delete_complaint(complaint_id):
    current_user = User.query.get(get_jwt_identity())
    complaint = Complaint.query.get_or_404(complaint_id)
    
    if current_user.role != 'admin' and current_user.id != complaint.user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    db.session.delete(complaint)
    db.session.commit()
    
    return jsonify({'message': 'Complaint deleted successfully'}), 200

# Complaint Reply related routes
@api.route('/complaints/<int:complaint_id>/replies', methods=['POST'])
@jwt_required()
def create_complaint_reply(complaint_id):
    current_user = User.query.get(get_jwt_identity())
    complaint = Complaint.query.get_or_404(complaint_id)
    data = request.get_json()
    
    reply = ComplaintReply(
        content=data['content'],
        complaint_id=complaint_id,
        user_id=current_user.id,
        is_admin=current_user.role == 'admin'
    )
    
    db.session.add(reply)
    db.session.commit()
    
    # Create notification if admin replied to student complaint
    if current_user.role == 'admin' and complaint.user_id != current_user.id:
        try:
            # Create complaint notification for the student
            notification = ComplaintNotification(
                student_user_id=complaint.user_id,
                complaint_id=complaint.id,
                reply_id=reply.id,
                is_viewed=False
            )
            db.session.add(notification)
            db.session.commit()
            current_app.logger.info(f"Created complaint notification for user {complaint.user_id}")
        except Exception as e:
            current_app.logger.error(f"Failed to create complaint notification: {str(e)}")
            # Don't fail the reply creation if notification fails
    
    return jsonify(reply.to_dict()), 201

@api.route('/complaints/<int:complaint_id>/replies/<int:reply_id>', methods=['PUT'])
@jwt_required()
def update_complaint_reply(complaint_id, reply_id):
    current_user = User.query.get(get_jwt_identity())
    complaint = Complaint.query.get_or_404(complaint_id)
    reply = ComplaintReply.query.get_or_404(reply_id)
    
    # Ensure the reply belongs to the complaint
    if reply.complaint_id != complaint_id:
        return jsonify({'message': 'Reply not found for this complaint'}), 404
    
    # Check permissions - allow only the reply creator or admin to edit
    if current_user.id != reply.user_id and current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if 'content' in data:
        reply.content = data['content']
    
    db.session.commit()
    
    return jsonify(reply.to_dict()), 200

@api.route('/complaints/<int:complaint_id>/replies/<int:reply_id>', methods=['DELETE'])
@jwt_required()
def delete_complaint_reply(complaint_id, reply_id):
    current_user = User.query.get(get_jwt_identity())
    complaint = Complaint.query.get_or_404(complaint_id)
    reply = ComplaintReply.query.get_or_404(reply_id)
    
    # Ensure the reply belongs to the complaint
    if reply.complaint_id != complaint_id:
        return jsonify({'message': 'Reply not found for this complaint'}), 404
    
    # Check permissions - allow only the reply creator or admin to delete
    if current_user.id != reply.user_id and current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    db.session.delete(reply)
    db.session.commit()
    
    return jsonify({'message': 'Reply deleted successfully'}), 200

# Fee related routes
@api.route('/fees', methods=['GET'])
@jwt_required()
def get_fees():
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role == 'admin':
        fees = Fee.query.all()
    else:
        student = Student.query.filter_by(user_id=current_user.id).first()
        if not student:
            return jsonify([]), 200
        fees = Fee.query.filter_by(student_id=student.id).all()
    
    return jsonify([fee.to_dict() for fee in fees]), 200

@api.route('/fees', methods=['POST'])
@jwt_required()
def create_fee():
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    fee = Fee(
        student_id=data['student_id'],
        description=data['description'],
        amount=data['amount'],
        status=data.get('status', 'Pending'),
        due_date=datetime.strptime(data['due_date'], '%Y-%m-%d') if 'due_date' in data else None
    )
    
    db.session.add(fee)
    db.session.commit()
    
    return jsonify(fee.to_dict()), 201

@api.route('/fees/<int:fee_id>/pay', methods=['POST'])
@jwt_required()
def pay_fee(fee_id):
    current_user = User.query.get(get_jwt_identity())
    fee = Fee.query.get_or_404(fee_id)
    
    student = Student.query.filter_by(user_id=current_user.id).first()
    if not student or student.id != fee.student_id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    fee.status = 'Paid'
    fee.payment_date = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(fee.to_dict()), 200

# Notice related routes
@api.route('/notices', methods=['GET'])
@jwt_required()
def get_notices():
    notices = Notice.query.order_by(Notice.created_at.desc()).all()
    return jsonify([notice.to_dict() for notice in notices]), 200

@api.route('/notices', methods=['POST'])
@jwt_required()
def create_notice():
    current_user = get_current_user()
    
    if not current_user or current_user.role != 'admin':
        response = jsonify({'message': 'Unauthorized'})
        response = _add_cors_headers_to_response(response)
        return response, 403
    
    data = request.get_json()
    notice = Notice(
        title=data['title'],
        content=data['content']
    )
    
    db.session.add(notice)
    db.session.commit()
    
    # Create notice notifications for all students
    try:
        # Get all student users
        student_users = User.query.filter_by(role='student').all()
        
        for student_user in student_users:
            # Create a notice notification for each student
            notice_notification = NoticeNotification(
                student_user_id=student_user.id,
                notice_id=notice.id,
                is_viewed=False
            )
            db.session.add(notice_notification)
        
        db.session.commit()
        current_app.logger.info(f"Created notice notifications for {len(student_users)} students")
    except Exception as e:
        current_app.logger.error(f"Failed to create notice notifications: {str(e)}")
        # Don't fail notice creation if notifications fail
    
    return jsonify(notice.to_dict()), 201

@api.route('/notices/<int:notice_id>', methods=['PUT'])
@jwt_required()
def update_notice(notice_id):
    """Update an existing notice"""
    try:
        # Get current user from token
        current_user = get_current_user()
        
        if not current_user:
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Check if user is an admin
        if current_user.role != 'admin':
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        # Get notice to update
        notice = Notice.query.get_or_404(notice_id)
        
        # Get data from request
        data = request.get_json()
        
        if not data:
            response = jsonify({'message': 'No data provided'})
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        # Update notice fields
        if 'title' in data:
            notice.title = data['title']
            
        if 'content' in data:
            notice.content = data['content']
        
        # Save changes
        db.session.commit()
        
        # Return updated notice
        response = jsonify({
            'message': 'Notice updated successfully',
            'notice': notice.to_dict()
        })
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating notice: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/notices/<int:notice_id>', methods=['DELETE'])
@jwt_required()
def delete_notice(notice_id):
    """Delete a notice"""
    try:
        # Get current user from token
        current_user = get_current_user()
        
        if not current_user:
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Check if user is an admin
        if current_user.role != 'admin':
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        # Get notice to delete
        notice = Notice.query.get_or_404(notice_id)
        
        # Delete the notice
        db.session.delete(notice)
        db.session.commit()
        
        response = jsonify({'message': 'Notice deleted successfully'})
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting notice: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

# Feedback related routes
@api.route('/feedback', methods=['GET'])
@jwt_required()
def get_feedback():
    try:
        current_user = User.query.get(get_jwt_identity())
        
        if current_user.role == 'admin':
            # For admins, get all feedback sorted by created_at (newest first) and is_read (unread first)
            feedback = Feedback.query.order_by(Feedback.is_read.asc(), Feedback.created_at.desc()).all()
            
            # Don't automatically mark as read - wait for specific endpoint call
            # This allows tracking unread notifications
        else:
            # For students, only get their own feedback
            feedback = Feedback.query.filter_by(user_id=current_user.id).order_by(Feedback.created_at.desc()).all()
        
        response = jsonify([f.to_dict() for f in feedback])
        response = _add_cors_headers_to_response(response)
        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error getting feedback: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/feedback', methods=['POST'])
@jwt_required()
def create_feedback():
    try:
        current_user = User.query.get(get_jwt_identity())
        data = request.get_json()
        
        feedback = Feedback(
            content=data['content'],
            user_id=current_user.id,
            is_read=False,
            rating=data.get('rating', 5)  # Use provided rating or default to 5
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        response = jsonify(feedback.to_dict())
        response = _add_cors_headers_to_response(response)
        return response, 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating feedback: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/feedback/<int:feedback_id>', methods=['PUT'])
@jwt_required()
def update_feedback(feedback_id):
    try:
        current_user = User.query.get(get_jwt_identity())
        data = request.get_json()
        
        feedback = Feedback.query.get_or_404(feedback_id)
        
        # Only allow the owner to update their feedback
        if feedback.user_id != current_user.id:
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        feedback.content = data['content']
        # Update rating if provided
        if 'rating' in data:
            feedback.rating = data['rating']
        
        db.session.commit()
        
        response = jsonify(feedback.to_dict())
        response = _add_cors_headers_to_response(response)
        return response, 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating feedback: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/feedback/<int:feedback_id>', methods=['DELETE'])
@jwt_required()
def delete_feedback(feedback_id):
    try:
        current_user = User.query.get(get_jwt_identity())
        
        feedback = Feedback.query.get_or_404(feedback_id)
        
        # Only allow the owner to delete their feedback
        if feedback.user_id != current_user.id:
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        db.session.delete(feedback)
        db.session.commit()
        
        response = jsonify({'message': 'Feedback deleted'})
        response = _add_cors_headers_to_response(response)
        return response, 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting feedback: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/feedback/mark-read', methods=['POST'])
@jwt_required()
def mark_feedback_read():
    try:
        current_user = User.query.get(get_jwt_identity())
        
        # Only allow admins to mark feedback as read
        if current_user.role != 'admin':
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        # Get all unread feedback
        unread_feedback = Feedback.query.filter_by(is_read=False).all()
        
        # Log the number of unread items being marked as read
        current_app.logger.info(f"Marking {len(unread_feedback)} feedback items as read")
        
        # Mark all unread feedback as read
        for feedback in unread_feedback:
            feedback.is_read = True
        
        db.session.commit()
        
        response = jsonify({
            'message': 'All feedback marked as read',
            'count': len(unread_feedback)
        })
        response = _add_cors_headers_to_response(response)
        return response, 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error marking feedback as read: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

# Attendance related routes
@api.route('/attendance', methods=['GET'])
@jwt_required()
def get_attendance():
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role == 'admin':
        # For admin, return a paginated list of all attendance records
        attendance = Attendance.query.order_by(Attendance.date.desc()).all()
    else:
        # For students, only return their own attendance records
        student = Student.query.filter_by(user_id=current_user.id).first()
        if not student:
            return jsonify([]), 200
        attendance = Attendance.query.filter_by(student_id=student.id).order_by(Attendance.date.desc()).all()
    
    return jsonify([a.to_dict() for a in attendance]), 200

@api.route('/attendance', methods=['POST'])
@jwt_required()
def mark_attendance():
    current_user = User.query.get(get_jwt_identity())
    data = request.get_json()
    
    # Check if attendance window is open
    window = AttendanceWindow.query.order_by(AttendanceWindow.id.desc()).first()
    if not window or not window.is_open:
        return jsonify({'message': 'Attendance time window is closed'}), 403
    
    # If student is marking attendance
    if current_user.role == 'student':
        student = Student.query.filter_by(user_id=current_user.id).first()
        
        if not student:
            return jsonify({'message': 'Student record not found'}), 404
        
        # Check if student has fingerprint data
        fingerprint = FingerprintData.query.filter_by(student_id=student.id).first()
        if not fingerprint:
            return jsonify({'message': 'Fingerprint data not found'}), 403
        
        # Create attendance record for today
        today = datetime.utcnow().date()
        existing = Attendance.query.filter_by(student_id=student.id, date=today).first()
        
        if existing:
            return jsonify({'message': 'Attendance already marked for today'}), 400
        
        attendance = Attendance(
            student_id=student.id,
            date=today,
            status='Present',
            timestamp=datetime.utcnow()
        )
        
        db.session.add(attendance)
        db.session.commit()
        
        return jsonify(attendance.to_dict()), 201
    
    # If admin is marking attendance for a student
    elif current_user.role == 'admin':
        if not data or 'student_id' not in data or 'status' not in data:
            return jsonify({'message': 'Missing required fields'}), 400
        
        student = Student.query.get(data['student_id'])
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        
        # Use today's date if date is not provided
        mark_date = datetime.strptime(data.get('date', datetime.utcnow().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
        
        # Check if attendance already exists for this date
        existing = Attendance.query.filter_by(student_id=student.id, date=mark_date).first()
        if existing:
            existing.status = data['status']
            db.session.commit()
            return jsonify(existing.to_dict()), 200
        
        # Create new attendance record
        attendance = Attendance(
            student_id=student.id,
            date=mark_date,
            status=data['status'],
            timestamp=datetime.utcnow()
        )
        
        db.session.add(attendance)
        db.session.commit()
        
        return jsonify(attendance.to_dict()), 201
    
    return jsonify({'message': 'Unauthorized'}), 403

@api.route('/student/attendance', methods=['GET'])
@jwt_required()
def get_student_attendance():
    current_user = User.query.get(get_jwt_identity())
    
    student = Student.query.filter_by(user_id=current_user.id).first()
    if not student:
        return jsonify({'message': 'Student record not found'}), 404
    
    # Get attendance records for the student
    attendance = Attendance.query.filter_by(student_id=student.id).order_by(Attendance.date.desc()).all()
    
    return jsonify([a.to_dict() for a in attendance]), 200

@api.route('/admin/students/fingerprint-status', methods=['GET'])
@jwt_required()
def get_student_fingerprint_status():
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    # Get all approved students with their fingerprint status
    students = Student.query.filter_by(is_approved=True).all()
    result = []
    
    for student in students:
        user = User.query.get(student.user_id)
        if user:
            student_data = student.to_dict()
            student_data['name'] = user.name
            student_data['email'] = user.email
            result.append(student_data)
    
    return jsonify(result), 200

@api.route('/admin/students/fingerprint/<int:student_id>', methods=['POST'])
@jwt_required()
def upload_fingerprint(student_id):
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    student = Student.query.get_or_404(student_id)
    data = request.get_json()
    
    # Handle legacy fingerprint_data for backward compatibility
    if 'fingerprint_data' in data:
        # Check if fingerprint already exists
        existing = FingerprintData.query.filter_by(student_id=student.id).first()
        if existing:
            existing.right_thumb_template = data['fingerprint_data']
            existing.last_updated = datetime.utcnow()
            db.session.commit()
            return jsonify({'message': 'Fingerprint data updated successfully'}), 200
        
        # Create new fingerprint record
        fingerprint = FingerprintData(
            student_id=student.id,
            right_thumb_template=data['fingerprint_data']
        )
        
        db.session.add(fingerprint)
        db.session.commit()
        
        return jsonify({'message': 'Fingerprint data saved successfully'}), 201
    
    # Handle new biometric data structure
    if not data or ('right_thumb_template' not in data and 'left_thumb_template' not in data):
        return jsonify({'message': 'At least one fingerprint template is required'}), 400
    
    try:
        # Check if fingerprint already exists
        existing = FingerprintData.query.filter_by(student_id=student.id).first()
        if existing:
            # Update existing record
            if 'right_thumb_template' in data:
                existing.right_thumb_template = data['right_thumb_template']
            if 'left_thumb_template' in data:
                existing.left_thumb_template = data['left_thumb_template']
            if 'device_id' in data:
                existing.device_id = data['device_id']
            existing.last_updated = datetime.utcnow()
            db.session.commit()
            return jsonify({'message': 'Fingerprint data updated successfully', 'fingerprint': existing.to_dict()}), 200
        
        # Create new fingerprint record
        fingerprint = FingerprintData(
            student_id=student.id,
            right_thumb_template=data.get('right_thumb_template'),
            left_thumb_template=data.get('left_thumb_template'),
            device_id=data.get('device_id')
        )
        
        db.session.add(fingerprint)
        db.session.commit()
        
        return jsonify({'message': 'Fingerprint data saved successfully', 'fingerprint': fingerprint.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving fingerprint data: {str(e)}")
        return jsonify({'message': 'Failed to save fingerprint data'}), 500

@api.route('/admin/students/fingerprint/<int:student_id>/biometric-capture', methods=['POST'])
@jwt_required()
def capture_biometric_fingerprint(student_id):
    """Capture fingerprint using biometric device"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    student = Student.query.get_or_404(student_id)
    
    try:
        current_app.logger.info(f"Starting biometric capture for student {student_id}")
        
        # Use the fingerprint service to scan both thumbs
        success, result = fingerprint_service.scan_both_thumbs()
        
        if not success:
            current_app.logger.error(f"Biometric capture failed: {result['message']}")
            return jsonify({
                'success': False,
                'message': result['message'],
                'error_type': 'scan_failed'
            }), 400
        
        # Save the fingerprint data to database
        existing = FingerprintData.query.filter_by(student_id=student.id).first()
        if existing:
            # Update existing record
            existing.right_thumb_template = result['right_thumb']
            existing.left_thumb_template = result['left_thumb']
            existing.device_id = result['device_id']
            existing.last_updated = datetime.utcnow()
        else:
            # Create new fingerprint record
            existing = FingerprintData(
                student_id=student.id,
                right_thumb_template=result['right_thumb'],
                left_thumb_template=result['left_thumb'],
                device_id=result['device_id']
            )
            db.session.add(existing)
        
        db.session.commit()
        
        current_app.logger.info(f"Biometric capture completed successfully for student {student_id}")
        
        return jsonify({
            'success': True,
            'message': 'Both thumbs captured and saved successfully',
            'fingerprint': existing.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during biometric capture: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Capture failed: {str(e)}',
            'error_type': 'system_error'
        }), 500

@api.route('/admin/fingerprint/sensor/status', methods=['GET'])
@jwt_required()
def get_sensor_status():
    """Get fingerprint sensor status"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        sensor_info = fingerprint_service.get_sensor_info()
        return jsonify(sensor_info), 200
    except Exception as e:
        current_app.logger.error(f"Error getting sensor status: {str(e)}")
        return jsonify({'connected': False, 'error': str(e)}), 500

@api.route('/admin/fingerprint/sensor/initialize', methods=['POST'])
@jwt_required()
def initialize_sensor():
    """Initialize fingerprint sensor connection"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        success, message = fingerprint_service.initialize_sensor()
        
        # Always return 200 OK, but include success flag and detailed message
        response_data = {
            'success': success,
            'message': message,
            'sensor_info': fingerprint_service.get_sensor_info() if success else None
        }
        
        if not success:
            # Add additional helpful information for debugging
            response_data['error_type'] = 'sensor_not_found'
            response_data['suggestions'] = [
                'Check if fingerprint device is connected',
                'Verify PyFingerprint library is installed',
                'Ensure correct COM port (Windows) or device path (Linux)',
                'Check device permissions'
            ]
        
        return jsonify(response_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error initializing sensor: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Initialization failed: {str(e)}',
            'error_type': 'system_error',
            'suggestions': [
                'Check if PyFingerprint library is installed: pip install pyfingerprint',
                'Verify fingerprint device is properly connected',
                'Check system logs for more details'
            ]
        }), 200

@api.route('/admin/attendance/window/open', methods=['POST'])
@jwt_required()
def open_attendance_window():
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    # Close any existing open windows
    open_windows = AttendanceWindow.query.filter_by(is_open=True).all()
    for window in open_windows:
        window.is_open = False
        window.closed_at = datetime.utcnow()
        db.session.commit()
    
    # Create new open window
    window = AttendanceWindow(
        is_open=True,
        opened_at=datetime.utcnow(),
        opened_by=current_user.id
    )
    
    db.session.add(window)
    db.session.commit()
    
    return jsonify(window.to_dict()), 201

@api.route('/admin/attendance/window/close', methods=['POST'])
@jwt_required()
def close_attendance_window():
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    # Find and close any open windows
    window = AttendanceWindow.query.filter_by(is_open=True).first()
    
    if not window:
        return jsonify({'message': 'No open attendance window found'}), 404
    
    window.is_open = False
    window.closed_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(window.to_dict()), 200

@api.route('/admin/attendance/window', methods=['GET'])
@jwt_required()
def get_attendance_window_status():
    """Get current attendance window status for admin"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        # Get the most recent attendance window
        window = AttendanceWindow.query.order_by(AttendanceWindow.id.desc()).first()
        
        if not window:
            # No window exists yet, return default closed status
            return jsonify({
                'is_open': False,
                'opened_at': None,
                'closed_at': None,
                'opened_by': None
            }), 200
        
        return jsonify(window.to_dict()), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting attendance window status: {str(e)}")
        return jsonify({'message': 'Failed to get attendance window status'}), 500

@api.route('/student/fingerprint-status', methods=['GET'])
@jwt_required()
def check_student_fingerprint():
    current_user = User.query.get(get_jwt_identity())
    
    student = Student.query.filter_by(user_id=current_user.id).first()
    if not student:
        return jsonify({'message': 'Student record not found'}), 404
    
    fingerprint = FingerprintData.query.filter_by(student_id=student.id).first()
    
    return jsonify({
        'has_fingerprint': fingerprint is not None,
        'fingerprint_id': fingerprint.id if fingerprint else None
    }), 200

@api.route('/test-admin', methods=['GET'])
def test_admin():
    """Test endpoint to verify admin account"""
    admin_email = "sandeepgouda209@gmail.com"
    admin_password = "Admin@123"
    
    user = User.query.filter_by(email=admin_email).first()
    
    if not user:
        current_app.logger.error(f"Admin user {admin_email} not found in database")
        return jsonify({
            'status': 'error',
            'message': 'Admin account not found',
            'admin_email': admin_email
        }), 404
    
    password_check = user.check_password(admin_password)
    current_app.logger.info(f"Admin password check result: {password_check}")
    
    return jsonify({
        'status': 'success',
        'message': 'Admin account found',
        'admin_email': admin_email,
        'admin_role': user.role,
        'password_valid': password_check
    }), 200

# Student management routes for admin
@api.route('/admin/students/pending', methods=['GET'])
@jwt_required()
def get_pending_students():
    """Get all pending student registrations"""
    try:
        current_app.logger.info("Admin pending students endpoint called")
        origin = request.headers.get('Origin', '')
        current_app.logger.info(f"Request origin: {origin}")
        
        # Log request headers for debugging
        headers = dict(request.headers)
        current_app.logger.info(f"Request headers: {headers}")
        
        # Get current user from token
        current_user = get_current_user()
        
        if not current_user:
            current_app.logger.error("User not found from token identity")
            response = jsonify({'message': 'User not found'})
            # Ensure CORS headers even on error
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        current_app.logger.info(f"User from token: {current_user.email}, role: {current_user.role}")
        
        if current_user.role != 'admin':
            current_app.logger.warning(f"Unauthorized access attempt to pending students by: {current_user.email}")
            response = jsonify({'message': 'Unauthorized'})
            # Ensure CORS headers even on error
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        # Get all students that aren't approved yet AND have submitted enrollment requests
        try:
            current_app.logger.info("Querying database for pending students with enrollment requests")
            
            # Get all students that are not approved yet but have submitted enrollment requests
            pending_students = Student.query.filter_by(
                is_approved=False, 
                is_enrollment_requested=True
            ).all()
            current_app.logger.info(f"Found {len(pending_students)} pending student records with enrollment requests")
            
            # Build the result with user data
            result = []
            for student in pending_students:
                # Get the user associated with this student
                user = User.query.get(student.user_id)
                if user:
                    student_data = student.to_dict()
                    student_data['name'] = user.name
                    student_data['email'] = user.email
                    result.append(student_data)
            
            current_app.logger.info(f"Built result with {len(result)} students with enrollment requests")
            
            response = jsonify(result)
            # Set CORS headers
            response = _add_cors_headers_to_response(response)
            return response, 200
            
        except Exception as db_error:
            current_app.logger.error(f"Database error: {str(db_error)}")
            current_app.logger.error(traceback.format_exc())
            response = jsonify({'message': 'Database error', 'error': str(db_error)})
            # Ensure CORS headers even on error
            response = _add_cors_headers_to_response(response)
            return response, 500
            
    except Exception as e:
        current_app.logger.error(f"Error getting pending students: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        # Ensure CORS headers even on error
        response = _add_cors_headers_to_response(response)
        return response, 500

# Helper function to add CORS headers to responses
def _add_cors_headers_to_response(response):
    """Add CORS headers to the given response"""
    origin = request.headers.get('Origin')
    allowed_origins = ['http://localhost:3000', 'http://localhost:8080']
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8080'
        
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    
    return response

@api.route('/admin/students/approve/<int:student_id>', methods=['PUT'])
@jwt_required()
def approve_student(student_id):
    """Approve a student registration and set profile details"""
    try:
        current_user = User.query.get(get_jwt_identity())
        
        if current_user.role != 'admin':
            current_app.logger.warning(f"Unauthorized approval attempt by: {current_user.email}")
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        data = request.get_json()
        student = Student.query.get_or_404(student_id)
        
        # Room assignment is mandatory
        if 'room_id' not in data or not data['room_id']:
            response = jsonify({'message': 'Room assignment is required for approval'})
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        # Check if the room exists
        room = Room.query.get(data['room_id'])
        if not room:
            response = jsonify({'message': 'Selected room does not exist'})
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        # Check room capacity (max 4 students per room)
        current_occupancy = room.get_occupancy()
        if current_occupancy >= 4:
            response = jsonify({
                'message': f'Room {room.room_number} is full (capacity: 4, current: {current_occupancy})',
                'room_full': True
            })
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        # If student is already in this room, allow the update
        if student.room_id != room.id:
            # Check if moving from another room would exceed capacity
            if current_occupancy >= 4:
                response = jsonify({
                    'message': f'Cannot assign to room {room.room_number} - capacity exceeded',
                    'room_full': True
                })
                response = _add_cors_headers_to_response(response)
                return response, 400
        
        # Update student profile with approval
        student.is_approved = True
        student.approval_date = datetime.utcnow()
        student.status = 'active'  # Ensure student is marked as active
        
        # Set join_date if not already set
        if not student.join_date:
            student.join_date = datetime.utcnow().date()
        
        # Update other profile fields if provided
        if 'course' in data:
            student.course = data['course']
        if 'profile_picture' in data:
            student.profile_picture = data['profile_picture']
        
        # Assign the room
        student.room_id = room.id
        
        # Update room status based on occupancy
        new_occupancy = room.get_occupancy() + (1 if student.room_id != room.id else 0)
        if new_occupancy >= 4:
            room.status = 'Fully Occupied'
        elif new_occupancy > 0:
            room.status = f'{new_occupancy}/4'
        else:
            room.status = 'Vacant'
        
        # Commit all changes
        db.session.commit()
        
        # Get the user associated with this student for notification purposes
        user = User.query.get(student.user_id)
        current_app.logger.info(f"Admin {current_user.email} approved student {user.email} and assigned room {room.room_number}")
        
        # Return comprehensive student data including room information
        student_data = student.to_dict()
        student_data['name'] = user.name
        student_data['email'] = user.email
        student_data['room_number'] = room.room_number
        student_data['room_type'] = room.room_type
        
        response = jsonify({
            'message': 'Student approved successfully and room assigned', 
            'student': student_data
        })
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error approving student: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Failed to approve student', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/admin/students/reject/<int:student_id>', methods=['PUT', 'OPTIONS'])
@jwt_required(optional=True)
def reject_student(student_id):
    """Reject a student enrollment request or remove an approved student"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        current_app.logger.warning(f"Unauthorized rejection attempt by: {current_user.email}")
        response = jsonify({'message': 'Unauthorized'})
        response = _add_cors_headers_to_response(response)
        return response, 403
    
    student = Student.query.get_or_404(student_id)
    
    try:
        # Get the user email for logging
        user = User.query.get(student.user_id)
        user_email = user.email if user else "Unknown"
        
        # Set student status to rejected and reset enrollment request
        student.status = 'rejected'
        student.is_enrollment_requested = False
        student.is_approved = False
        student.approval_date = None
        student.join_date = None
        student.room_id = None
        
        db.session.commit()
        
        current_app.logger.info(f"Admin {current_user.email} rejected/removed student {user_email}")
        
        response = jsonify({'message': 'Student successfully removed from the hostel'})
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error rejecting/removing student: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        
        response = jsonify({'message': 'Failed to remove student'})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/admin/students/approved', methods=['GET'])
@jwt_required()
def get_approved_students():
    """Get all approved students"""
    try:
        current_app.logger.info("Admin approved students endpoint called")
        
        # Get current user from token
        current_user = get_current_user()
        
        if not current_user:
            current_app.logger.error("User not found from token identity")
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        current_app.logger.info(f"User from token: {current_user.email}, role: {current_user.role}")
        
        if current_user.role != 'admin':
            current_app.logger.warning(f"Unauthorized access attempt to approved students by: {current_user.email}")
            response = jsonify({'message': 'Unauthorized'})
            response = _add_cors_headers_to_response(response)
            return response, 403
        
        # Get all approved students with simplified query
        try:
            # Get all approved students
            approved_students = Student.query.filter_by(is_approved=True).all()
            current_app.logger.info(f"Found {len(approved_students)} approved student records")
            
            # Build the result with user data
            result = []
            for student in approved_students:
                # Get the user associated with this student
                user = User.query.get(student.user_id)
                if user:
                    student_data = student.to_dict()
                    student_data['name'] = user.name
                    student_data['email'] = user.email
                    
                    # Add room details if available
                    if student.room_id:
                        room = Room.query.get(student.room_id)
                        if room:
                            student_data['room_number'] = room.room_number
                            student_data['room_type'] = room.room_type
                    
                    result.append(student_data)
            
            current_app.logger.info(f"Admin {current_user.email} retrieved {len(result)} approved students")
            response = jsonify(result)
            response = _add_cors_headers_to_response(response)
            return response, 200
            
        except Exception as db_error:
            current_app.logger.error(f"Database error: {str(db_error)}")
            current_app.logger.error(traceback.format_exc())
            response = jsonify({'message': 'Database error', 'error': str(db_error)})
            response = _add_cors_headers_to_response(response)
            return response, 500
            
    except Exception as e:
        current_app.logger.error(f"Error getting approved students: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/debug-token', methods=['GET'])
@jwt_required()
def debug_token():
    """Debug endpoint to check token validity"""
    try:
        # Log the request headers for debugging
        auth_header = request.headers.get('Authorization', '')
        current_app.logger.info(f"Auth header: {auth_header[:20]}...")
        
        # Get identity from JWT
        current_identity = get_jwt_identity()
        current_app.logger.info(f"JWT identity (raw): {current_identity}, type: {type(current_identity)}")
        
        # Convert string ID to integer if needed
        if isinstance(current_identity, str) and current_identity.isdigit():
            user_id = int(current_identity)
        else:
            user_id = current_identity
            
        current_app.logger.info(f"Looking up user with ID: {user_id}, type: {type(user_id)}")
        
        # Find the user
        current_user = User.query.get(user_id)
        
        if not current_user:
            current_app.logger.error(f"User with ID {user_id} not found in database")
            response = jsonify({
                'valid': False,
                'message': 'User not found',
                'identity': current_identity
            })
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Add more details about the user
        current_app.logger.info(f"User found: {current_user.email}, role: {current_user.role}")
        
        # Also get the raw JWT claims for debugging
        jwt_claims = get_jwt()
        current_app.logger.info(f"JWT claims: {jwt_claims}")
        
        response = jsonify({
            'valid': True,
            'user_id': current_user.id,
            'email': current_user.email,
            'role': current_user.role,
            'jwt_sub': current_identity  # Subject from token
        })
        response = _add_cors_headers_to_response(response)
        return response, 200
    
    except Exception as e:
        current_app.logger.error(f"Token debug error: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({
            'valid': False,
            'message': str(e)
        })
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/test-cors', methods=['GET'])
def test_cors():
    """Test endpoint to verify CORS is working"""
    try:
        current_app.logger.info("CORS test endpoint called")
        
        # Log request headers for debugging
        headers = dict(request.headers)
        current_app.logger.info(f"Request headers: {headers}")
        
        # Get origin from request
        origin = request.headers.get('Origin', 'http://localhost:8080')
        current_app.logger.info(f"Origin: {origin}")
        
        response = jsonify({
            'success': True,
            'message': 'CORS is working correctly',
            'time': datetime.utcnow().isoformat(),
            'origin': origin
        })
        
        # Explicitly set CORS headers for this response
        allowed_origins = ['http://localhost:3000', 'http://localhost:8080']
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8080'
            
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        
        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error in test-cors: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'message': 'Server error', 'error': str(e)}), 500

@api.route('/admin/mock-pending', methods=['GET'])
def get_mock_pending_students():
    """Mock endpoint to test pending students API without database queries"""
    try:
        current_app.logger.info("Mock pending students endpoint called")
        
        # Log request headers for debugging
        headers = dict(request.headers)
        current_app.logger.info(f"Request headers: {headers}")
        
        # Get origin from request
        origin = request.headers.get('Origin', 'http://localhost:8080')
        current_app.logger.info(f"Origin: {origin}")
        
        # Create some mock data
        mock_students = [
            {
                'id': 1,
                'user_id': 3,
                'roll_number': 'HMS0001',
                'name': 'John Doe',
                'email': 'john@example.com',
                'is_approved': False
            },
            {
                'id': 2,
                'user_id': 4,
                'roll_number': 'HMS0002',
                'name': 'Jane Smith',
                'email': 'jane@example.com',
                'is_approved': False
            }
        ]
        
        response = jsonify(mock_students)
        
        # Explicitly set CORS headers for this response
        allowed_origins = ['http://localhost:3000', 'http://localhost:8080']
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8080'
            
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        
        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error in mock-pending: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'message': 'Server error', 'error': str(e)}), 500

@api.route('/student/profile', methods=['GET'])
@jwt_required()
def get_student_profile():
    """Get the current student's profile"""
    try:
        # Get current user from token
        current_user = get_current_user()
        
        if not current_user:
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Get the student profile
        student = Student.query.filter_by(user_id=current_user.id).first()
        
        if not student:
            response = jsonify({'message': 'Student profile not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Create a response with all relevant data
        student_data = student.to_dict()
        student_data['name'] = current_user.name
        student_data['email'] = current_user.email
        
        # Add room details if available
        if student.room_id:
            room = Room.query.get(student.room_id)
            if room:
                student_data['room_number'] = room.room_number
                student_data['room_type'] = room.room_type
        
        response = jsonify(student_data)
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting student profile: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/student/profile', methods=['PUT', 'POST'])
@jwt_required()
def update_student_profile():
    """Update the current student's profile"""
    try:
        # Get current user from token
        current_user = get_current_user()
        
        if not current_user:
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Get the student profile
        student = Student.query.filter_by(user_id=current_user.id).first()
        
        if not student:
            response = jsonify({'message': 'Student profile not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Get data from request
        data = request.get_json()
        
        if not data:
            response = jsonify({'message': 'No data provided'})
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        # Check if this is an enrollment request submission
        is_enrollment_request = data.get('is_enrollment_requested', False)
        
        # If student is already approved and has a room, they can edit freely
        # If they're not approved yet, restrict editing after enrollment request
        can_edit_restricted_fields = (
            not student.is_enrollment_requested or 
            student.is_approved
        )
        
        # Update allowed fields
        if 'name' in data and data['name']:
            current_user.name = data['name']
            
        # For enrollment request or if student can edit freely
        if can_edit_restricted_fields:
            if 'course' in data:
                student.course = data['course']
                
            if 'contact_number' in data:
                student.contact_number = data['contact_number']
                
            if 'date_of_birth' in data and data['date_of_birth']:
                try:
                    student.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
                except ValueError:
                    response = jsonify({'message': 'Invalid date format for date_of_birth. Use YYYY-MM-DD'})
                    response = _add_cors_headers_to_response(response)
                    return response, 400
                    
            if 'semesters_requested' in data and data['semesters_requested']:
                try:
                    student.semesters_requested = int(data['semesters_requested'])
                except ValueError:
                    response = jsonify({'message': 'Invalid value for semesters_requested'})
                    response = _add_cors_headers_to_response(response)
                    return response, 400
        
        # Handle enrollment request submission
        if is_enrollment_request and not student.is_enrollment_requested:
            # Validate that required fields are filled
            if not student.course or not student.contact_number or not student.date_of_birth:
                response = jsonify({'message': 'Please complete all required profile fields before submitting enrollment request'})
                response = _add_cors_headers_to_response(response)
                return response, 400
                
            student.is_enrollment_requested = True
            current_app.logger.info(f"Student {current_user.email} submitted enrollment request")
        
        # Save changes
        db.session.commit()
        
        # Create a response with updated data
        student_data = student.to_dict()
        student_data['name'] = current_user.name
        student_data['email'] = current_user.email
        
        # Add room details if available
        if student.room_id:
            room = Room.query.get(student.room_id)
            if room:
                student_data['room_number'] = room.room_number
                student_data['room_type'] = room.room_type
        
        message = 'Enrollment request submitted successfully' if is_enrollment_request else 'Profile updated successfully'
        
        response = jsonify({
            'message': message,
            'student': student_data
        })
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating student profile: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/student/roommates', methods=['GET'])
@jwt_required()
def get_roommates():
    """Get students who share the same room as the current student"""
    try:
        # Get the room_id from query parameter
        room_id = request.args.get('room_id')
        
        if not room_id:
            response = jsonify({'message': 'Room ID is required'})
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        # Convert to integer
        try:
            room_id = int(room_id)
        except ValueError:
            response = jsonify({'message': 'Invalid room ID'})
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        # Get all students in the specified room
        students_in_room = db.session.query(
            Student, User
        ).join(
            User, Student.user_id == User.id
        ).filter(
            Student.room_id == room_id
        ).all()
        
        # Format the response
        result = []
        for student, user in students_in_room:
            result.append({
                'id': student.id,
                'name': user.name,
                'roll_number': student.roll_number,
                'profile_picture': student.profile_picture
            })
        
        response = jsonify(result)
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting roommates: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

# Fee Notification endpoints
@api.route('/fee-notifications', methods=['POST'])
@jwt_required()
def create_fee_notifications():
    # Ensure user is an admin
    current_user = get_current_user()
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if not data or 'student_ids' not in data or 'title' not in data or 'content' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    student_ids = data['student_ids']
    title = data['title']
    content = data['content']
    notification_type = data.get('notification_type', 'fee_payment')
    
    created_notifications = []
    
    try:
        for student_id in student_ids:
            # Verify the student exists
            student = Student.query.get(student_id)
            if not student:
                continue
                
            # Create notification
            notification = FeeNotification(
                student_id=student_id,
                title=title,
                content=content,
                notification_type=notification_type
            )
            
            db.session.add(notification)
            created_notifications.append(notification)
        
        db.session.commit()
        
        # Create a notice as well to ensure compatibility with current system
        notice = Notice(
            title=title,
            content=f"{content}\n\nThis is a fee payment notification sent to {len(created_notifications)} students."
        )
        db.session.add(notice)
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully sent {len(created_notifications)} notifications',
            'notifications': [n.to_dict() for n in created_notifications]
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating fee notifications: {str(e)}")
        return jsonify({'error': 'Failed to create notifications'}), 500

@api.route('/student/fee-notifications', methods=['GET'])
@jwt_required()
def get_student_fee_notifications():
    # This endpoint is for students to get their fee notifications
    
    try:
        # Get the student associated with the current user
        current_user = get_current_user()
        
        if not current_user:
            return jsonify({'error': 'Student record not found'}), 404
        
        # Get all fee notifications for this student
        student = Student.query.filter_by(user_id=current_user.id).first()
        
        if not student:
            return jsonify({'error': 'Student record not found'}), 404
        
        notifications = FeeNotification.query.filter_by(student_id=student.id)\
                                        .order_by(FeeNotification.created_at.desc())\
                                        .all()
        
        # Include viewed_in_dashboard flag in the response
        result = []
        for notification in notifications:
            notification_dict = notification.to_dict()
            # Check if this notification has been viewed in the dashboard
            notification_state = NotificationState.query.filter_by(
                user_id=current_user.id,
                notification_type='fee_notification',
                entity_id=notification.id
            ).first()
            notification_dict['viewed_in_dashboard'] = bool(notification_state and notification_state.is_viewed)
            result.append(notification_dict)
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching fee notifications: {str(e)}")
        return jsonify({'error': 'Failed to fetch notifications'}), 500

@api.route('/student/fee-notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    try:
        # Get the student associated with the current user
        current_user = get_current_user()
        
        if not current_user:
            return jsonify({'error': 'Student record not found'}), 404
        
        # Get the student record
        student = Student.query.filter_by(user_id=current_user.id).first()
        if not student:
            return jsonify({'error': 'Student record not found'}), 404
            
        # Get the notification and check if it belongs to this student
        notification = FeeNotification.query.get(notification_id)
        
        if not notification or notification.student_id != student.id:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Mark as read
        notification.is_read = True
        db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error marking notification as read: {str(e)}")
        return jsonify({'error': 'Failed to update notification'}), 500

@api.route('/student/fee-notifications/mark-viewed-in-dashboard', methods=['POST'])
@jwt_required()
def mark_fee_notifications_viewed_in_dashboard():
    """Mark all fee notifications as viewed in the dashboard for the current student"""
    try:
        current_user = get_current_user()
        
        if not current_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Get the student record
        student = Student.query.filter_by(user_id=current_user.id).first()
        if not student:
            return jsonify({'message': 'Student record not found'}), 404
        
        # Get all fee notifications for this student
        notifications = FeeNotification.query.filter_by(student_id=student.id).all()
        
        # Mark each notification as viewed in the dashboard
        for notification in notifications:
            # Check if a notification state already exists
            notification_state = NotificationState.query.filter_by(
                user_id=current_user.id,
                notification_type='fee_notification',
                entity_id=notification.id
            ).first()
            
            if notification_state:
                # Update existing state
                notification_state.is_viewed = True
                notification_state.viewed_at = datetime.utcnow()
            else:
                # Create new notification state
                notification_state = NotificationState(
                    user_id=current_user.id,
                    notification_type='fee_notification',
                    entity_id=notification.id,
                    is_viewed=True,
                    viewed_at=datetime.utcnow()
                )
                db.session.add(notification_state)
        
        db.session.commit()
        
        return jsonify({'message': 'Fee notifications marked as viewed in dashboard'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error marking fee notifications as viewed: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'message': 'Server error', 'error': str(e)}), 500

@api.route('/admin/fee-notifications', methods=['GET'])
@jwt_required()
def get_all_fee_notifications():
    # Ensure user is an admin
    current_user = get_current_user()
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        notifications = FeeNotification.query.order_by(FeeNotification.created_at.desc()).all()
        
        # Group by student for better admin view
        result = {}
        for notification in notifications:
            student = Student.query.get(notification.student_id)
            student_info = f"{student.roll_number} - {User.query.get(student.user_id).name}" if student else "Unknown Student"
            
            if student_info not in result:
                result[student_info] = []
            
            result[student_info].append(notification.to_dict())
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching all fee notifications: {str(e)}")
        return jsonify({'error': 'Failed to fetch notifications'}), 500

# Fee management endpoints
@api.route('/admin/fees', methods=['POST'])
@jwt_required()
def create_fee_type():
    """Create a new fee type and assign to students"""
    # Ensure user is an admin
    current_user = get_current_user()
    
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if not data or 'description' not in data or 'amount' not in data or 'student_ids' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    description = data['description']
    amount = data['amount']
    student_ids = data['student_ids']
    due_date = None
    
    if 'due_date' in data and data['due_date']:
        try:
            due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
            
    created_fees = []
    
    try:
        for student_id in student_ids:
            # Verify the student exists
            student = Student.query.get(student_id)
            if not student:
                continue
                
            # Create fee
            fee = Fee(
                student_id=student_id,
                description=description,
                amount=amount,
                status='Pending',
                due_date=due_date
            )
            
            db.session.add(fee)
            created_fees.append(fee)
        
        db.session.commit()
        
        # Create notifications for the students
        for student_id in student_ids:
            notification = FeeNotification(
                student_id=student_id,
                title=f"New Fee: {description}",
                content=f"A new fee of ₹{amount} has been added to your account for {description}. Please pay before the due date.",
                notification_type='fee_payment'
            )
            db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully created {len(created_fees)} fee records',
            'fees': [f.to_dict() for f in created_fees]
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating fees: {str(e)}")
        return jsonify({'error': 'Failed to create fees'}), 500

@api.route('/student/<int:student_id>', methods=['GET'])
@jwt_required()
def get_student_by_id(student_id):
    """Get student details by ID"""
    try:
        # Get the requesting user
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_role = claims.get('role', 'student')
        
        # Find the student
        student = Student.query.get(student_id)
        
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        
        # If not admin, only allow access to own profile
        if current_user_role != 'admin':
            # Get the current user's student record
            current_student = Student.query.filter_by(user_id=current_user_id).first()
            
            if not current_student or current_student.id != student_id:
                return jsonify({'message': 'Unauthorized to access this student profile'}), 403
        
        # Get the user details
        user = User.query.get(student.user_id)
        if not user:
            return jsonify({'message': 'User not found for this student'}), 404
        
        # Combine student and user data
        student_data = {
            'id': student.id,
            'user_id': student.user_id,
            'name': user.name,
            'email': user.email,
            'roll_number': student.roll_number,
            'profile_picture': student.profile_picture,
            'course': student.course,
            'join_date': student.join_date.strftime('%Y-%m-%d') if student.join_date else None,
            'room_number': student.room_number,
            'room_type': student.room_type,
            'room_id': student.room_id,
            'is_approved': student.is_approved,
            'contact_number': student.contact_number,
            'date_of_birth': student.date_of_birth.strftime('%Y-%m-%d') if student.date_of_birth else None,
            'semesters_requested': student.semesters_requested,
            'status': student.status
        }
        
        return jsonify(student_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting student by ID: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'message': 'Failed to get student details'}), 500

@api.route('/attendance/window/status', methods=['GET'])
def check_attendance_window_status():
    """Public endpoint to check if attendance window is open"""
    window = AttendanceWindow.query.order_by(AttendanceWindow.id.desc()).first()
    
    if not window or not window.is_open:
        return jsonify({'is_open': False}), 200
    
    return jsonify({'is_open': True}), 200

@api.route('/student/notifications', methods=['GET'])
@jwt_required()
def get_student_notifications():
    """Get notifications for the current student including approval status"""
    try:
        # Get current user from token
        current_user = get_current_user()
        
        if not current_user:
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Get the student profile
        student = Student.query.filter_by(user_id=current_user.id).first()
        
        if not student:
            response = jsonify({'message': 'Student profile not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Check for approval status changes
        notifications = []
        
        # Check if student was recently approved
        if student.is_approved and student.approval_date:
            # Check if approval was within the last 7 days
            approval_date = student.approval_date
            days_since_approval = (datetime.utcnow() - approval_date).days
            
            if days_since_approval <= 7:
                notifications.append({
                    'id': f"approval_{student.id}",
                    'type': 'approval',
                    'title': 'Enrollment Approved!',
                    'message': 'Congratulations! Your enrollment request has been approved. You now have full access to all hostel services.',
                    'created_at': approval_date.isoformat(),
                    'is_read': False,
                    'importance': 'high'
                })
        
        # Check if student was recently rejected
        if student.status == 'rejected':
            notifications.append({
                'id': f"rejection_{student.id}",
                'type': 'rejection',
                'title': 'Enrollment Request Rejected',
                'message': 'Your enrollment request has been rejected. You can update your profile and submit a new request.',
                'created_at': datetime.utcnow().isoformat(),
                'is_read': False,
                'importance': 'high'
            })
        
        response = jsonify({'notifications': notifications})
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting student notifications: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/student/notifications/<notification_id>/read', methods=['POST'])
@jwt_required()
def mark_student_notification_read(notification_id):
    """Mark a student notification as read"""
    try:
        # For now, we'll just acknowledge the read status
        # In a production system, you might store this in the database
        
        response = jsonify({'message': 'Notification marked as read'})
        response = _add_cors_headers_to_response(response)
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Error marking notification as read: {str(e)}")
        response = jsonify({'message': 'Server error', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

# Notification API endpoints

@api.route('/notifications/complaint-replies/count', methods=['GET'])
@jwt_required()
def get_unread_complaint_replies_count():
    """Get count of unread admin replies for a student"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'student':
        return jsonify({'count': 0}), 200
    
    try:
        unread_count = ComplaintNotification.query.filter_by(
            student_user_id=current_user.id,
            is_viewed=False
        ).count()
        
        return jsonify({'count': unread_count}), 200
    except Exception as e:
        current_app.logger.error(f"Error getting complaint reply count: {str(e)}")
        return jsonify({'count': 0}), 200

@api.route('/notifications/new-complaints/count', methods=['GET'])
@jwt_required()
def get_new_complaints_count():
    """Get count of new complaints for admin"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'count': 0}), 200
    
    try:
        # Get complaints that admin hasn't marked as viewed
        viewed_complaint_notifications = NotificationState.query.filter_by(
            user_id=current_user.id,
            notification_type='new_complaints',
            is_viewed=True
        ).all()
        
        viewed_complaint_ids = {n.entity_id for n in viewed_complaint_notifications}
        
        # Count total complaints not in viewed list
        total_complaints = Complaint.query.count()
        new_count = total_complaints - len(viewed_complaint_ids)
        
        return jsonify({'count': max(0, new_count)}), 200
    except Exception as e:
        current_app.logger.error(f"Error getting new complaints count: {str(e)}")
        return jsonify({'count': 0}), 200

@api.route('/notifications/new-notices/count', methods=['GET'])
@jwt_required()
def get_new_notices_count():
    """Get count of new notices for a student"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'student':
        return jsonify({'count': 0}), 200
    
    try:
        unread_count = NoticeNotification.query.filter_by(
            student_user_id=current_user.id,
            is_viewed=False
        ).count()
        
        return jsonify({'count': unread_count}), 200
    except Exception as e:
        current_app.logger.error(f"Error getting new notices count: {str(e)}")
        return jsonify({'count': 0}), 200

@api.route('/notifications/complaint-replies/mark-viewed', methods=['POST'])
@jwt_required()
def mark_complaint_replies_viewed():
    """Mark all complaint reply notifications as viewed for a student"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'student':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        # Mark all complaint notifications as viewed
        ComplaintNotification.query.filter_by(
            student_user_id=current_user.id,
            is_viewed=False
        ).update({
            'is_viewed': True,
            'viewed_at': datetime.utcnow()
        })
        
        db.session.commit()
        
        return jsonify({'message': 'Complaint reply notifications marked as viewed'}), 200
    except Exception as e:
        current_app.logger.error(f"Error marking complaint replies as viewed: {str(e)}")
        return jsonify({'message': 'Failed to mark notifications as viewed'}), 500

@api.route('/notifications/new-complaints/mark-viewed', methods=['POST'])
@jwt_required()
def mark_new_complaints_viewed():
    """Mark all new complaints as viewed for admin"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        # Get all current complaint IDs
        complaint_ids = [c.id for c in Complaint.query.all()]
        
        # Mark all as viewed by creating notification states
        for complaint_id in complaint_ids:
            # Check if already exists
            existing = NotificationState.query.filter_by(
                user_id=current_user.id,
                notification_type='new_complaints',
                entity_id=complaint_id
            ).first()
            
            if not existing:
                notification_state = NotificationState(
                    user_id=current_user.id,
                    notification_type='new_complaints',
                    entity_id=complaint_id,
                    is_viewed=True,
                    viewed_at=datetime.utcnow()
                )
                db.session.add(notification_state)
        
        db.session.commit()
        
        return jsonify({'message': 'New complaint notifications marked as viewed'}), 200
    except Exception as e:
        current_app.logger.error(f"Error marking new complaints as viewed: {str(e)}")
        return jsonify({'message': 'Failed to mark notifications as viewed'}), 500

@api.route('/notifications/new-notices/mark-viewed', methods=['POST'])
@jwt_required()
def mark_new_notices_viewed():
    """Mark all notice notifications as viewed for a student"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'student':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        # Mark all notice notifications as viewed
        NoticeNotification.query.filter_by(
            student_user_id=current_user.id,
            is_viewed=False
        ).update({
            'is_viewed': True,
            'viewed_at': datetime.utcnow()
        })
        
        db.session.commit()
        
        return jsonify({'message': 'Notice notifications marked as viewed'}), 200
    except Exception as e:
        current_app.logger.error(f"Error marking notices as viewed: {str(e)}")
        return jsonify({'message': 'Failed to mark notifications as viewed'}), 500

# Configuration for file uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'profile_pictures')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_dir():
    """Ensure upload directory exists"""
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@api.route('/student/upload-profile-picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """Upload a profile picture for the current student"""
    try:
        current_user = get_current_user()
        
        if not current_user:
            response = jsonify({'message': 'User not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Get the student profile
        student = Student.query.filter_by(user_id=current_user.id).first()
        
        if not student:
            response = jsonify({'message': 'Student profile not found'})
            response = _add_cors_headers_to_response(response)
            return response, 404
        
        # Check if the post request has the file part
        if 'profile_picture' not in request.files:
            response = jsonify({'message': 'No file part'})
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        file = request.files['profile_picture']
        
        # If user does not select file, browser also submits an empty part without filename
        if file.filename == '':
            response = jsonify({'message': 'No selected file'})
            response = _add_cors_headers_to_response(response)
            return response, 400
        
        if file and allowed_file(file.filename):
            # Ensure upload directory exists
            ensure_upload_dir()
            
            # Store old profile picture path for cleanup
            old_profile_picture = student.profile_picture
            
            # Generate a unique filename
            file_extension = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            filename = secure_filename(unique_filename)
            
            # Save the file
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            # Update student's profile picture URL - store without /api prefix
            profile_picture_url = f"uploads/profile_pictures/{filename}"
            student.profile_picture = profile_picture_url
            
            # Commit the database changes
            db.session.commit()
            
            # Delete old profile picture file if it exists and is different
            if old_profile_picture and old_profile_picture != profile_picture_url:
                try:
                    # Extract filename from the old URL
                    old_filename = old_profile_picture.split('/')[-1]
                    old_filepath = os.path.join(UPLOAD_FOLDER, old_filename)
                    if os.path.exists(old_filepath):
                        os.remove(old_filepath)
                        current_app.logger.info(f"Deleted old profile picture: {old_filename}")
                except Exception as e:
                    current_app.logger.warning(f"Could not delete old profile picture: {str(e)}")
            
            current_app.logger.info(f"Profile picture uploaded successfully for student {student.id}: {filename}")
            
            response = jsonify({
                'message': 'Profile picture uploaded successfully',
                'profile_picture_url': profile_picture_url,
                'filename': filename
            })
            response = _add_cors_headers_to_response(response)
            return response, 200
        
        response = jsonify({'message': 'Invalid file type. Only PNG, JPG, JPEG, and GIF files are allowed.'})
        response = _add_cors_headers_to_response(response)
        return response, 400
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error uploading profile picture: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        response = jsonify({'message': 'Failed to upload profile picture', 'error': str(e)})
        response = _add_cors_headers_to_response(response)
        return response, 500

@api.route('/uploads/profile_pictures/<filename>')
def uploaded_file(filename):
    """Serve uploaded profile pictures"""
    try:
        # Security: Only allow access to files in the profile_pictures directory
        if not os.path.exists(UPLOAD_FOLDER):
            ensure_upload_dir()
            
        # Make sure the file exists and is in the correct directory
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            current_app.logger.warning(f"Profile picture not found: {filename}")
            return jsonify({'message': 'File not found'}), 404
            
        # Add CORS headers to the response
        response = send_from_directory(UPLOAD_FOLDER, filename)
        
        # Allow access from any origin for profile pictures
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        
        # Enable caching for profile pictures
        response.headers.add('Cache-Control', 'public, max-age=31536000')  # Cache for 1 year
        response.headers.add('Expires', datetime.now() + timedelta(days=365))
        
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error serving profile picture: {str(e)}")
        return jsonify({'message': 'Error serving file'}), 500

# Leave Request Management Routes

@api.route('/admin/students/<int:student_id>/leave-requests', methods=['GET'])
@jwt_required()
def get_student_leave_requests(student_id):
    """Get all leave requests for a specific student"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        student = Student.query.get_or_404(student_id)
        leave_requests = LeaveRequest.query.filter_by(student_id=student_id).order_by(LeaveRequest.created_at.desc()).all()
        
        return jsonify([request.to_dict() for request in leave_requests]), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching leave requests: {str(e)}")
        return jsonify({'message': 'Failed to fetch leave requests'}), 500

@api.route('/admin/leave-requests/<int:request_id>/grant', methods=['POST'])
@jwt_required()
def grant_leave_request(request_id):
    """Grant a leave request"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    try:
        leave_request = LeaveRequest.query.get_or_404(request_id)
        
        if leave_request.status != 'Pending':
            return jsonify({'message': 'Leave request has already been processed'}), 400
        
        # Update the leave request
        leave_request.status = 'Granted'
        leave_request.processed_at = datetime.utcnow()
        leave_request.processed_by = current_user.id
        
        db.session.commit()
        
        current_app.logger.info(f"Admin {current_user.email} granted leave request {request_id}")
        
        return jsonify({
            'message': 'Leave request granted successfully',
            'leave_request': leave_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error granting leave request: {str(e)}")
        return jsonify({'message': 'Failed to grant leave request'}), 500

@api.route('/admin/leave-requests/<int:request_id>/deny', methods=['POST'])
@jwt_required()
def deny_leave_request(request_id):
    """Deny a leave request with a reason"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    if not data or 'reason' not in data or not data['reason'].strip():
        return jsonify({'message': 'Denial reason is required'}), 400
    
    try:
        leave_request = LeaveRequest.query.get_or_404(request_id)
        
        if leave_request.status != 'Pending':
            return jsonify({'message': 'Leave request has already been processed'}), 400
        
        # Update the leave request
        leave_request.status = 'Denied'
        leave_request.processed_at = datetime.utcnow()
        leave_request.processed_by = current_user.id
        leave_request.admin_response = data['reason']
        
        db.session.commit()
        
        current_app.logger.info(f"Admin {current_user.email} denied leave request {request_id} with reason: {data['reason']}")
        
        return jsonify({
            'message': 'Leave request denied successfully',
            'leave_request': leave_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error denying leave request: {str(e)}")
        return jsonify({'message': 'Failed to deny leave request'}), 500

@api.route('/admin/fingerprint/sensor/test-port', methods=['POST'])
@jwt_required()
def test_specific_port():
    """Test fingerprint sensor connection on a specific port"""
    current_user = User.query.get(get_jwt_identity())
    
    if current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    if not data or 'port' not in data:
        return jsonify({
            'success': False,
            'message': 'Port parameter is required',
            'example': {'port': 'COM3', 'baudrate': 57600}
        }), 400
    
    port = data['port']
    baudrate = data.get('baudrate', 57600)
    
    try:
        # Test the specific port
        success, message = fingerprint_service.test_port_connection(port, baudrate)
        
        if success:
            # If successful, configure the service to use this port
            fingerprint_service.set_manual_port(port, baudrate)
        
        return jsonify({
            'success': success,
            'message': message,
            'port': port,
            'baudrate': baudrate,
            'sensor_info': fingerprint_service.get_sensor_info() if success else None
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error testing port {port}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Port test failed: {str(e)}',
            'port': port,
            'baudrate': baudrate
        }), 200
