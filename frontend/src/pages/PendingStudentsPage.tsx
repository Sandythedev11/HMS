import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, UserX, Calendar, GraduationCap, Bed, Phone, Cake } from "lucide-react";
import api, { directFetch, API_URL } from "../utils/api";
import { isAdmin, logout, getUserInfo } from "../utils/auth";

interface Student {
  id: number;
  user_id: number;
  roll_number: string;
  name: string;
  email: string;
  course: string;
  contact_number: string;
  date_of_birth: string;
  is_enrollment_requested?: boolean;
  room_id?: number | null;
  semesters_requested?: number;
}

interface ApprovalForm {
  [studentId: number]: {
    room_id: number | null;
  };
}

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  status: string;
  occupied: number;
  capacity: number;
  is_full: boolean;
}

const PendingStudentsPage = () => {
  const navigate = useNavigate();
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [approvalForm, setApprovalForm] = useState<ApprovalForm>({});
  
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Use better validation logic
        if (!isAdmin()) {
          console.error("User is not admin");
          setError("You don't have admin privileges");
          setLoading(false);
          return false;
        }

        const user = getUserInfo();
        console.log("User info:", user);
        
        // Debug the token first
        try {
          const debugResponse = await api.get(`/debug-token`);
          console.log("Token validation response:", debugResponse.data);
          
          if (!debugResponse.data.valid || debugResponse.data.role !== 'admin') {
            console.error("Invalid token or user is not admin:", debugResponse.data);
            setError("Authentication error. Please login again.");
            setLoading(false);
            return false;
          }
        } catch (err) {
          console.error("Token validation request failed:", err);
          return false;
        }
        
        return true;
      } catch (err) {
        console.error("Token validation logic failed:", err);
        setError("Session expired. Please login again.");
        setLoading(false);
        return false;
      }
    };
    
    const fetchAllRooms = async () => {
      try {
        // Fetch all rooms with their occupancy status
        const response = await api.get(`/rooms`);
        
        // Sort rooms by room number
        const sortedRooms = response.data.sort((a: Room, b: Room) => 
          parseInt(a.room_number) - parseInt(b.room_number)
        );
        
        setRooms(sortedRooms);
        console.log(`Fetched ${sortedRooms.length} rooms, ${sortedRooms.filter(r => !r.is_full).length} available`);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      }
    };
  
  const fetchData = async () => {
      // First validate the token
      const isValid = await validateToken();
      if (!isValid) {
        // Redirect to login if validation fails
        logout(navigate);
        return;
      }
      
      // Then fetch the data
      fetchPendingStudents();
      fetchAllRooms();
    };
    
    fetchData();
  }, [navigate]);
  
  const fetchPendingStudents = async () => {
    try {
      setLoading(true);
      
      // Use the dedicated pending students endpoint
      console.log("Fetching pending students...");
      const response = await api.get(`/admin/students/pending`);
      console.log("Pending students response:", response.data);
      
      // The backend now returns only students with enrollment requests that are not approved
      setPendingStudents(response.data);
      console.log(`Found ${response.data.length} pending enrollment requests`);
      
    } catch (err: any) {
      console.error("Failed to fetch pending students:", err);
      if (err.response?.status === 422 || err.response?.status === 401) {
        console.error("JWT validation error. Refreshing login might help.");
        setError("Session error. Please try logging in again.");
        logout(navigate);
      } else {
        setError(err.response?.data?.message || "Failed to load pending registrations");
      }
    } finally {
      setLoading(false);
    }
  };
  

  
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>, studentId: number) => {
    const { value } = e.target;
    setApprovalForm(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        room_id: value ? parseInt(value) : null
      }
    }));
  };
  
  const handleApprove = async (studentId: number) => {
    const selectedRoomId = approvalForm[studentId]?.room_id;
    
    // Validate room selection
    if (!selectedRoomId) {
      setError("Please select a room before approving the student.");
      return;
    }
    
    // Check if selected room is at capacity
    const selectedRoom = rooms.find(room => room.id === selectedRoomId);
    if (selectedRoom && selectedRoom.is_full) {
      setError(`Room ${selectedRoom.room_number} is already at full capacity.`);
      return;
    }
    
    try {
      setApproving(studentId);
      setError(null); // Clear any previous errors
      
      // Send approval request with mandatory room assignment
      await api.put(`/admin/students/approve/${studentId}`, { 
        room_id: selectedRoomId 
      });
      
      // Remove the approved student from the list
      setPendingStudents(prev => prev.filter(student => student.id !== studentId));
      
      // Remove this student's form data
      setApprovalForm(prev => {
        const newForm = {...prev};
        delete newForm[studentId];
        return newForm;
      });
      
      // Update the room's occupancy in the local state
      setRooms(prev => prev.map(room => {
        if (room.id === selectedRoomId) {
          const newOccupied = room.occupied + 1;
          return {
            ...room,
            occupied: newOccupied,
            status: `${newOccupied}/${room.capacity}`,
            is_full: newOccupied >= room.capacity
          };
        }
        return room;
      }));
      
      console.log(`Student ${studentId} approved successfully with room ${selectedRoomId}`);
      
    } catch (err: any) {
      console.error("Failed to approve student:", err);
      if (err.response?.status === 422 || err.response?.status === 401) {
        setError("Session error. Please try logging in again.");
        logout(navigate);
      } else {
        setError(err.response?.data?.message || "Failed to approve student");
      }
    } finally {
      setApproving(null);
    }
  };
  
  const handleReject = async (studentId: number) => {
    if (!confirm("Are you sure you want to reject this student's enrollment request? They will be able to resubmit a new request.")) {
      return;
    }
    
    try {
      setApproving(studentId);
      setError(null); // Clear any previous errors
      
      // Using PUT method since we're updating the student status, not deleting
      await api.put(`/admin/students/reject/${studentId}`, {});
      
      // Remove the rejected student from the list
      setPendingStudents(prev => prev.filter(student => student.id !== studentId));
      
      console.log(`Student ${studentId} enrollment request rejected successfully`);
      
    } catch (err: any) {
      console.error("Failed to reject student:", err);
      if (err.response?.status === 422 || err.response?.status === 401) {
        setError("Session error. Please try logging in again.");
        logout(navigate);
      } else {
        setError(err.response?.data?.message || "Failed to reject student");
      }
    } finally {
      setApproving(null);
    }
  };
  
  // Helper function to format the room display
  const formatRoomDisplay = (room: Room) => {
    return `Room ${room.room_number} (${room.occupied}/${room.capacity}${room.is_full ? ' - FULL' : ''})`;
  };
  
  if (loading) {
    return <div className="p-8 text-center">Loading pending registrations...</div>;
  }
  
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">{error}</div>
        <button 
          onClick={() => navigate('/admin-dashboard')}
          className="bg-primary text-white px-4 py-2 rounded-md"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-6xl mx-auto py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Student Enrollment Requests</h1>
        <button 
          onClick={() => navigate('/admin-dashboard')}
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md transition"
        >
          Back to Dashboard
        </button>
      </div>
      
      {pendingStudents.length === 0 ? (
        <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center">
          No enrollment requests at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingStudents.map(student => (
            <div key={student.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{student.name}</h2>
                  <p className="text-gray-600 mb-1">Email: {student.email}</p>
                  <p className="text-gray-600 mb-4">Roll Number: {student.roll_number}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <GraduationCap className="inline-block h-4 w-4 mr-1" />
                        Course
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        {student.course || 'Not specified'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="inline-block h-4 w-4 mr-1" />
                        Join Date
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        {new Date().toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Phone className="inline-block h-4 w-4 mr-1" />
                        Contact Number
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        {student.contact_number || 'Not specified'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Cake className="inline-block h-4 w-4 mr-1" />
                        Date of Birth
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        {student.date_of_birth || 'Not specified'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Bed className="inline-block h-4 w-4 mr-1" />
                        Assign Room *
                      </label>
                      <select
                        name="room_id"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        onChange={(e) => handleInputChange(e, student.id)}
                        value={approvalForm[student.id]?.room_id || ""}
                        required
                      >
                        <option value="">Select a room (Required)</option>
                        {rooms
                          .sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number))
                          .map(room => (
                            <option 
                              key={room.id} 
                              value={room.id}
                              disabled={room.is_full}
                              className={room.is_full ? 'text-gray-400' : ''}
                            >
                              {formatRoomDisplay(room)}
                            </option>
                          ))
                        }
                      </select>
                      {!approvalForm[student.id]?.room_id && (
                        <p className="text-sm text-red-600 mt-1">Room assignment is required for approval</p>
                      )}
                      {rooms.length > 0 && rooms.every(room => room.is_full) && (
                        <p className="text-sm text-amber-600 mt-1">All rooms are at full capacity. Please create a new room.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => handleReject(student.id)}
                  disabled={approving === student.id}
                  className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition disabled:opacity-50"
                >
                  <UserX className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(student.id)}
                  disabled={approving === student.id || !approvalForm[student.id]?.room_id}
                  className={`flex items-center gap-1 px-4 py-2 rounded-md transition ${
                    !approvalForm[student.id]?.room_id 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-secondary'
                  }`}
                  title={!approvalForm[student.id]?.room_id ? 'Please select a room first' : 'Approve student enrollment'}
                >
                  <UserPlus className="h-4 w-4" />
                  {approving === student.id ? "Processing..." : "Approve & Assign Room"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingStudentsPage; 