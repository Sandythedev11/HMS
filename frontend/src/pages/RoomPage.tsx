import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, Users, User, Eye, EyeOff } from "lucide-react";
import api, { getProfilePictureUrl } from "../utils/api";
import { isAdmin } from "../utils/auth";
import React from "react";
import { useNavigate } from "react-router-dom";

interface Room {
  id: number;
  room_number: string;
  status: string;
  occupants?: number;
  students?: Student[];
  showStudents?: boolean;
  capacity: number;
  is_full: boolean;
}

interface Student {
  id: number;
  name: string;
  roll_number: string;
  email: string;
  profile_picture?: string;
  course?: string;
  room_id?: number;
}

const RoomPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newRoom, setNewRoom] = useState<Partial<Room> | null>(null);
  const [userIsAdmin] = useState(() => isAdmin());
  const [initializing, setInitializing] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const navigate = useNavigate();

  // Load rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await api.get('/rooms');
        
        // Use the enhanced room data directly from the API
        const roomsData = response.data.map((room: any) => ({
          id: room.id,
          room_number: room.room_number,
          status: room.is_full ? 'Full' : `${room.occupied}/${room.capacity}`,
          occupants: room.occupied,
          capacity: room.capacity,
          is_full: room.is_full,
          showStudents: false
        }));
        
        // Sort rooms by room number in ascending order
        const sortedRooms = [...roomsData].sort((a, b) => 
          parseInt(a.room_number) - parseInt(b.room_number)
        );
        
        setRooms(sortedRooms);
        
        // After loading rooms, check if we need to initialize default rooms
        if (roomsData.length < 10 && userIsAdmin) {
          initializeDefaultRooms(roomsData);
        }

        // Fetch all students to associate with rooms
        if (userIsAdmin) {
          fetchAllStudents();
        }
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
        setError("Failed to load rooms data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
  }, [userIsAdmin]);

  // Fetch all students and associate them with rooms
  const fetchAllStudents = async () => {
    try {
      const response = await api.get('/admin/students/approved');
      const studentData = response.data;
      setStudents(studentData);
      
      // Update rooms with student information
      updateRoomsWithStudents(studentData);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    }
  };

  // Update rooms with student information
  const updateRoomsWithStudents = (studentData: Student[]) => {
    setRooms(prevRooms => {
      return prevRooms.map(room => {
        // Find students assigned to this room
        const roomStudents = studentData.filter(student => 
          student.id && room.id && student.room_id === room.id
        );
        
        // Update room occupancy based on actual student count
        const actualOccupants = roomStudents.length;
        
        return {
          ...room,
          students: roomStudents,
          occupants: actualOccupants,
          status: getOccupancyLabel(actualOccupants)
        };
      });
    });
  };

  // Toggle showing students for a room
  const toggleShowStudents = (roomId: number) => {
    setRooms(prevRooms => {
      return prevRooms.map(room => {
        if (room.id === roomId) {
          return { ...room, showStudents: !room.showStudents };
        }
        return room;
      });
    });
  };

  // Navigate to student profile page
  const navigateToStudentProfile = (studentId: number) => {
    if (userIsAdmin) {
      navigate(`/admin/student-management/${studentId}`);
    }
  };

  // Initialize default rooms (1-10) if they don't exist
  const initializeDefaultRooms = async (existingRooms: Room[]) => {
    try {
      setInitializing(true);
      
      // Check if there are no rooms at all
      if (existingRooms.length === 0) {
        // Create default rooms 1-10
        console.log("Creating default rooms 1-10...");
        
        // Create 10 rooms one by one
        const newRooms = [];
        for (let roomNum = 1; roomNum <= 10; roomNum++) {
          try {
            const roomData = {
              room_number: roomNum.toString(),
              room_type: "Standard",
              status: "Vacant"
            };
            
            const response = await api.post('/rooms', roomData);
            
            newRooms.push({
              ...response.data,
              status: "0/4",
              occupants: 0
            });
            
            console.log(`Created room ${roomNum}`);
          } catch (error) {
            console.error(`Failed to create room ${roomNum}:`, error);
          }
        }
        
        // Update the rooms state with the new rooms
        setRooms([...existingRooms, ...newRooms]);
        console.log(`Created ${newRooms.length} default rooms`);
      }
      
    } catch (err) {
      console.error("Failed to initialize default rooms:", err);
      setError("Failed to initialize default rooms");
    } finally {
      setInitializing(false);
    }
  };

  // Helper to get the occupancy label
  const getOccupancyLabel = (occupants: number): string => {
    if (occupants >= 4) return "Fully Occupied";
    return `${occupants}/4`;
  };

  // Handle editing a room
  const handleEdit = (room: Room) => {
    setEditingRoom({ ...room });
  };

  // Handle saving edits
  const handleSave = async () => {
    if (!editingRoom) return;
    
    try {
      setLoading(true);
      
      // Prepare data for API
      const apiData = {
        room_number: editingRoom.room_number,
        room_type: "Standard", // We keep this as a default since we're not using type
        status: editingRoom.status
      };
      
      const response = await api.put(`/rooms/${editingRoom.id}`, apiData);
      
      // Update the rooms list and ensure sorting
      const updatedRooms = rooms.map(room => 
        room.id === editingRoom.id ? {
          ...response.data,
          status: getOccupancyLabel(editingRoom.occupants || 0),
          occupants: editingRoom.occupants
        } : room
      ).sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number));
      
      setRooms(updatedRooms);
      
      setEditingRoom(null);
    } catch (err) {
      console.error("Failed to update room:", err);
      setError("Failed to update room");
    } finally {
      setLoading(false);
    }
  };

  // Handle occupancy selection directly
  const handleOccupancySelect = (room: Room, occupancy: number) => {
    if (editingRoom && editingRoom.id === room.id) {
      setEditingRoom({
        ...editingRoom,
        occupants: occupancy,
        status: getOccupancyLabel(occupancy)
      });
    }
  };

  // Handle canceling edits
  const handleCancelEdit = () => {
    setEditingRoom(null);
  };

  // Handle deleting a room
  const handleDelete = async (roomId: number) => {
    if (!confirm("Are you sure you want to delete this room?")) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      try {
        await api.delete(`/rooms/${roomId}`);
        
        // Get updated room list after deletion
        const response = await api.get('/rooms');
        const updatedRooms = response.data;
        
        // Transform the updated rooms data
        const transformedRooms = updatedRooms.map((room: any) => {
          // Get the occupancy count from the status
          const occupants = room.status === 'Vacant' ? 0 : 
                          (room.status === 'Occupied' ? 4 : 
                            // Try to parse if it's a ratio format
                            parseInt(room.status.split('/')[0]) || 0);
          
          return {
            id: room.id,
            room_number: room.room_number,
            status: getOccupancyLabel(occupants),
            occupants,
            showStudents: false
          };
        });
        
        // Sort rooms by room number in ascending order
        const sortedRooms = [...transformedRooms].sort((a, b) => 
          parseInt(a.room_number) - parseInt(b.room_number)
        );
        
        // Update the rooms state with the rearranged and sorted rooms
        setRooms(sortedRooms);
        
        // Show success message
        setError(null);
      } catch (err: any) {
        console.error("Failed to delete room:", err);
        
        // Handle specific error cases
        if (err.response) {
          // The request was made and the server responded with an error status
          const errorData = err.response.data;
          
          if (err.response.status === 400 && errorData.message?.includes('assigned students')) {
            // Room has students assigned
            if (errorData.detail) {
              setError(`${errorData.detail}. Please reassign these students to another room first.`);
            } else {
              setError("Cannot delete room with assigned students. Please reassign students to another room first.");
            }
          } else {
            // Other server errors
            setError(`Failed to delete room: ${errorData.message || 'Unknown error'}`);
          }
        } else if (err.request) {
          // The request was made but no response was received
          setError("Failed to delete room: No response from server. Please check your connection.");
        } else {
          // Something happened in setting up the request
          setError(`Failed to delete room: ${err.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error("Error in delete handler:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new room
  const handleAddNew = () => {
    // Get room numbers and sort them
    const existingNumbers = rooms.map(r => parseInt(r.room_number)).sort((a, b) => a - b);
    let nextNumber = 1;
    
    // Find the first gap in the sequence
    for (let i = 0; i < existingNumbers.length; i++) {
      if (existingNumbers[i] !== i + 1) {
        nextNumber = i + 1;
        break;
      }
      // If we've checked all numbers and found no gaps, use the next number
      if (i === existingNumbers.length - 1) {
        nextNumber = existingNumbers.length + 1;
      }
    }
    
    // If there are no rooms at all, start with 1
    if (existingNumbers.length === 0) {
      nextNumber = 1;
    }
    
    setNewRoom({
      room_number: nextNumber.toString(),
      status: "0/4",
      occupants: 0
    });
  };

  // Handle saving a new room
  const handleSaveNew = async () => {
    if (!newRoom) return;
    
    try {
      setLoading(true);
      
      // Prepare data for API
      const apiData = {
        room_number: newRoom.room_number,
        room_type: "Standard", // Default type
        status: "Vacant" // New rooms start vacant
      };
      
      const response = await api.post('/rooms', apiData);
      
      // Add the new room to the list and sort by room number
      const updatedRooms = [...rooms, {
        ...response.data,
        id: response.data.id,
        status: "0/4",
        occupants: 0
      }].sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number));
      
      setRooms(updatedRooms);
      
      setNewRoom(null);
    } catch (err) {
      console.error("Failed to create room:", err);
      setError("Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Room Management</h1>
        
        {userIsAdmin && !newRoom && (
          <button 
            onClick={handleAddNew}
            className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/80 transition"
            disabled={initializing}
          >
            <Plus size={16} />
            Add Room
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {initializing && (
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-6">
          Initializing default rooms (1-10)... Please wait.
        </div>
      )}
      
      {loading && rooms.length === 0 ? (
        <div className="py-8 text-center">Loading room data...</div>
      ) : (
        <div className="bg-white/80 rounded-lg overflow-hidden shadow">
          <table className="min-w-full">
            <thead className="text-left bg-primary text-white">
              <tr>
                <th className="p-4">Room Number</th>
                <th className="p-4">Occupancy Status</th>
                {userIsAdmin && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {/* New room form */}
              {userIsAdmin && newRoom && (
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="p-4">
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                      value={newRoom.room_number}
                      onChange={e => setNewRoom({...newRoom, room_number: e.target.value})}
                      placeholder="Room number"
                    />
                  </td>
                  <td className="p-4">0/4</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={handleSaveNew}
                        className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                      >
                        <Save size={16} />
                      </button>
                      <button 
                        onClick={() => setNewRoom(null)}
                        className="bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              
              {/* Existing rooms - sorted by room number */}
              {[...rooms]
                .sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number))
                .map(room => {
                const roomKey = `room-${room.id}`;
                // Use array instead of React.Fragment to avoid the data-lov-id warning
                return [
                  // First row - Room information
                  <tr key={`${roomKey}-info`} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-4">
                      {editingRoom && editingRoom.id === room.id ? (
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                          value={editingRoom.room_number}
                          onChange={e => setEditingRoom({...editingRoom, room_number: e.target.value})}
                        />
                      ) : (
                        room.room_number
                      )}
                    </td>
                    <td className={`p-4 ${room.status === "Full" || room.status === "Fully Occupied" ? "text-red-600 font-semibold" : (room.status === "0/4" ? "text-green-700 font-semibold" : "text-orange-500 font-semibold")}`}>
                      {editingRoom && editingRoom.id === room.id ? (
                        <select 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={editingRoom.occupants}
                          onChange={(e) => handleOccupancySelect(room, parseInt(e.target.value))}
                        >
                          <option value="0">0/4 (Vacant)</option>
                          <option value="1">1/4</option>
                          <option value="2">2/4</option>
                          <option value="3">3/4</option>
                          <option value="4">4/4 (Full)</option>
                        </select>
                      ) : (
                        <div className="flex items-center">
                          <span className="mr-2">{room.status === "Fully Occupied" ? "Full" : room.status}</span>
                          {userIsAdmin && room.occupants > 0 && (
                            <button 
                              onClick={() => toggleShowStudents(room.id)}
                              className="text-blue-500 hover:text-blue-700"
                              title={room.showStudents ? "Hide students" : "Show students"}
                            >
                              {room.showStudents ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    {userIsAdmin && (
                      <td className="p-4 text-right">
                        {editingRoom && editingRoom.id === room.id ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={handleSave}
                              className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                            >
                              <Save size={16} />
                            </button>
                            <button 
                              onClick={handleCancelEdit}
                              className="bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(room)}
                              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(room.id)}
                              className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>,
                  
                  // Second row - Student details (conditionally rendered)
                  ...(userIsAdmin && room.showStudents ? [
                    <tr key={`${roomKey}-students`} className="bg-blue-50">
                      <td colSpan={userIsAdmin ? 3 : 2} className="p-4">
                        <div className="border-l-4 border-blue-400 pl-4">
                          <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                            <Users size={16} className="mr-2" />
                            Students in Room {room.room_number}
                          </h3>
                          
                          {room.students && room.students.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {room.students.map(student => (
                                <div 
                                  key={`student-${student.id}`} 
                                  className="flex items-center bg-white p-3 rounded shadow-sm hover:bg-blue-50 cursor-pointer transition-colors"
                                  onClick={() => navigateToStudentProfile(student.id)}
                                  title="Click to view student profile"
                                >
                                  {student.profile_picture ? (
                                    <img 
                                      src={getProfilePictureUrl(student.profile_picture)}
                                      alt={student.name}
                                      className="w-10 h-10 rounded-md object-cover mr-3"
                                      onError={(e) => {
                                        // If image fails to load, replace with default user icon
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center mr-3 ${student.profile_picture ? 'hidden' : ''}`}>
                                    <User size={16} className="text-gray-500" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{student.name}</div>
                                    <div className="text-sm text-gray-600">{student.roll_number}</div>
                                    {student.course && <div className="text-xs text-gray-500">{student.course}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500">No students assigned to this room yet.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ] : [])
                ];
              })}
              
              {/* Empty state */}
              {rooms.length === 0 && !newRoom && (
                <tr>
                  <td colSpan={userIsAdmin ? 3 : 2} className="p-8 text-center text-gray-500">
                    No rooms found. {userIsAdmin && "Click 'Add Room' to create one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RoomPage;
