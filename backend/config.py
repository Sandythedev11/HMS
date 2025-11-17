import os

class Config:
    # Secret key for session management and JWT
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    # SQLite configuration (development)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///hostel.db'
    
    # To enable MongoDB, uncomment the following line and set the connection string
    # MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/hostel'
    
    # To switch between SQLite and MongoDB, change the USE_MONGODB flag
    USE_MONGODB = False
    
    # SQL Alchemy settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key'
    
    # Mail settings
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    
    # For testing, you can set these directly (but using environment variables is more secure)
    # MAIL_USERNAME = 'your-email@gmail.com'
    # MAIL_PASSWORD = 'your-app-password'
    # MAIL_DEFAULT_SENDER = 'HMS <your-email@gmail.com>' 