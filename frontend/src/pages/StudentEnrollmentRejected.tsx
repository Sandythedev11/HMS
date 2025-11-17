import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, RefreshCw, Edit, LogOut, AlertTriangle, User, Book, Phone, Calendar } from 'lucide-react';
import api from '../utils/api';
import { logout } from '../utils/auth';

const StudentEnrollmentRejected: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/student/profile');
        setStudent(response.data);
      } catch (err) {
        console.error('Failed to fetch student data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  const handleUpdateProfile = () => {
    navigate('/student/complete-profile');
  };

  const handleLogout = () => {
    logout(navigate);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-600">Enrollment Request Rejected</h1>
            <p className="text-gray-600 mt-2">Your enrollment request needs attention</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md transition"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                <X className="w-4 h-4" />
              </div>
              <span className="text-red-600 font-medium">Request Rejected</span>
            </div>
            <div className="h-1 w-16 bg-red-200 rounded"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-gray-500">Update & Resubmit</span>
            </div>
            <div className="h-1 w-16 bg-gray-200 rounded"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-gray-500">Wait for Approval</span>
            </div>
            <div className="h-1 w-16 bg-gray-200 rounded"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <span className="text-gray-500">Access Dashboard</span>
            </div>
          </div>
        </div>

        {/* Main Rejection Card */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-100 mb-6">
          <div className="text-center mb-8">
            <div className="relative">
              <X className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-700 mb-2">Request Rejected</h2>
            <p className="text-red-600 max-w-md mx-auto">
              Unfortunately, your enrollment request has been rejected. Please review the information below and update your profile to resubmit.
            </p>
          </div>

          {/* Rejection Notice */}
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 mb-2">Rejection Reason</h3>
                <p className="text-sm text-red-600">
                  {student?.rejection_reason || 'Your enrollment request did not meet the current requirements. Please review your information and ensure all details are accurate and complete.'}
                </p>
              </div>
            </div>
          </div>

          {/* Current Profile Information */}
          {student && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-4">Current Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{student.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <User className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Student ID</p>
                    <p className="font-medium">{student.roll_number}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Book className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Course</p>
                    <p className="font-medium">{student.course || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{student.contact_number || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-medium">{student.date_of_birth || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <User className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{student.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleUpdateProfile}
              className="bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 transition flex items-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Update Profile & Resubmit
            </button>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What to do next */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h3 className="font-medium text-gray-800 mb-4 flex items-center">
              <RefreshCw className="h-5 w-5 text-blue-500 mr-2" />
              What to do next?
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                Review the rejection reason carefully
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                Update your profile with correct information
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                Ensure all required fields are completed
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                Resubmit your enrollment request
              </li>
            </ul>
          </div>

          {/* Common Issues */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h3 className="font-medium text-orange-800 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              Common Issues
            </h3>
            <div className="text-sm text-orange-600 space-y-2">
              <p>• Incomplete or missing contact information</p>
              <p>• Invalid course selection</p>
              <p>• Incorrect date of birth format</p>
              <p>• Missing required documentation</p>
              <p>• Duplicate enrollment requests</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentEnrollmentRejected; 