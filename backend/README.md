# Hostel Management System Backend

This is the backend for the Hostel Management System, built with Flask and SQLAlchemy.

## Features

- User authentication with JWT and OTP verification
- Room management
- Complaint management
- Fee payment
- Attendance tracking
- Notice board
- Feedback system
- Admin dashboard

## Database Support

The backend currently uses SQLite for development, but can be easily switched to MongoDB for production.

## Setup Instructions

1. Create a virtual environment
```
python -m venv venv
```

2. Activate the virtual environment
```
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies
```
pip install -r requirements.txt
```

4. Configure Email Settings

Create a `.env` file in the backend directory with the following content:
```
# Flask application settings
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

# Database settings
DATABASE_URL=sqlite:///hostel.db

# Email settings (Gmail)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=HMS <your-email@gmail.com>
```

**Note for Gmail users:** You need to use an App Password, not your regular password
To create an App Password:
1. Enable 2-Step Verification on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Select "Other" from the dropdown, give it a name (e.g., "HMS Flask App")
4. Click "Generate" and use the 16-character password

5. Run the application
```
python app.py
```

## API Endpoints

### Authentication
- POST /api/register - Register a new user (initiates OTP verification)
- POST /api/verify-otp - Verify OTP and complete registration
- POST /api/resend-otp - Resend OTP for verification
- POST /api/login - Login and get a JWT token

### Rooms
- GET /api/rooms - Get all rooms
- POST /api/rooms - Create a room (admin only)
- PUT /api/rooms/:id - Update a room (admin only)

### Complaints
- GET /api/complaints - Get complaints
- POST /api/complaints - Create a complaint
- PUT /api/complaints/:id - Update a complaint status (admin only)

### Fees
- GET /api/fees - Get fee details
- POST /api/fees - Create a fee record (admin only)
- POST /api/fees/:id/pay - Pay a fee

### Notices
- GET /api/notices - Get all notices
- POST /api/notices - Create a notice (admin only)

### Feedback
- GET /api/feedback - Get feedback
- POST /api/feedback - Submit feedback

### Attendance
- GET /api/attendance - Get attendance records
- POST /api/attendance - Mark attendance (admin only)

## Switching to MongoDB

To switch to MongoDB:
1. Install pymongo
2. Set the `USE_MONGODB` flag to `True` in config.py
3. Set your MongoDB connection string in config.py or through environment variable `MONGO_URI` 