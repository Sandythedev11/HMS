from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from config import Config
import logging
from logging.handlers import RotatingFileHandler
import os

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configure JWT
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    
    # Configure CORS to allow requests from frontend origins
    CORS(app, 
         resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:8080"]}},
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
    
    # Register blueprints
    from app.routes import api
    app.register_blueprint(api)
    
    # Configure static file serving for profile pictures
    upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        create_default_admin(app)
    
    # Configure logging
    if not app.debug and not app.testing:
        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.mkdir('logs')
            
        # Configure file handler for logging
        file_handler = RotatingFileHandler('logs/hostel_management.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        
        # Configure console handler for logging
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s'
        ))
        
        # Add handlers to app logger
        app.logger.addHandler(file_handler)
        app.logger.addHandler(console_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Hostel Management System startup')
    else:
        # For development mode, configure basic logging
        app.logger.setLevel(logging.INFO)
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s'
        ))
        app.logger.addHandler(console_handler)
        app.logger.info('Hostel Management System startup (development mode)')
    
    return app

def create_default_admin(app):
    """Create a default admin account if it doesn't exist"""
    from app.models import User
    
    admin_email = "sandeepgouda209@gmail.com"
    admin_password = "Admin@123"
    
    # Check if admin already exists
    admin = User.query.filter_by(email=admin_email).first()
    if admin is None:
        app.logger.info(f"Creating default admin account with email: {admin_email}")
        admin = User(
            name="Admin",
            email=admin_email,
            role="admin"
        )
        admin.set_password(admin_password)
        db.session.add(admin)
        db.session.commit()
        
        # Verify the admin was created successfully
        created_admin = User.query.filter_by(email=admin_email).first()
        if created_admin and created_admin.check_password(admin_password):
            app.logger.info("Default admin account created and verified successfully")
        else:
            app.logger.error("Failed to verify admin account credentials after creation")
    else:
        # Update the admin password to ensure it's correct
        app.logger.info(f"Admin account already exists, updating password to ensure it's correct")
        admin.set_password(admin_password)
        db.session.commit()
        
        # Verify the admin password was updated successfully
        if admin.check_password(admin_password):
            app.logger.info("Admin password updated and verified successfully")
        else:
            app.logger.error("Failed to verify admin password after update") 