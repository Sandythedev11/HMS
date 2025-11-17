import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, RefreshCw, LogOut, Info, User, Book, Phone, Calendar } from 'lucide-react';
import api from '../utils/api';
import { logout } from '../utils/auth';

const StudentPendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/student/profile');
      setStudent(response.data);
      
      // If approved, redirect to dashboard
      if (response.data.is_approved) {
        navigate('/student/dashboard');
      }
    } catch (err) {
      console.error('Failed to refresh status:', err);
    } finally {
      setRefreshing(false);
    }
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
            <h1 className="text-3xl font-bold text-primary">Enrollment Status</h1>
            <p className="text-gray-600 mt-2">Your enrollment request is being reviewed</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleRefreshStatus}
              disabled={refreshing}
              className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-md transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Check Status'}
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md transition"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
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
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-green-600 font-medium">Submit Enrollment</span>
            </div>
            <div className="h-1 w-16 bg-blue-200 rounded"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-blue-600 font-medium">Wait for Approval</span>
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

        {/* Main Status Card */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-100 mb-6">
          <div className="text-center mb-8">
            <div className="relative">
              <Clock className="w-20 h-20 text-blue-500 mx-auto mb-4 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-blue-700 mb-2">Under Review</h2>
            <p className="text-blue-600 max-w-md mx-auto">
              Your enrollment request has been submitted successfully! The hostel administration is currently reviewing your application.
            </p>
          </div>

          {/* Animated Processing Indicator */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <p className="text-center text-blue-600 font-medium">Processing your enrollment request...</p>
          </div>

          {/* Student Information */}
          {student && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
            </div>
          )}

          {/* Status Confirmation */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700 font-medium">Enrollment request submitted successfully</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              You will receive a notification once your request has been processed.
            </p>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What's Next */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h3 className="font-medium text-gray-800 mb-4 flex items-center">
              <Info className="h-5 w-5 text-blue-500 mr-2" />
              What happens next?
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                Admin will review your enrollment request
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                A room will be allocated to you upon approval
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                You'll get access to all hostel management features
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                You can then pay fees, submit complaints, and more
              </li>
            </ul>
          </div>

          {/* Quick Tip */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h3 className="font-medium text-blue-800 mb-4 flex items-center">
              <Info className="h-5 w-5 text-blue-500 mr-2" />
              Quick Tip
            </h3>
            <div className="text-sm text-blue-600 space-y-2">
              <p>
                Click "Check Status" above to see if your request has been processed. 
              </p>
              <p>
                The page will automatically redirect you to the dashboard once your enrollment is approved.
              </p>
              <p>
                Typical processing time is 1-2 business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPendingApproval; 