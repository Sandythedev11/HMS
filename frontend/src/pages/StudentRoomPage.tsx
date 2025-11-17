import { useState, useEffect } from "react";
import { Bed, MapPin, User, Users, ChevronDown, ChevronUp } from "lucide-react";
import api, { directFetch, API_URL } from "../utils/api";

interface RoomDetails {
  id: number;
  room_number: string;
  room_type: string;
  status: string;
}

interface Roommate {
  id: number;
  name: string;
  roll_number: string;
  profile_picture?: string;
}

interface StudentProfile {
  id: number;
  user_id: number;
  room_id?: number;
  room_number?: string;
  room_type?: string;
  profile_picture?: string;
}

// Helper function to format profile picture URLs correctly
const getProfileImageUrl = (url?: string | null): string | null => {
  if (!url) {
    console.log("getProfileImageUrl: No URL provided");
    return null;
  }
  
  // If it's already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log(`getProfileImageUrl: URL already complete: ${url}`);
    return url;
  }
  
  // If it starts with /api, remove it
  if (url.startsWith('/api/')) {
    url = url.substring(5);
    console.log(`getProfileImageUrl: Removed /api/ prefix: ${url}`);
  } 
  // If it starts with a slash, remove it
  else if (url.startsWith('/')) {
    url = url.substring(1);
    console.log(`getProfileImageUrl: Removed leading slash: ${url}`);
  }
  
  // Return the full URL
  const fullUrl = `${API_URL}/${url}`;
  console.log(`getProfileImageUrl: Formatted URL: ${fullUrl}`);
  return fullUrl;
};

const StudentRoomPage = () => {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoommates, setShowRoommates] = useState(false);

  useEffect(() => {
    const loadStudentProfile = async () => {
      try {
        setLoading(true);
        console.log("StudentRoomPage: Loading student profile...");
        
        // Try different approaches to get student data
        let success = false;
        let data = null;
        
        try {
          const response = await api.get('/student/profile');
          data = response.data;
          success = true;
          console.log("StudentRoomPage: Loaded profile from main API endpoint");
        } catch (err1) {
          console.error("Failed to fetch student profile with main endpoint:", err1);
          
          try {
            const fetchData = await directFetch('/student/profile');
            data = fetchData;
            success = true;
            console.log("StudentRoomPage: Loaded profile from direct fetch");
          } catch (err2) {
            console.error("Failed with direct fetch:", err2);
            
            try {
              const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
              if (userId) {
                const response = await api.get('/admin/students/approved');
                const currentStudent = response.data.find((s: any) => s.user_id === userId);
                if (currentStudent) {
                  data = currentStudent;
                  success = true;
                  console.log("StudentRoomPage: Loaded profile from approved students list");
                }
              }
            } catch (err3) {
              console.error("All approaches failed:", err3);
              success = false;
            }
          }
        }
        
        if (success && data) {
          console.log("StudentRoomPage: Raw student data:", data);
          
          // Fix profile picture URL if it exists
          if (data.profile_picture) {
            data.profile_picture = getProfileImageUrl(data.profile_picture);
            console.log(`StudentRoomPage: Processed student profile picture: ${data.profile_picture}`);
          }
          
          setStudent(data);
          
          // If student has a room assigned, fetch roommates
          if (data.room_id) {
            try {
              console.log(`StudentRoomPage: Fetching roommates for room_id: ${data.room_id}`);
              const response = await api.get(`/student/roommates?room_id=${data.room_id}`);
              console.log("StudentRoomPage: Raw roommates data:", response.data);
              
              // Process roommate data to ensure profile pictures are correctly formatted
              const processedRoommates = response.data
                .filter((r: Roommate) => r.id !== data.id)
                .map((roommate: Roommate) => {
                  const processed = { ...roommate };
                  if (roommate.profile_picture) {
                    processed.profile_picture = getProfileImageUrl(roommate.profile_picture);
                    console.log(`StudentRoomPage: Processed roommate (${roommate.name}) profile picture: ${processed.profile_picture}`);
                  } else {
                    console.log(`StudentRoomPage: Roommate (${roommate.name}) has no profile picture`);
                  }
                  return processed;
                });
              
              console.log("StudentRoomPage: Processed roommates:", processedRoommates);
              setRoommates(processedRoommates);
              
              // If there are roommates, automatically expand the section
              if (processedRoommates.length > 0) {
                setShowRoommates(true);
              }
            } catch (err) {
              console.error("Failed to fetch roommates:", err);
              setRoommates([]);
            }
          }
        } else {
          setError("Could not load your profile. Please try again later.");
        }
      } catch (err) {
        console.error("Failed to load student profile:", err);
        setError("Error loading profile data");
      } finally {
        setLoading(false);
      }
    };

    loadStudentProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md my-4">
        {error}
      </div>
    );
  }

  // Render fallback for image error
  const renderImageWithFallback = (src: string | null | undefined, alt: string, className: string = "w-12 h-12 rounded-full object-cover") => {
    if (!src) {
      return (
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="w-6 h-6 text-gray-500" />
        </div>
      );
    }
    
    return (
      <img 
        src={src}
        alt={alt}
        className={className}
        onError={(e) => {
          console.error(`Failed to load image: ${src} for ${alt}`);
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.className = 'w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center';
            fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
            parent.appendChild(fallback);
          }
        }}
      />
    );
  };

  return (
    <div className="py-8 max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-7 flex gap-2 items-center">
        <Bed className="text-primary" /> Room Details
      </h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        {student?.room_number ? (
          <div>
            {/* Room Information */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-gray-800 flex items-center gap-2">
                  <Bed className="text-primary w-5 h-5" />
                  Room {student.room_number}
                </h2>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  Assigned
                </span>
              </div>
              <p className="text-gray-600 mt-2">Type: {student.room_type || "Standard"}</p>
            </div>
            
            {/* Roommates Section - Collapsible */}
            <div className="mt-8 border-t pt-6">
              <button
                onClick={() => setShowRoommates(!showRoommates)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-medium text-gray-700 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  Your Roommates
                  <span className="ml-2 text-sm text-gray-500">
                    ({roommates.length})
                  </span>
                </h3>
                {showRoommates ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {showRoommates && (
                <div className="mt-4 space-y-4">
                  {roommates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {roommates.map(roommate => (
                        <div key={roommate.id} className="flex items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <div className="flex-shrink-0">
                            {renderImageWithFallback(roommate.profile_picture, roommate.name)}
                          </div>
                          <div className="ml-4">
                            <h4 className="font-medium text-gray-800">{roommate.name}</h4>
                            <p className="text-sm text-gray-500">{roommate.roll_number}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 bg-gray-50 p-4 rounded-md">
                      You don't have any roommates at the moment.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <MapPin className="text-orange-500 h-16 w-16 mb-4" />
            <h3 className="text-xl font-medium text-orange-700 mb-2">Room Allocation Pending</h3>
            <p className="text-gray-600 max-w-md">
              You haven't been assigned a room yet. The hostel administration will allocate a room for you soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentRoomPage; 