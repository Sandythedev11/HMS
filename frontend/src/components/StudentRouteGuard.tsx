import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../utils/api';

interface StudentProfile {
  id: number;
  user_id: number;
  roll_number: string;
  name: string;
  email: string;
  course?: string;
  contact_number?: string;
  date_of_birth?: string;
  semesters_requested?: number;
  is_approved: boolean;
  is_enrollment_requested: boolean;
  status?: 'active' | 'removed' | 'rejected';
}

interface StudentRouteGuardProps {
  children: React.ReactNode;
}

const StudentRouteGuard: React.FC<StudentRouteGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkStudentStatus = async () => {
      try {
        setLoading(true);
        const response = await api.get('/student/profile');
        setStudent(response.data);
      } catch (err: any) {
        console.error('Failed to fetch student profile:', err);
        setError('Failed to load student profile');
      } finally {
        setLoading(false);
      }
    };

    checkStudentStatus();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Checking enrollment status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !student) {
    return <Navigate to="/login" replace />;
  }

  // Check if profile is complete
  const isProfileComplete = Boolean(
    student.course && 
    student.contact_number && 
    student.date_of_birth
  );

  // Current path
  const currentPath = location.pathname;

  // If student status is rejected and trying to access dashboard
  if (student.status === 'rejected' && currentPath.includes('/student/dashboard')) {
    return <Navigate to="/student/enrollment-rejected" replace />;
  }

  // If profile is incomplete and trying to access dashboard or other features
  if (!isProfileComplete && currentPath !== '/student/complete-profile') {
    return <Navigate to="/student/complete-profile" replace />;
  }

  // If profile is complete but no enrollment request submitted
  if (isProfileComplete && !student.is_enrollment_requested && currentPath !== '/student/submit-enrollment') {
    return <Navigate to="/student/submit-enrollment" replace />;
  }

  // If enrollment request is pending approval
  if (student.is_enrollment_requested && !student.is_approved && currentPath !== '/student/pending-approval') {
    return <Navigate to="/student/pending-approval" replace />;
  }

  // If not fully approved, restrict access to dashboard and other features
  if (!student.is_approved && currentPath.includes('/student/dashboard')) {
    // Redirect based on current status
    if (!isProfileComplete) {
      return <Navigate to="/student/complete-profile" replace />;
    }
    if (!student.is_enrollment_requested) {
      return <Navigate to="/student/submit-enrollment" replace />;
    }
    return <Navigate to="/student/pending-approval" replace />;
  }

  // If trying to access intermediate pages when already approved
  const intermediatePages = [
    '/student/complete-profile',
    '/student/submit-enrollment', 
    '/student/pending-approval'
  ];
  if (student.is_approved && intermediatePages.includes(currentPath)) {
    return <Navigate to="/student/dashboard" replace />;
  }

  // If all conditions are met, allow access
  return <>{children}</>;
};

export default StudentRouteGuard; 