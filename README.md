# Hostel Management System

A web application for managing hostel student registrations, room allocations, and student profiles.

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run database migrations:
   ```
   chmod +x run_migrations.sh
   ./run_migrations.sh
   ```

5. Start the backend server:
   ```
   python run.py
   ```
   The backend should start on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   The frontend should start on http://localhost:8080

## Features

- Student registration and profile management
- Admin approval for student registrations
- Room allocation
- Student profile editing with database storage
- Admin dashboard for student management

## Authentication

- Students: Can register, update their profiles, view room details
- Admins: Can approve/reject students, allocate rooms, manage student records 