import { useState, useEffect } from 'react';
import { UserCheck, Fingerprint, CheckCircle, Clock, AlertTriangle, RefreshCw, X, Upload, Calendar, FileText, Eye, Scan } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { isAdmin } from '../utils/auth';

interface Student {
  id: number;
  name: string;
  roll_number: string;
  has_fingerprint: boolean;
  email: string;
}

interface LeaveRequest {
  id: number;
  student_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'Pending' | 'Granted' | 'Denied';
  created_at: string;
  processed_at?: string;
  processed_by?: number;
  admin_response?: string;
}

interface SensorStatus {
  connected: boolean;
  port?: string;
  template_count?: number;
  storage_capacity?: number;
  error?: string;
  suggestions?: string[];
}

const AdminAttendancePage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [windowInfo, setWindowInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [windowActionLoading, setWindowActionLoading] = useState(false);
  
  // Biometric Capture State
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [selectedStudentForCapture, setSelectedStudentForCapture] = useState<Student | null>(null);
  const [captureStep, setCaptureStep] = useState<'idle' | 'right_thumb' | 'left_thumb' | 'processing' | 'complete'>('idle');
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>({ connected: false });
  
  // Manual Port Configuration State
  const [showManualPortConfig, setShowManualPortConfig] = useState(false);
  const [manualPort, setManualPort] = useState('COM3');
  const [manualBaudrate, setManualBaudrate] = useState(57600);
  const [testingPort, setTestingPort] = useState(false);
  
  // Leave Request Modal State
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(false);
  const [denyingRequestId, setDenyingRequestId] = useState<number | null>(null);
  const [denialReason, setDenialReason] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      navigate('/login');
      return;
    }

    // Fetch all students with their fingerprint status
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/students/fingerprint-status');
        setStudents(response.data);
      } catch (err) {
        console.error("Failed to fetch students:", err);
        setError("Failed to load student data");
      } finally {
        setLoading(false);
      }
    };

    // Check attendance window status
    const checkWindowStatus = async () => {
      try {
        const response = await api.get('/admin/attendance/window');
        setWindowOpen(response.data.is_open);
        setWindowInfo(response.data);
      } catch (err) {
        console.error("Failed to check attendance window:", err);
      }
    };

    fetchStudents();
    checkWindowStatus();
  }, [navigate]);

  // Toggle attendance window open/close
  const toggleAttendanceWindow = async () => {
    setWindowActionLoading(true);
    try {
      if (windowOpen) {
        // Close the window
        await api.post('/admin/attendance/window/close');
        setWindowOpen(false);
      } else {
        // Open the window
        await api.post('/admin/attendance/window/open');
        setWindowOpen(true);
      }
      
      // Refresh window info
      const response = await api.get('/admin/attendance/window');
      setWindowInfo(response.data);
    } catch (err) {
      console.error("Failed to toggle attendance window:", err);
      setError("Failed to change attendance window status");
    } finally {
      setWindowActionLoading(false);
    }
  };

  // Check sensor status
  const checkSensorStatus = async () => {
    try {
      const response = await api.get('/admin/fingerprint/sensor/status');
      setSensorStatus(response.data);
    } catch (err) {
      console.error("Failed to check sensor status:", err);
      setSensorStatus({ connected: false, error: "Failed to check sensor status" });
    }
  };

  // Test specific port manually
  const testManualPort = async () => {
    setTestingPort(true);
    try {
      const response = await api.post('/admin/fingerprint/sensor/test-port', {
        port: manualPort,
        baudrate: manualBaudrate
      });
      
      if (response.data.success) {
        setSensorStatus({
          connected: true,
          port: response.data.port,
          ...response.data.sensor_info
        });
        setShowManualPortConfig(false);
        setCaptureError(null);
      } else {
        setCaptureError(`Port test failed: ${response.data.message}`);
      }
    } catch (err: any) {
      console.error("Failed to test manual port:", err);
      setCaptureError("Failed to test port. Please check the port number and try again.");
    } finally {
      setTestingPort(false);
    }
  };

  // Initialize sensor
  const initializeSensor = async () => {
    try {
      const response = await api.post('/admin/fingerprint/sensor/initialize');
      
      // Backend now always returns 200 OK with success flag
      if (response.data.success) {
        setSensorStatus(response.data.sensor_info || { connected: true });
        return true;
      } else {
        // Handle sensor initialization failure gracefully
        setSensorStatus({ 
          connected: false, 
          error: response.data.message,
          suggestions: response.data.suggestions || []
        });
        return false;
      }
    } catch (err: any) {
      console.error("Failed to initialize sensor:", err);
      setSensorStatus({ 
        connected: false, 
        error: "Failed to communicate with server",
        suggestions: ["Check your internet connection", "Try refreshing the page"]
      });
      return false;
    }
  };

  // Start biometric capture process
  const startBiometricCapture = async (student: Student) => {
    setSelectedStudentForCapture(student);
    setShowBiometricModal(true);
    setCaptureStep('idle');
    setCaptureError(null);
    
    // Check sensor status
    await checkSensorStatus();
  };

  // Perform biometric capture
  const performBiometricCapture = async () => {
    if (!selectedStudentForCapture) return;

    try {
      setCaptureLoading(true);
      setCaptureError(null);
      setCaptureStep('processing');

      const response = await api.post(`/admin/students/fingerprint/${selectedStudentForCapture.id}/biometric-capture`);
      
      if (response.data.success) {
        // Update the student in the list
        setStudents(students.map(student => 
          student.id === selectedStudentForCapture.id ? {...student, has_fingerprint: true} : student
        ));
        
        setCaptureStep('complete');
        setTimeout(() => {
          setShowBiometricModal(false);
          setSelectedStudentForCapture(null);
          setCaptureStep('idle');
          setUploadSuccess("Both thumbs captured and saved successfully");
          setTimeout(() => setUploadSuccess(null), 3000);
        }, 2000);
      } else {
        setCaptureError(response.data.message || "Capture failed");
        setCaptureStep('idle');
      }
    } catch (err: any) {
      console.error("Failed to capture fingerprints:", err);
      const errorMessage = err.response?.data?.message || "Failed to capture fingerprints";
      setCaptureError(errorMessage);
      setCaptureStep('idle');
    } finally {
      setCaptureLoading(false);
    }
  };

  // Close biometric modal
  const closeBiometricModal = () => {
    setShowBiometricModal(false);
    setSelectedStudentForCapture(null);
    setCaptureStep('idle');
    setCaptureError(null);
    setCaptureLoading(false);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  // Fetch leave requests for a student
  const fetchLeaveRequests = async (studentId: number) => {
    setLeaveRequestsLoading(true);
    try {
      const response = await api.get(`/admin/students/${studentId}/leave-requests`);
      setLeaveRequests(response.data);
    } catch (err) {
      console.error("Failed to fetch leave requests:", err);
      setError("Failed to load leave requests");
    } finally {
      setLeaveRequestsLoading(false);
    }
  };

  // Grant a leave request
  const handleGrantLeaveRequest = async (requestId: number) => {
    try {
      await api.post(`/admin/leave-requests/${requestId}/grant`);
      // Refresh the leave requests list
      if (selectedStudentId) {
        fetchLeaveRequests(selectedStudentId);
      }
    } catch (err) {
      console.error("Failed to grant leave request:", err);
      setError("Failed to grant leave request");
    }
  };

  // Deny a leave request
  const handleDenyLeaveRequest = async (requestId: number) => {
    if (!denialReason.trim()) {
      setError("Please provide a reason for denial");
      return;
    }

    try {
      await api.post(`/admin/leave-requests/${requestId}/deny`, {
        reason: denialReason
      });
      
      // Reset denial state
      setDenyingRequestId(null);
      setDenialReason('');
      
      // Refresh the leave requests list
      if (selectedStudentId) {
        fetchLeaveRequests(selectedStudentId);
      }
    } catch (err) {
      console.error("Failed to deny leave request:", err);
      setError("Failed to deny leave request");
    }
  };

  // Format date for display in leave requests
  const formatLeaveDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Handle opening leave request modal
  const handleLeaveRequestClick = (studentId: number, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setShowLeaveRequestModal(true);
    fetchLeaveRequests(studentId);
  };

  // Close leave request modal
  const closeLeaveRequestModal = () => {
    setShowLeaveRequestModal(false);
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setLeaveRequests([]);
    setDenyingRequestId(null);
    setDenialReason('');
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-8 max-w-6xl mx-auto animate-fade-in px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          
          <button
            onClick={toggleAttendanceWindow}
            disabled={windowActionLoading}
            className={`flex items-center gap-2 ${
              windowOpen 
                ? 'bg-orange-500 hover:bg-orange-600' 
                : 'bg-green-500 hover:bg-green-600'
            } text-white px-6 py-2 rounded-md transition disabled:opacity-50`}
          >
            {windowActionLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : windowOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {windowOpen ? 'Close Attendance' : 'Open Attendance'}
          </button>
        </div>
      </div>
      
      {/* Display attendance window status */}
      <div className={`mb-6 p-4 rounded-md ${windowOpen ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
        <div className="flex items-center gap-3">
          {windowOpen ? (
            <>
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="font-semibold text-green-700">Attendance Window Open</h2>
                <p className="text-sm text-green-600">Opened at: {windowInfo?.opened_at ? formatDate(windowInfo.opened_at) : 'N/A'}</p>
                <p className="text-sm text-green-600">Students can now mark their attendance via the attendance page.</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <div>
                <h2 className="font-semibold text-orange-700">Attendance Window Closed</h2>
                {windowInfo?.closed_at && (
                  <p className="text-sm text-orange-600">Closed at: {formatDate(windowInfo.closed_at)}</p>
                )}
                <p className="text-sm text-orange-600">Students cannot mark attendance until you open the window.</p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Error and success messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {uploadSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
          <p className="text-green-700">{uploadSuccess}</p>
        </div>
      )}
      
      {/* Search input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search students by name, ID, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md w-full"
        />
      </div>
      
      {/* Student list */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Students Found</h3>
          <p className="mt-1 text-gray-500">There are no approved students in the system.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-primary text-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Student
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Fingerprint Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{student.roll_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.has_fingerprint ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4 mr-1" /> Registered
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        <AlertTriangle className="w-4 h-4 mr-1" /> Not Registered
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startBiometricCapture(student)}
                        className="text-primary hover:text-primary/80 flex items-center"
                      >
                        <Scan className="w-4 h-4 mr-1" />
                        Update Fingerprint
                      </button>
                      <button
                        onClick={() => navigate(`/attendance/${student.id}`)}
                        className="text-primary hover:text-primary/80 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Attendance
                      </button>
                      <button
                        onClick={() => handleLeaveRequestClick(student.id, student.name)}
                        className="text-primary hover:text-primary/80 flex items-center"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Leave Request
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Biometric Capture Modal */}
      {showBiometricModal && selectedStudentForCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Fingerprint Capture</h2>
              <button
                onClick={closeBiometricModal}
                className="text-gray-500 hover:text-gray-700"
                disabled={captureLoading}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="bg-blue-100 p-4 rounded-lg mb-4">
                  <Fingerprint className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedStudentForCapture.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedStudentForCapture.roll_number}
                  </p>
                </div>
              </div>
              
              {/* Sensor Status */}
              <div className="mb-6">
                <div className={`flex items-center p-3 rounded-lg ${
                  sensorStatus.connected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    sensorStatus.connected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      sensorStatus.connected ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {sensorStatus.connected ? 'Sensor Connected' : 'Sensor Not Connected'}
                    </p>
                    {sensorStatus.port && (
                      <p className="text-xs text-gray-600">Port: {sensorStatus.port}</p>
                    )}
                    {sensorStatus.error && (
                      <p className="text-xs text-red-600 mt-1">{sensorStatus.error}</p>
                    )}
                    {sensorStatus.suggestions && sensorStatus.suggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-700">Troubleshooting:</p>
                        <ul className="text-xs text-red-600 list-disc list-inside mt-1">
                          {sensorStatus.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {!sensorStatus.connected && (
                    <div className="flex gap-2">
                      <button
                        onClick={initializeSensor}
                        className="text-xs bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition"
                      >
                        Retry Connection
                      </button>
                      <button
                        onClick={() => setShowManualPortConfig(!showManualPortConfig)}
                        className="text-xs bg-orange-500 text-white px-3 py-2 rounded hover:bg-orange-600 transition"
                      >
                        Manual Setup
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Manual Port Configuration */}
              {!sensorStatus.connected && showManualPortConfig && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3">Manual Port Configuration</h4>
                  <p className="text-xs text-blue-700 mb-3">
                    If you know the COM port your fingerprint sensor is connected to, you can test it directly:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">COM Port</label>
                      <input
                        type="text"
                        value={manualPort}
                        onChange={(e) => setManualPort(e.target.value)}
                        placeholder="COM3"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Baudrate</label>
                      <select
                        value={manualBaudrate}
                        onChange={(e) => setManualBaudrate(parseInt(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value={9600}>9600</option>
                        <option value={19200}>19200</option>
                        <option value={38400}>38400</option>
                        <option value={57600}>57600</option>
                        <option value={115200}>115200</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={testManualPort}
                      disabled={testingPort || !manualPort}
                      className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      {testingPort ? (
                        <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Scan className="h-3 w-3" />
                      )}
                      {testingPort ? 'Testing...' : 'Test Port'}
                    </button>
                    <button
                      onClick={() => setShowManualPortConfig(false)}
                      className="text-xs bg-gray-300 px-3 py-1 rounded hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-600">
                    <p className="font-medium">Common COM ports:</p>
                    <div className="flex gap-1 mt-1">
                      {['COM3', 'COM4', 'COM5', 'COM6'].map(port => (
                        <button
                          key={port}
                          onClick={() => setManualPort(port)}
                          className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs transition"
                        >
                          {port}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Capture Instructions */}
              <div className="mb-6">
                {captureStep === 'idle' && (
                  <div className="text-center">
                    <p className="text-gray-700 mb-4">
                      Ready to capture fingerprints. The system will scan both thumbs sequentially.
                    </p>
                    <ol className="text-sm text-gray-600 space-y-2 mb-4">
                      <li>1. Place your right thumb on the scanner when prompted</li>
                      <li>2. Place your left thumb on the scanner when prompted</li>
                      <li>3. Keep finger steady until scan completes</li>
                    </ol>
                  </div>
                )}
                
                {captureStep === 'processing' && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-primary mb-2">Scanning Fingerprints...</p>
                    <p className="text-sm text-gray-600">
                      Please follow the prompts on the fingerprint scanner device.
                    </p>
                  </div>
                )}
                
                {captureStep === 'complete' && (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-green-700 mb-2">
                      Fingerprints Captured Successfully!
                    </p>
                    <p className="text-sm text-gray-600">
                      Both thumbs have been scanned and saved.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Error Display */}
              {captureError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700 text-sm">{captureError}</p>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                {captureStep === 'idle' && (
                  <>
                    <button
                      onClick={closeBiometricModal}
                      className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={performBiometricCapture}
                      disabled={!sensorStatus.connected}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Scan className="h-4 w-4" />
                      Start Capture
                    </button>
                  </>
                )}
                
                {captureStep === 'processing' && (
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
                  >
                    Capturing...
                  </button>
                )}
                
                {captureStep === 'complete' && (
                  <button
                    onClick={closeBiometricModal}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Leave Request Modal */}
      {showLeaveRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Leave Requests - {selectedStudentName}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => selectedStudentId && fetchLeaveRequests(selectedStudentId)}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition text-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  onClick={closeLeaveRequestModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {leaveRequestsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Requests</h3>
                  <p>This student hasn't submitted any leave requests yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">
                              {formatLeaveDate(request.start_date)} - {formatLeaveDate(request.end_date)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Requested on {formatLeaveDate(request.created_at)}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'Granted' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded">{request.reason}</p>
                      </div>
                      
                      {request.admin_response && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Admin Response:</p>
                          <p className="text-gray-600 bg-red-50 p-3 rounded border-l-4 border-red-300">
                            {request.admin_response}
                          </p>
                        </div>
                      )}
                      
                      {request.status === 'Pending' && (
                        <div className="flex items-center gap-3 pt-3 border-t">
                          {denyingRequestId === request.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={denialReason}
                                onChange={(e) => setDenialReason(e.target.value)}
                                placeholder="Enter reason for denial..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                              <button
                                onClick={() => handleDenyLeaveRequest(request.id)}
                                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition text-sm"
                              >
                                Confirm Deny
                              </button>
                              <button
                                onClick={() => {
                                  setDenyingRequestId(null);
                                  setDenialReason('');
                                }}
                                className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400 transition text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleGrantLeaveRequest(request.id)}
                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition text-sm flex items-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Grant
                              </button>
                              <button
                                onClick={() => setDenyingRequestId(request.id)}
                                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition text-sm flex items-center gap-2"
                              >
                                <X className="h-4 w-4" />
                                Deny
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      
                      {request.processed_at && (
                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                          Processed on {formatLeaveDate(request.processed_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendancePage; 