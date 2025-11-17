# 🏨 Hostel Management System (HMS)

<img width="1920" height="1020" alt="Screenshot 2025-11-17 222817" src="https://github.com/user-attachments/assets/f1d8de04-6591-41e1-976c-9006af8509e4" />
<img width="1920" height="1020" alt="Screenshot 2025-11-17 222904" src="https://github.com/user-attachments/assets/bf21ef8a-34c2-4891-9fe6-c615b0f263bb" />
<img width="1920" height="1020" alt="Screenshot 2025-11-17 222921" src="https://github.com/user-attachments/assets/ec187a1e-0c4e-4943-b746-177d8cc534b2" />
<img width="1920" height="1020" alt="Screenshot 2025-11-17 223100" src="https://github.com/user-attachments/assets/19c094b0-be3e-48bd-99c0-369b95d022d7" />
<img width="1920" height="1020" alt="Screenshot 2025-11-17 223120" src="https://github.com/user-attachments/assets/63b534e5-c209-43df-8e40-2f04daef3478" />
<img width="1920" height="1020" alt="Screenshot 2025-11-17 223328" src="https://github.com/user-attachments/assets/342f674d-ac74-4de1-a05f-e42f9c356fd0" />
<img width="1920" height="1020" alt="Screenshot 2025-11-17 223339" src="https://github.com/user-attachments/assets/b118cc46-d860-431d-8d86-d0e81bab9a4f" />



<div align="center">

