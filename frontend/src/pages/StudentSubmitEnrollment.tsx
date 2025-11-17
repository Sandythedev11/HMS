import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Send, User, Book, Phone, Calendar, Clock, LogOut } from 'lucide-react';
import api from '../utils/api';
import { logout } from '../utils/auth';

const StudentSubmitEnrollment: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const response = await api.get('/student/profile');
        setStudent(response.data);
      } catch (err) {
        console.error('Failed to fetch student data:', err);
        setError('Failed to load profile data');
      }
    };

    fetchStudentData();
  }, []);

  const handleSubmitEnrollment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Submit enrollment request
      await api.put('/student/profile', {
        is_enrollment_requested: true
      });

      // Navigate to pending approval page
      navigate('/student/pending-approval');
    } catch (err: any) {
      console.error('Failed to submit enrollment request:', err);
      setError(err.response?.data?.message || 'Failed to submit enrollment request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout(navigate);
  };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
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
            <h1 className="text-3xl font-bold text-primary">Submit Enrollment Request</h1>
            <p className="text-gray-600 mt-2">Review your information and submit your hostel enrollment request</p>
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
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-green-600 font-medium">Complete Profile</span>
            </div>
            <div className="h-1 w-16 bg-green-200 rounded"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-primary font-medium">Submit Enrollment</span>
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

        {/* Profile Review */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-100 mb-6">
          <div className="text-center mb-6">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Profile Complete!</h2>
            <p className="text-gray-600">Please review your information before submitting your enrollment request</p>
          </div>

          {/* Profile Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                <p className="font-medium">{student.course}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Contact Number</p>
                <p className="font-medium">{student.contact_number}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">{student.date_of_birth}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Semesters Requested</p>
                <p className="font-medium">{student.semesters_requested}</p>
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

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-6">
            <h3 className="font-medium text-blue-800 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• Your enrollment request will be sent to the hostel administration</li>
              <li>• Admin will review your profile and application</li>
              <li>• You will be notified once your request is approved or if any additional information is needed</li>
              <li>• Upon approval, you'll get access to all hostel management features</li>
              <li>• A room will be assigned to you as part of the approval process</li>
            </ul>
          </div>

          {/* Terms and Conditions */}
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-6">
            <h3 className="font-medium text-gray-800 mb-2">Terms and Conditions</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>By submitting this enrollment request, you agree to:</p>
              <ul className="ml-4 space-y-1">
                <li>• Follow all hostel rules and regulations</li>
                <li>• Pay hostel fees on time</li>
                <li>• Maintain discipline and cleanliness in the hostel premises</li>
                <li>• Respect other students and hostel staff</li>
                <li>• Provide accurate information in your application</li>
              </ul>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-6">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmitEnrollment}
              disabled={loading}
              className="bg-primary text-white px-8 py-4 rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Enrollment Request
                </>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Need to update your profile? 
            <button 
              onClick={() => navigate('/student/complete-profile')}
              className="text-primary hover:underline ml-1"
            >
              Go back to edit
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentSubmitEnrollment; 