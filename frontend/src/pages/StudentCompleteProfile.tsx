import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Book, Phone, Calendar, Clock, Upload, Camera, LogOut } from 'lucide-react';
import api, { uploadProfilePicture } from '../utils/api';
import { logout } from '../utils/auth';
import ProfileAvatar from '../components/ProfileAvatar';

interface ProfileForm {
  course: string;
  contact_number: string;
  date_of_birth: string;
  semesters_requested: number;
  profile_picture: File | null;
}

const StudentCompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    course: '',
    contact_number: '',
    date_of_birth: '',
    semesters_requested: 1,
    profile_picture: null
  });

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const response = await api.get('/student/profile');
        setStudent(response.data);
        
        // Pre-fill any existing data
        setProfileForm(prev => ({
          ...prev,
          course: response.data.course || '',
          contact_number: response.data.contact_number || '',
          date_of_birth: response.data.date_of_birth || '',
          semesters_requested: response.data.semesters_requested || 1
        }));
      } catch (err) {
        console.error('Failed to fetch student data:', err);
        setError('Failed to load profile data');
      }
    };

    fetchStudentData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: name === 'semesters_requested' ? parseInt(value) : value
    }));
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('handleProfilePictureChange: File selected:', file.name);
      
      setProfileForm(prev => ({
        ...prev,
        profile_picture: file
      }));

      // Upload the profile picture immediately
      try {
        setUploadingImage(true);
        console.log('handleProfilePictureChange: Starting upload...');
        
        const response = await uploadProfilePicture(file);
        console.log('handleProfilePictureChange: Upload response:', response);
        
        // Update student data with new profile picture URL
        const newProfilePictureUrl = response.profile_picture_url;
        console.log('handleProfilePictureChange: Updating student state with URL:', newProfilePictureUrl);
        
        setStudent(prev => {
          const updatedStudent = {
            ...prev,
            profile_picture: newProfilePictureUrl
          };
          console.log('handleProfilePictureChange: Updated student state:', updatedStudent);
          return updatedStudent;
        });
        
        // Also refresh the student profile from the server to ensure consistency
        try {
          const profileResponse = await api.get('/student/profile');
          console.log('handleProfilePictureChange: Refreshed profile from server:', profileResponse.data);
          setStudent(profileResponse.data);
        } catch (refreshErr) {
          console.warn('handleProfilePictureChange: Failed to refresh profile from server:', refreshErr);
          // Continue with local update if server refresh fails
        }
        
        console.log('handleProfilePictureChange: Profile picture uploaded and state updated successfully');
      } catch (err: any) {
        console.error('handleProfilePictureChange: Failed to upload profile picture:', err);
        setError('Failed to upload profile picture. Please try again.');
      } finally {
        setUploadingImage(false);
      }
    } else {
      console.log('handleProfilePictureChange: No file selected');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!profileForm.course) {
      setError('Course is required');
      setLoading(false);
      return;
    }

    if (!profileForm.contact_number) {
      setError('Contact number is required');
      setLoading(false);
      return;
    }

    if (!profileForm.date_of_birth) {
      setError('Date of birth is required');
      setLoading(false);
      return;
    }

    try {
      // Update profile data
      const profileData = {
        course: profileForm.course,
        contact_number: profileForm.contact_number,
        date_of_birth: profileForm.date_of_birth,
        semesters_requested: profileForm.semesters_requested
      };

      await api.put('/student/profile', profileData);

      // Navigate to next step - enrollment submission
      navigate('/student/submit-enrollment');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
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
            <h1 className="text-3xl font-bold text-primary">Complete Your Profile</h1>
            <p className="text-gray-600 mt-2">Please provide your information to continue with enrollment</p>
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
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="text-primary font-medium">Complete Profile</span>
            </div>
            <div className="h-1 w-16 bg-gray-200 rounded"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-gray-500">Submit Enrollment</span>
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

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Welcome Message */}
            <div className="text-center mb-6">
              <User className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome, {student.name}!</h2>
              <p className="text-gray-600">Please complete your profile to submit your hostel enrollment request</p>
            </div>

            {/* Student Info Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <User className="h-5 w-5 text-primary mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Student ID</p>
                  <p className="font-medium">{student.roll_number}</p>
                </div>
              </div>
              <div className="flex items-center">
                <User className="h-5 w-5 text-primary mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{student.email}</p>
                </div>
              </div>
            </div>

            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <ProfileAvatar 
                  src={student.profile_picture || (profileForm.profile_picture ? URL.createObjectURL(profileForm.profile_picture) : null)}
                  alt={student.name}
                  size="lg"
                  className="mb-4"
                />
                
                <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition disabled:opacity-50">
                  {uploadingImage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500">
                {uploadingImage ? 'Uploading...' : 'Upload your profile picture (optional)'}
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Book className="inline w-4 h-4 mr-1" />
                  Course/Program *
                </label>
                <select
                  name="course"
                  value={profileForm.course}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Select your course</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Business Administration">Business Administration</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Arts">Arts</option>
                  <option value="Science">Science</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Contact Number *
                </label>
                <input
                  type="tel"
                  name="contact_number"
                  value={profileForm.contact_number}
                  onChange={handleInputChange}
                  placeholder="Enter your contact number"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={profileForm.date_of_birth}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Semesters Requested */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Semesters Requested *
                </label>
                <select
                  name="semesters_requested"
                  value={profileForm.semesters_requested}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value={1}>1 Semester</option>
                  <option value={2}>2 Semesters</option>
                  <option value={3}>3 Semesters</option>
                  <option value={4}>4 Semesters</option>
                  <option value={5}>5 Semesters</option>
                  <option value={6}>6 Semesters</option>
                  <option value={7}>7 Semesters</option>
                  <option value={8}>8 Semesters</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Saving Profile...
                  </>
                ) : (
                  'Complete Profile & Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentCompleteProfile; 