![HMS Banner](https://img.shields.io/badge/HMS-Hostel_Management_System-blue?style=for-the-badge)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-000000?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A comprehensive, modern web application for seamless hostel administration and student management**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage) • [API Documentation](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

The **Hostel Management System** is a full-stack web application designed to streamline hostel operations, from student enrollment and room allocation to attendance tracking and fee management. Built with modern technologies, HMS provides an intuitive interface for both administrators and students, ensuring efficient hostel management with real-time updates and secure authentication.

### 🎯 Key Highlights

- **🔐 Secure Authentication**: JWT-based authentication with OTP verification via email
- **👥 Role-Based Access**: Separate dashboards and permissions for admins and students
- **📱 Responsive Design**: Beautiful, mobile-friendly UI built with Tailwind CSS and shadcn/ui
- **🔄 Real-Time Updates**: Powered by React Query for efficient data synchronization
- **📊 Comprehensive Dashboard**: Analytics and insights for administrators
- **🎨 Modern UI/UX**: Smooth animations and intuitive navigation

---

## ✨ Features

### 👨‍💼 Admin Features

- **📝 Student Management**
  - Approve/reject student registrations
  - View and manage student profiles
  - Track enrollment status and history
  - Bulk operations for student management

- **🏠 Room Management**
  - Create and manage room allocations
  - Track room occupancy and availability
  - Assign/reassign students to rooms
  - View room-wise student distribution

- **💰 Fee Management**
  - Monitor fee payment status
  - Generate payment reports
  - Send payment reminders
  - Track payment history

- **📢 Notice Board**
  - Post important announcements
  - Schedule notices for future dates
  - Manage notice visibility

- **📊 Attendance Tracking**
  - Mark daily attendance
  - View attendance reports
  - Export attendance data
  - Fingerprint integration support

- **💬 Complaint Management**
  - Review and respond to student complaints
  - Track complaint resolution status
  - Categorize complaints by type

- **⭐ Feedback System**
  - Collect student feedback
  - Analyze satisfaction metrics
  - Generate feedback reports

### 👨‍🎓 Student Features

- **📱 Personal Dashboard**
  - View profile information
  - Check enrollment status
  - Access quick actions

- **🏠 Room Information**
  - View assigned room details
  - Check roommate information
  - Request room changes

- **💳 Fee Payment**
  - View fee structure
  - Make online payments
  - Download payment receipts
  - Track payment history

- **📢 Notices**
  - View hostel announcements
  - Filter notices by category
  - Receive important updates

- **📝 Complaints**
  - Submit complaints
  - Track complaint status
  - Receive resolution updates

- **⭐ Feedback**
  - Submit hostel feedback
  - Rate facilities and services
  - Suggest improvements

- **📊 Attendance**
  - View attendance records
  - Check attendance percentage
  - Fingerprint-based marking

### 🔐 Authentication & Security

- **Email-based OTP verification**
- **JWT token authentication**
- **Password reset functionality**
- **Secure session management**
- **Role-based access control**

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI Framework |
| **TypeScript** | 5.5.3 | Type Safety |
| **Vite** | 5.4.1 | Build Tool |
| **React Router** | 6.26.2 | Routing |
| **TanStack Query** | 5.56.2 | Data Fetching |
| **Tailwind CSS** | 3.4.17 | Styling |
| **shadcn/ui** | Latest | UI Components |
| **Axios** | 1.9.0 | HTTP Client |
| **React Hook Form** | 7.53.0 | Form Management |
| **Zod** | 3.23.8 | Schema Validation |
| **Lucide React** | 0.462.0 | Icons |
| **Recharts** | 2.12.7 | Data Visualization |
| **jsPDF** | Latest | PDF Generation |
| **html2canvas** | 1.4.1 | Screenshot Capture |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Flask** | 2.3.3 | Web Framework |
| **Flask-SQLAlchemy** | 3.1.1 | ORM |
| **Flask-JWT-Extended** | 4.5.3 | JWT Authentication |
| **Flask-CORS** | 4.0.0 | CORS Handling |
| **Flask-Mail** | 0.9.1 | Email Service |
| **PyMongo** | 4.5.0 | MongoDB Driver |
| **Werkzeug** | 2.3.7 | WSGI Utilities |
| **Gunicorn** | 21.2.0 | WSGI Server |
| **pyfingerprint** | 1.5 | Fingerprint Integration |
| **pyserial** | 3.5 | Serial Communication |

### Database

- **SQLite** (Development)
- **MongoDB** (Production-ready)

---

## 🚀 Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **npm** or **yarn**
- **Git**

### 📦 Clone the Repository

```bash
git clone https://github.com/Sandythedev11/HMS.git
cd HMS
```

### 🔧 Backend Setup

1. **Navigate to the backend directory:**

```bash
cd backend
```

2. **Create a virtual environment:**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies:**

```bash
pip install -r requirements.txt
```

4. **Configure environment variables:**

Create a `.env` file in the `backend` directory:

```env
# Flask Configuration
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET_KEY=your-jwt-secret-key-change-this
FLASK_ENV=development

# Database Configuration
DATABASE_URL=sqlite:///hostel.db
USE_MONGODB=False
MONGO_URI=mongodb://localhost:27017/hostel_db

# Email Configuration (Gmail)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=HMS <your-email@gmail.com>
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True

# Application Settings
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
```

> **📧 Gmail Setup:** To use Gmail for OTP emails:
> 1. Enable 2-Step Verification on your Google account
> 2. Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
> 3. Use the 16-character app password in `MAIL_PASSWORD`

5. **Initialize the database:**

```bash
# Run migrations
chmod +x run_migrations.sh
./run_migrations.sh

# Or manually
python migrate_db.py
```

6. **Start the backend server:**

```bash
python app.py
```

The backend will run on `http://localhost:5000`

### 🎨 Frontend Setup

1. **Navigate to the frontend directory:**

```bash
cd frontend
```

2. **Install dependencies:**

```bash
npm install
# or
yarn install
```

3. **Configure environment variables (optional):**

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000
```

4. **Start the development server:**

```bash
npm run dev
# or
yarn dev
```

The frontend will run on `http://localhost:8080`

---

## 🎮 Usage

### 🔑 Default Credentials

After setting up the system, you can create admin and student accounts:

**Admin Account:**
- Register through the admin registration endpoint
- Or use the database seeder to create default admin

**Student Account:**
- Register through the web interface
- Complete OTP verification
- Wait for admin approval

### 📱 Student Enrollment Flow

1. **Registration** → Student registers with email
2. **OTP Verification** → Verify email with OTP
3. **Complete Profile** → Fill in personal details
4. **Submit Enrollment** → Upload required documents
5. **Pending Approval** → Wait for admin review
6. **Approved/Rejected** → Receive enrollment decision
7. **Access Dashboard** → Full access after approval

### 👨‍💼 Admin Workflow

1. **Login** → Access admin dashboard
2. **Review Pending Students** → Approve/reject enrollments
3. **Manage Rooms** → Allocate rooms to students
4. **Post Notices** → Communicate with students
5. **Track Attendance** → Mark daily attendance
6. **Monitor Fees** → Track payment status
7. **Handle Complaints** → Respond to student issues

---

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/register
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "role": "student"
}
```

#### Verify OTP
```http
POST /api/verify-otp
Content-Type: application/json

