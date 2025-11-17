import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { isAdmin } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  timestamp: string;
}

const AttendancePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is admin and redirect if needed
    const adminStatus = isAdmin();
    setUserIsAdmin(adminStatus);
    
    if (adminStatus) {
      navigate('/admin/attendance');
      return;
    }
    
    // Fetch attendance records
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const response = await api.get('/attendance');
        setAttendanceRecords(response.data);
      } catch (err) {
        console.error("Failed to fetch attendance:", err);
        setError("Failed to load attendance records");
      } finally {
        setLoading(false);
      }
    };
    
    // Check if student has fingerprint data
    const checkFingerprintStatus = async () => {
      if (!adminStatus) {
        try {
          const response = await api.get('/student/fingerprint-status');
          setHasFingerprint(response.data.has_fingerprint);
        } catch (err) {
          console.error("Failed to check fingerprint status:", err);
        }
      }
    };
    
    // Check attendance window status
    const checkWindowStatus = async () => {
      try {
        const response = await api.get('/attendance/window/status');
        setWindowOpen(response.data.is_open);
      } catch (err) {
        console.error("Failed to check attendance window:", err);
      }
    };
    
    fetchAttendance();
    checkFingerprintStatus();
    checkWindowStatus();
  }, [navigate]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Format time for display
  const formatTime = (timestampString: string) => {
    if (!timestampString) return "N/A";
    const date = new Date(timestampString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // If user is admin, they will be redirected in the useEffect
  // This is just a fallback in case the redirect fails
  if (userIsAdmin) {
    return <div className="py-8 text-center">Redirecting to admin attendance page...</div>;
  }
  
  return (
    <div className="py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-7">
        <h1 className="text-3xl font-bold">Attendance</h1>
        
        {userIsAdmin && (
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-500">
              {windowOpen ? (
                <span className="text-green-500 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Attendance Window Open
                </span>
              ) : (
                <span className="text-orange-500 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Attendance Window Closed
                </span>
              )}
            </p>
          </div>
        )}
      </div>
      
      {!userIsAdmin && !hasFingerprint && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
          <p className="text-yellow-700">
            Your fingerprint data hasn't been registered yet. Please contact the admin to register your fingerprint.
          </p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      ) : attendanceRecords.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No attendance records found.
        </div>
      ) : (
        <table className="min-w-full bg-white/80 rounded-lg overflow-hidden shadow mb-6">
          <thead className="text-left bg-primary text-white">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Time</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.map((record) => (
              <tr key={record.id} className="border-b border-gray-200">
                <td className="p-4">{formatDate(record.date)}</td>
                <td className={record.status === "Present" ? "p-4 text-green-700 font-semibold" : "p-4 text-orange-700 font-semibold"}>
                  {record.status}
                </td>
                <td className="p-4 text-gray-600 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatTime(record.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AttendancePage;
