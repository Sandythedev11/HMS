import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Trash2, Check, Search, User, Calendar, Book, Phone, Cake, Home, MapPin, Edit, UserX, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { getDashboardUrl } from '../utils/auth';
import ProfileAvatar from '../components/ProfileAvatar';
import { notify } from '../utils/notifications';

interface StudentProfile {
  id: number;
  user_id: number;
  roll_number: string;
  name: string;
  email: string;
  profile_picture?: string;
  course?: string;
  join_date?: string;
  room_number?: string;
  room_type?: string;
  room_id?: number;
  is_approved: boolean;
  contact_number?: string;
  date_of_birth?: string;
  semesters_requested?: number;
  status?: 'active' | 'removed';
}

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  capacity: number;
  occupied: number;
}

const AdminStudentManagement = () => {
  const { studentId } = useParams<{ studentId?: string }>();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [roomAllocationMode, setRoomAllocationMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [recentlyUpdated, setRecentlyUpdated] = useState<number[]>([]);
  const navigate = useNavigate();

  // Function to fetch student data
  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching latest student data...");
      
      // Fetch all approved students directly from server
      const studentsResponse = await api.get('/admin/students/approved');
      setStudents(studentsResponse.data);
      
      // Also update the selected student if there is one
      if (selectedStudent) {
        const updatedSelectedStudent = studentsResponse.data.find(
          (s: StudentProfile) => s.id === selectedStudent.id
        );
        if (updatedSelectedStudent) {
          setSelectedStudent(updatedSelectedStudent);
        }
      }
      
      // Update the last refresh timestamp
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch student data:', err);
      setError('Failed to load students data');
    } finally {
      setLoading(false);
    }
  }, [selectedStudent]);

  // Add event listener for student profile updates
  useEffect(() => {
    // Function to handle student profile update events
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { studentId, success } = customEvent.detail;
      
      if (success) {
        console.log(`Received successful profile update event for student ${studentId}`);
        
        // Mark this student as recently updated
        if (!recentlyUpdated.includes(studentId)) {
          setRecentlyUpdated(prev => [...prev, studentId]);
          
          // Remove from recently updated after 5 seconds
          setTimeout(() => {
            setRecentlyUpdated(prev => prev.filter(id => id !== studentId));
          }, 5000);
        }
        
        // Refresh student data from server immediately
        fetchStudentData();
      }
    };
    
    // Add event listener
    window.addEventListener('student-profile-updated', handleProfileUpdate);
    
    // Clean up
    return () => {
      window.removeEventListener('student-profile-updated', handleProfileUpdate);
    };
  }, [fetchStudentData, recentlyUpdated]);

  // Load students and rooms data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all approved students
        const studentsResponse = await api.get('/admin/students/approved');
        setStudents(studentsResponse.data);
        
        // Fetch available rooms for allocation - use the new endpoint
        const roomsResponse = await api.get('/rooms/available');
        
        // Process rooms data to ensure occupied and capacity fields
        const processedRooms = roomsResponse.data.map((room: any) => ({
          ...room,
          // Use the enhanced room data from the API
          occupied: room.occupied || 0,
          capacity: room.capacity || 4
        }));
        
        setRooms(processedRooms);
        
        // Update the last refresh timestamp
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Failed to fetch data:', err);
        // Fallback to regular rooms endpoint if available rooms endpoint fails
        try {
          const roomsResponse = await api.get('/rooms');
          const processedRooms = roomsResponse.data.map((room: any) => ({
            ...room,
            occupied: room.occupied || 0,
            capacity: room.capacity || 4
          }));
          setRooms(processedRooms);
        } catch (fallbackErr) {
          console.error('Failed to fetch rooms (fallback):', fallbackErr);
          setError('Failed to load students or rooms data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle studentId from URL parameter
  useEffect(() => {
    const fetchStudentById = async () => {
      if (studentId) {
        try {
          setLoading(true);
          // Find student in already loaded data first
          const studentFromList = students.find(s => s.id === parseInt(studentId));
          
          if (studentFromList) {
            setSelectedStudent(studentFromList);
            setLoading(false);
            return;
          }
          
          // Instead of using /student/:id directly, we should use the approved students list
          // since it seems the direct endpoint might be causing server errors
          console.log("Student not found in current list, fetching approved students...");
          const approvedResponse = await api.get('/admin/students/approved');
          const foundStudent = approvedResponse.data.find((s: any) => s.id === parseInt(studentId));
          
          if (foundStudent) {
            setSelectedStudent(foundStudent);
            // Update the main students list as well
            setStudents(approvedResponse.data);
            notify.info(
              "Student Profile Loaded", 
              `${foundStudent.name}'s profile has been loaded successfully.`
            );
          } else {
            console.log("Student not found in approved list either, they might be pending");
            // Try fetching from pending students list as well
            const pendingResponse = await api.get('/admin/students/pending');
            const pendingStudent = pendingResponse.data.find((s: any) => s.id === parseInt(studentId));
            
            if (pendingStudent) {
              setSelectedStudent(pendingStudent);
              notify.info(
                "Pending Student Profile", 
                `${pendingStudent.name}'s profile is loaded. This student is still pending approval.`,
                { duration: 7000 }
              );
            } else {
              setError('Student not found in any list');
              notify.error(
                "Student Not Found", 
                `No student with ID ${studentId} was found in any list.`
              );
            }
          }
        } catch (err) {
          console.error('Failed to fetch student by ID:', err);
          setError('Failed to load student details');
          notify.error(
            "Profile Load Failed", 
            "There was an error loading the student profile. Please try again."
          );
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudentById();
  }, [studentId, students]);

  // Set up auto-refresh of student data every 10 seconds
  useEffect(() => {
    // Set up automatic refresh
    const refreshInterval = setInterval(() => {
      fetchStudentData();
    }, 10000); // Refresh every 10 seconds instead of 20
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, [fetchStudentData]);

  // Handle room allocation
  const allocateRoom = async () => {
    if (!selectedStudent || !selectedRoom) return;
    
    try {
      setLoading(true);
      // Call API to allocate room - use the correct endpoint
      await api.put(`/admin/students/approve/${selectedStudent.id}`, {
        room_id: selectedRoom,
        // Keep existing data
        course: selectedStudent.course,
        join_date: selectedStudent.join_date,
        profile_picture: selectedStudent.profile_picture
      });
      
      // Update the student in the local state
      const updatedStudents = students.map(student => {
        if (student.id === selectedStudent.id) {
          const allocatedRoom = rooms.find(room => room.id === selectedRoom);
          return {
            ...student,
            room_id: selectedRoom,
            room_number: allocatedRoom?.room_number,
            room_type: allocatedRoom?.room_type
          };
        }
        return student;
      });
      
      setStudents(updatedStudents);
      setRoomAllocationMode(false);
      setSelectedRoom(null);
      
      // Also update the selected student if still viewing details
      if (selectedStudent) {
        const room = rooms.find(r => r.id === selectedRoom);
        setSelectedStudent({
          ...selectedStudent,
          room_id: selectedRoom,
          room_number: room?.room_number,
          room_type: room?.room_type
        });
      }
      
      // Show success notification
      const roomDetails = rooms.find(r => r.id === selectedRoom);
      notify.success(
        "Room Allocated", 
        `Room ${roomDetails?.room_number} (${roomDetails?.room_type}) has been allocated to ${selectedStudent.name}.`
      );
    } catch (err) {
      console.error('Failed to allocate room:', err);
      setError('Failed to allocate room. Please try again.');
      
      // Show error notification
      notify.error(
        "Room Allocation Failed", 
        "There was an error allocating the room. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle profile deletion (mark as removed)
  const deleteStudentProfile = async (studentId: number) => {
    try {
      setLoading(true);
      
      // Find the student to be deleted
      const studentToDelete = students.find(s => s.id === studentId);
      if (!studentToDelete) return;
      
      // Call API to mark student as removed
      await api.put(`/admin/students/reject/${studentId}`);
      
      // Update local state
      const updatedStudents = students.map(student => {
        if (student.id === studentId) {
          return { ...student, status: 'removed' as 'removed' };
        }
        return student;
      });
      
      setStudents(updatedStudents);
      setConfirmDelete(null);
      
      // If the selected student was deleted, update the selection
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent({ ...selectedStudent, status: 'removed' });
      }
      
      // Show success notification with undo option
      notify.withUndo(
        "Student Removed", 
        `${studentToDelete.name} has been removed from the hostel.`,
        async () => {
          try {
            // Attempt to restore the student
            await api.put(`/admin/students/approve/${studentId}`, {
              status: 'active',
              room_id: studentToDelete.room_id,
              course: studentToDelete.course,
              join_date: studentToDelete.join_date,
              profile_picture: studentToDelete.profile_picture
            });
            
            // Update local state
            const restoredStudents = students.map(student => {
              if (student.id === studentId) {
                return { ...student, status: 'active' as 'active' };
              }
              return student;
            });
            
            setStudents(restoredStudents);
            
            // If the selected student was restored, update the selection
            if (selectedStudent && selectedStudent.id === studentId) {
              setSelectedStudent({ ...selectedStudent, status: 'active' });
            }
            
            notify.success(
              "Student Restored", 
              `${studentToDelete.name} has been restored to the hostel.`
            );
          } catch (err) {
            console.error('Failed to restore student:', err);
            notify.error(
              "Restore Failed", 
              "There was an error restoring the student. Please try again."
            );
          }
        }
      );
    } catch (err) {
      console.error('Failed to remove student:', err);
      
      // Provide more specific error messages based on error status
      let errorMessage = "There was an error removing the student. Please try again.";
      
      // Type check for axios error
      const error = err as any;
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 403) {
          errorMessage = "You don't have permission to remove this student.";
        } else if (error.response.status === 404) {
          errorMessage = "Student not found. The page may be outdated.";
        } else if (error.response.status === 405) {
          errorMessage = "API method not allowed. Please contact support.";
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "Server did not respond. Please check your connection and try again.";
      }
      
      setError('Failed to remove student: ' + errorMessage);
      
      // Show error notification
      notify.error(
        "Remove Failed", 
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    const searchString = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchString) ||
      student.roll_number.toLowerCase().includes(searchString) ||
      student.email.toLowerCase().includes(searchString) ||
      (student.room_number && student.room_number.toLowerCase().includes(searchString))
    );
  });

  // Get available rooms - show all rooms but indicate capacity status
  const availableRooms = rooms;

  if (loading && students.length === 0) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manage Students</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button 
            onClick={() => fetchStudentData()}
            className="p-2 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 12a9 9 0 0 0 6.7 15L13 21"></path>
              <path d="M13 21h6v-6"></path>
            </svg>
            Refresh
          </button>
          <button 
            onClick={() => navigate(getDashboardUrl())}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student list panel */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4">
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border border-gray-300 rounded-md"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="py-4 text-center text-gray-500">No students found</p>
            ) : (
              filteredStudents.map(student => (
                <div 
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setRoomAllocationMode(false);
                  }}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 ${
                    selectedStudent?.id === student.id ? 'bg-blue-50' : ''
                  } ${student.status === 'removed' ? 'opacity-60' : ''} ${
                    recentlyUpdated.includes(student.id) ? 'border-l-4 border-green-500 animate-pulse' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mr-3 relative">
                    <ProfileAvatar 
                      src={student.profile_picture}
                      alt={student.name}
                      size="sm"
                      className="w-10 h-10 rounded-md"
                      fallbackClassName="w-10 h-10 rounded-md bg-gray-200"
                    />
                    
                    {recentlyUpdated.includes(student.id) && (
                      <div className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center border border-white animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-medium">{student.name}</h3>
                    <p className="text-sm text-gray-600">{student.roll_number}</p>
                  </div>
                  <div className="text-right">
                    {student.room_number ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Room {student.room_number}
                      </span>
                    ) : student.status === 'removed' ? (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Removed
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        No Room
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Student details and room allocation panel */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          {!selectedStudent ? (
            <div className="text-center py-10">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">No Student Selected</h3>
              <p className="text-gray-500">Select a student from the list to view details and manage room allocation</p>
            </div>
          ) : roomAllocationMode ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedStudent.room_number ? 'Change Room' : 'Allocate Room'} for {selectedStudent.name}
                </h2>
                <button 
                  onClick={() => setRoomAllocationMode(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>

              {selectedStudent.room_number && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1">Current Room Assignment</p>
                  <p className="font-medium">Room {selectedStudent.room_number} ({selectedStudent.room_type})</p>
                </div>
              )}

              {availableRooms.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
                  No rooms available at the moment. All rooms are at full capacity.
                </div>
              ) : (
                <>
                  <p className="mb-4 text-gray-600">Select a room from the list below:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {availableRooms.map(room => {
                      const isCurrentRoom = selectedStudent.room_id === room.id;
                      const isFull = room.occupied >= room.capacity && !isCurrentRoom;
                      
                      return (
                        <div 
                          key={room.id}
                          onClick={() => !isFull && setSelectedRoom(room.id)}
                          className={`border p-4 rounded-lg ${
                            isFull ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            selectedRoom === room.id ? 'bg-blue-50 border-blue-300' : 
                            isCurrentRoom ? 'bg-green-50 border-green-300' : 
                            isFull ? 'bg-gray-50 border-gray-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <h3 className="font-bold mb-1">Room {room.room_number}</h3>
                          <p className="text-sm text-gray-600">Type: {room.room_type}</p>
                          <p className="text-sm text-gray-600">
                            Capacity: {room.occupied}/{room.capacity} occupied
                          </p>
                          {isFull && (
                            <span className="inline-block mt-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Full
                            </span>
                          )}
                          {isCurrentRoom && (
                            <span className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Current Room
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={allocateRoom}
                      disabled={!selectedRoom}
                      className={`flex items-center px-4 py-2 rounded ${selectedRoom ? 'bg-primary text-white hover:bg-primary/90' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      {selectedStudent.room_id && selectedRoom === selectedStudent.room_id ? 
                        'Confirm Current Room' : 
                        selectedStudent.room_number ? 'Change Room' : 'Allocate Room'
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <ProfileAvatar 
                    src={selectedStudent.profile_picture}
                    alt={selectedStudent.name}
                    size="lg"
                    className="w-16 h-16 rounded-md mr-4"
                    fallbackClassName="w-16 h-16 rounded-md bg-gray-200 mr-4"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h2>
                    <p className="text-gray-600">{selectedStudent.roll_number}</p>
                  </div>
                </div>
                <div className="space-x-2">
                  {selectedStudent.status !== 'removed' && (
                    <>
                      <button
                        onClick={() => setRoomAllocationMode(true)}
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                      >
                        {selectedStudent.room_number ? 'Change Room' : 'Allocate Room'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(selectedStudent.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {selectedStudent.status === 'removed' && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md">
                  This student has been removed from the hostel system.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Join Date</p>
                    <p>{selectedStudent.join_date || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Book className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Course</p>
                    <p>{selectedStudent.course || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Contact</p>
                    <p>{selectedStudent.contact_number || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Cake className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p>{selectedStudent.date_of_birth || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Home className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Room</p>
                    {selectedStudent.room_number ? (
                      <p>Room {selectedStudent.room_number} ({selectedStudent.room_type})</p>
                    ) : (
                      <p className="text-yellow-600">Not allocated</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Semesters Requested</p>
                    <p>{selectedStudent.semesters_requested || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <User className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p>{selectedStudent.email}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <User className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Student ID</p>
                    <p>{selectedStudent.roll_number}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Remove Student from Hostel</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to remove this student from the hostel? 
              This will mark their profile as removed, and they will no longer have access to hostel services.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteStudentProfile(confirmDelete)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentManagement; 