{
  "email": "student@example.com",
  "otp": "123456"
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "SecurePass123"
}
```

#### Resend OTP
```http
POST /api/resend-otp
Content-Type: application/json

{
  "email": "student@example.com"
}
```

### Student Endpoints

#### Get Student Profile
```http
GET /api/student/profile
Authorization: Bearer <jwt_token>
```

#### Update Profile
```http
PUT /api/student/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "phone": "1234567890",
  "address": "123 Main St",
  "emergency_contact": "9876543210"
}
```

### Admin Endpoints

#### Get Pending Students
```http
GET /api/admin/pending-students
Authorization: Bearer <jwt_token>
```

#### Approve Student
```http
POST /api/admin/approve-student/:id
Authorization: Bearer <jwt_token>
```

#### Get All Rooms
```http
GET /api/rooms
Authorization: Bearer <jwt_token>
```

#### Create Room
```http
POST /api/rooms
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "room_number": "101",
  "capacity": 4,
  "floor": 1,
  "type": "shared"
}
```

### Common Endpoints

#### Get Notices
```http
GET /api/notices
Authorization: Bearer <jwt_token>
```

#### Submit Complaint
```http
POST /api/complaints
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "AC not working",
  "description": "The AC in room 101 is not cooling",
  "category": "maintenance"
}
```

#### Submit Feedback
```http
POST /api/feedback
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "rating": 4,
  "comment": "Great hostel facilities",
  "category": "general"
}
```

---

## 🏗️ Project Structure

```
HMS/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── AppHeader.tsx
│   │   │   ├── AppSidebar.tsx
│   │   │   └── StudentRouteGuard.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── ...
│   │   ├── utils/          # Utility functions
│   │   │   ├── api.ts      # API client
│   │   │   ├── auth.ts     # Auth helpers
│   │   │   └── notifications.ts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── public/             # Static assets
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                 # Flask backend application
│   ├── app/
│   │   ├── __init__.py     # App factory
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   ├── migrations/         # Database migrations
│   ├── uploads/            # File uploads
│   ├── logs/               # Application logs
│   ├── app.py              # Application entry point
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables
│
├── README.md               # This file
└── .gitignore             # Git ignore rules
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Test authentication
python test_endpoints.py

# Test enrollment flow
python test_enrollment_flow.py

# Test admin operations
python test_admin_students_api.py

# Test fingerprint integration
python test_fingerprint_import.py
```

### Frontend Tests

```bash
cd frontend

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🚢 Deployment

### Backend Deployment

#### Using Gunicorn

```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

#### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Frontend Deployment

```bash
cd frontend
npm run build

# Deploy the 'dist' folder to your hosting service
# (Vercel, Netlify, AWS S3, etc.)
```

---

## 🔧 Configuration

### Switching to MongoDB

To use MongoDB instead of SQLite:

1. Install MongoDB locally or use MongoDB Atlas
2. Update `.env`:
```env
USE_MONGODB=True
MONGO_URI=mongodb://localhost:27017/hostel_db
# or for Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/hostel_db
```
3. Restart the backend server

### Fingerprint Integration

The system supports fingerprint-based attendance:

1. Connect your fingerprint device
2. Install required drivers
3. Configure device settings in `config.py`
4. Test connection: `python detect_fingerprint_device.py`

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Coding Standards

- Follow PEP 8 for Python code
- Use ESLint rules for TypeScript/React
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation for new features

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Sandythedev11**

- GitHub: [@Sandythedev11](https://github.com/Sandythedev11)
- Project Link: [https://github.com/Sandythedev11/HMS](https://github.com/Sandythedev11/HMS)

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Flask](https://flask.palletsprojects.com/) for the robust backend framework
- [React](https://reactjs.org/) for the powerful frontend library
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- All contributors and supporters of this project

---

## 📞 Support

If you encounter any issues or have questions:

- 🐛 [Report a Bug](https://github.com/Sandythedev11/HMS/issues)
- 💡 [Request a Feature](https://github.com/Sandythedev11/HMS/issues)
- 📧 Contact: [Create an issue](https://github.com/Sandythedev11/HMS/issues)

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by Sandythedev11

</div>



