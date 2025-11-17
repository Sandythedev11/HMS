import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Trash2, Save, X, ArrowLeft, User, Mail, Book, Calendar, Home } from "lucide-react";
import api from "../utils/api";
import { logout, isAdmin } from "../utils/auth";

interface Student {
  id: number;
  user_id: number;
  roll_number: string;
  name: string;
  email: string;
  course?: string;
  join_date?: string;
  room_number?: string;
  room_id?: number;
  profile_picture?: string;
  is_approved: boolean;
}

const ApprovedStudentsPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<{id: number, room_number: string}[]>([]);

  // Fetch approved students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        // Check if user is admin
        if (!isAdmin()) {
          setError("Unauthorized access");
          navigate("/login");
          return;
        }
        
        const response = await api.get('/admin/students/approved');
        setStudents(response.data);
        
        // Also fetch rooms for editing
        const roomsResponse = await api.get('/rooms');
        setRooms(roomsResponse.data.map((room: any) => ({
          id: room.id,
          room_number: room.room_number
        })));
        
      } catch (err) {
        console.error("Failed to fetch approved students:", err);
        setError("Failed to load student data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, [navigate]);

  // Handle editing a student
  const handleEdit = (student: Student) => {
    setEditingStudent({ ...student });
  };

  // Handle saving edits
  const handleSave = async () => {
    if (!editingStudent) return;
    
    try {
      setLoading(true);
      
      // Prepare data for API
      const apiData = {
        course: editingStudent.course,
        join_date: editingStudent.join_date,
        room_id: editingStudent.room_id,
        profile_picture: editingStudent.profile_picture
      };
      
      // The endpoint for updating is the same as approval since both modify student data
      await api.put(`/admin/students/approve/${editingStudent.id}`, apiData);
      
      // Update the students list
      setStudents(students.map(student => 
        student.id === editingStudent.id ? editingStudent : student
      ));
      
      setEditingStudent(null);
    } catch (err) {
      console.error("Failed to update student:", err);
      setError("Failed to update student");
    } finally {
      setLoading(false);
    }
  };

  // Handle canceling edits
  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  // Handle deleting a student
  const handleDelete = async (studentId: number) => {
    if (!confirm("Are you sure you want to remove this student? This action cannot be undone.")) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`/admin/students/reject/${studentId}`);
      
      // Update the students list
      setStudents(students.filter(student => student.id !== studentId));
    } catch (err) {
      console.error("Failed to delete student:", err);
      setError("Failed to remove student");
    } finally {
      setLoading(false);
    }
  };

  // Go back to admin dashboard
  const handleBack = () => {
    navigate("/admin/dashboard");
  };

  return (
    <div className="py-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center mb-6">
        <button 
          onClick={handleBack}
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold">Manage Students</h1>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {loading && students.length === 0 ? (
        <div className="py-8 text-center">Loading student data...</div>
      ) : (
        <>
          {students.length === 0 ? (
            <div className="bg-white/80 rounded-lg p-8 text-center text-gray-500">
              No approved students found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map(student => (
                <div key={student.id} className="bg-white/80 rounded-lg overflow-hidden shadow-md border border-gray-100">
                  <div className="p-6">
                    {/* Student Avatar */}
                    <div className="flex justify-center mb-4">
                      {student.profile_picture ? (
                        <img 
                          src={student.profile_picture} 
                          alt={student.name} 
                          className="w-24 h-24 rounded-md object-cover border-4 border-primary/20"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-md bg-primary/10 flex items-center justify-center">
                          <User size={36} className="text-primary/60" />
                        </div>
                      )}
                    </div>
                    
                    {/* Student Details */}
                    {editingStudent && editingStudent.id === student.id ? (
                      // Edit Form
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <div className="bg-gray-100 p-2 rounded">
                            {student.name}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <div className="bg-gray-100 p-2 rounded">
                            {student.email}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                          <div className="bg-gray-100 p-2 rounded">
                            {student.roll_number}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={editingStudent.course || ''}
                            onChange={e => setEditingStudent({...editingStudent, course: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={editingStudent.join_date || ''}
                            onChange={e => setEditingStudent({...editingStudent, join_date: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={editingStudent.room_id || ''}
                            onChange={e => setEditingStudent({
                              ...editingStudent, 
                              room_id: e.target.value ? parseInt(e.target.value) : undefined,
                              room_number: e.target.value ? 
                                rooms.find(r => r.id === parseInt(e.target.value))?.room_number : undefined
                            })}
                          >
                            <option value="">No Room Assigned</option>
                            {rooms.map(room => (
                              <option key={room.id} value={room.id}>
                                Room {room.room_number}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-4">
                          <button 
                            onClick={handleSave}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-1"
                          >
                            <Save size={16} />
                            Save
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 flex items-center gap-1"
                          >
                            <X size={16} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display View
                      <div>
                        <h2 className="text-xl font-bold text-center mb-2">{student.name}</h2>
                        <div className="flex justify-center mb-4">
                          <span className="bg-primary/10 text-primary/80 text-sm px-3 py-1 rounded-full">
                            {student.roll_number}
                          </span>
                        </div>
                        
                        <div className="space-y-3 mt-6">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail size={16} className="text-primary/70" />
                            <span>{student.email}</span>
                          </div>
                          
                          {student.course && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Book size={16} className="text-primary/70" />
                              <span>{student.course}</span>
                            </div>
                          )}
                          
                          {student.join_date && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar size={16} className="text-primary/70" />
                              <span>{new Date(student.join_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          
                          {student.room_number && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Home size={16} className="text-primary/70" />
                              <span>Room {student.room_number}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-6">
                          <button 
                            onClick={() => handleEdit(student)}
                            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                            title="Edit student"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                            title="Remove student"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApprovedStudentsPage; 