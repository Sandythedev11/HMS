import axios from 'axios';

export const API_URL = "http://localhost:5000/api";

// Create a pre-configured axios instance for API requests
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  // Explicitly set to false to prevent CORS issues
  withCredentials: false
});

// Add a request interceptor to handle authentication
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    
    // Log token details for debugging
    console.log("API Request:", config.url, {
      method: config.method,
      tokenPresent: !!token,
    });
    
    // If token exists, add it to the headers
    if (token) {
      // Make sure we use the correct format
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log for debugging
      console.log("Adding auth header:", config.headers.Authorization.substring(0, 25) + "...");
    }
    
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific errors
    if (error.response) {
      // Check if there are CORS headers in the response
      const corsHeaderPresent = error.response.headers && 
                             (error.response.headers['access-control-allow-origin'] || 
                              error.response.headers['Access-Control-Allow-Origin']);
                              
      console.log("CORS headers present:", corsHeaderPresent);
      
      // Get more detailed error info from the response if available
      let errorDetails = '';
      try {
        if (error.response.data && error.response.data.error) {
          errorDetails = ` - ${error.response.data.error}`;
        } else if (error.response.data && error.response.data.message) {
          errorDetails = ` - ${error.response.data.message}`;
        } 
      } catch (e) {
        errorDetails = '';
      }
      
      // Handle 401 Unauthorized and 422 Unprocessable Entity
      if (error.response.status === 401 || error.response.status === 422) {
        console.error(`Authentication error: ${error.response.status}${errorDetails}`);
        
        // Log the token for debugging
        const token = localStorage.getItem('token');
        if (token) {
          console.log('Token used:', token.substring(0, 20) + '...');
        }
      } else if (error.response.status === 500) {
        console.error(`Server error (${error.response.status})${errorDetails}`);
      } else if (error.response.status === 403) {
        console.error(`Forbidden (${error.response.status})${errorDetails}`);
      } else if (error.response.status === 405) {
        console.error(`Method not allowed (${error.response.status})${errorDetails}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error - no response received:', error.message);
      
      // Check if this might be a CORS issue
      if (error.message && (
          error.message.includes('CORS') || 
          error.message.includes('cross-origin') ||
          error.message.includes('Network Error')
      )) {
        console.error('Possible CORS issue detected. Try using the directFetch method instead.');
      }
      
      // Log additional information for debugging
      console.log('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headers: error.config?.headers
      });
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Specialized function for updating student profile with multiple fallbacks
export const updateStudentProfile = async (studentId: number, profileData: any, isEnrollmentRequest: boolean = false) => {
  // Create a clean copy of the data without profile_picture
  const cleanedData = { ...profileData };
  if ('profile_picture' in cleanedData) {
    delete cleanedData.profile_picture;
  }
  
  // Add a timestamp
  const timestamp = new Date().toISOString();
  
  // Explicitly set enrollment request flag if requested
  if (isEnrollmentRequest) {
    cleanedData.is_enrollment_requested = true;
  }
  
  const dataWithTimestamp = {
    ...cleanedData,
    last_update: timestamp
  };
  
  console.log('Updating student profile with data:', dataWithTimestamp);
  
  // Broadcast an event to update the UI
  const broadcastUpdate = (success: boolean = true, data: any = null) => {
    try {
      const updateEvent = new CustomEvent('student-profile-updated', {
        detail: { studentId, timestamp, success, data }
      });
      window.dispatchEvent(updateEvent);
    } catch (e) {
      console.error('Failed to broadcast update event:', e);
    }
  };
  
  try {
    let response;
    
    // Determine if this is an enrollment request
    let isEnrollmentRequested = isEnrollmentRequest;
    
    if (profileData instanceof FormData) {
      // For FormData, we need to use a different approach
      // First, convert FormData to a plain object
      const formDataObj: Record<string, any> = {};
      
      // Copy all entries from the FormData to our object
      for (const pair of profileData.entries()) {
        const key = pair[0];
        const value = pair[1];
        
        // Handle file objects separately
        if (value instanceof File) {
          // Skip files for now - we'll handle them separately if needed
          continue;
        } else {
          formDataObj[key] = value;
        }
        
        // Check if this form has the enrollment request flag
        if (key === 'is_enrollment_requested' && value === 'true') {
          isEnrollmentRequested = true;
        }
      }
      
      // Add timestamp
      formDataObj.last_update = timestamp;
      
      // Always set the enrollment request flag explicitly
      formDataObj.is_enrollment_requested = isEnrollmentRequested;
      
      console.log('Sending profile update with data:', formDataObj);
      
      // Use the dedicated student profile update endpoint with JSON
      response = await api.post(`/student/profile`, formDataObj);
      
      // If this is an enrollment request, also update the student status
      if (isEnrollmentRequested) {
        try {
          // Use the admin endpoint to mark this student as pending
          await api.put(`/admin/students/mark-pending/${studentId}`, {
            is_pending: true
          });
          console.log(`Student ${studentId} marked as pending for enrollment`);
        } catch (enrollErr) {
          console.error('Failed to mark student as pending:', enrollErr);
          // Continue anyway as the profile was updated successfully
        }
      }
    } else {
      // For JSON data
      response = await api.post(`/student/profile`, dataWithTimestamp);
    }
    
    console.log(`Profile successfully updated:`, response.data);
    
    // Broadcast update
    broadcastUpdate(true, response.data.student);
    return true;
  } catch (err) {
    console.error('Failed to update student profile:', err);
    
    // Try one fallback with direct fetch if the main attempt fails
    try {
      console.log('Trying direct fetch as fallback...');
      const directResponse = await directFetch('/student/profile', {
        method: 'POST',
        body: JSON.stringify(dataWithTimestamp)
      });
      
      console.log('Profile update succeeded with fallback:', directResponse);
      broadcastUpdate(true, directResponse.student);
      return true;
    } catch (fallbackErr) {
      console.error('All profile update attempts failed:', fallbackErr);
      broadcastUpdate(false, null);
      throw fallbackErr;
    }
  }
};

// For emergency debugging - a direct fetch function that bypasses axios
export const directFetch = async (endpoint: string, options?: RequestInit) => {
  try {
    const token = localStorage.getItem('token');
    const url = `${API_URL}${endpoint}`;
    
    console.log(`Direct fetch to ${url}`);
    
    // Create base headers
    const baseHeaders: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      baseHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // Merge headers with any provided in options
    const mergedHeaders: HeadersInit = {
      ...baseHeaders,
      ...(options?.headers || {})
    };
    
    // Create request options
    const requestOptions: RequestInit = {
      method: 'GET',
      credentials: 'omit',
      ...options,
      // Use the merged headers
      headers: mergedHeaders
    };
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Direct fetch response:', data);
    return data;
  } catch (err) {
    console.error('Direct fetch error:', err);
    throw err;
  }
};

// Helper function to get the full URL for a profile picture
export const getProfilePictureUrl = (profilePicture: string | undefined | null): string | null => {
  if (!profilePicture) return null;
  
  // If it's already a full URL, return as is
  if (profilePicture.startsWith('http')) return profilePicture;
  
  // Otherwise, construct the full URL using the API base URL
  return `${API_URL}/${profilePicture}`;
};

// Function to upload profile picture
export const uploadProfilePicture = async (file: File) => {
  try {
    console.log('uploadProfilePicture: Starting upload for file:', file.name, 'Size:', file.size);
    
    const formData = new FormData();
    formData.append('profile_picture', file);

    // Create a special instance for file uploads
    const uploadApi = axios.create({
      baseURL: API_URL,
      withCredentials: false
    });

    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      uploadApi.defaults.headers.Authorization = `Bearer ${token}`;
      console.log('uploadProfilePicture: Using auth token');
    } else {
      console.warn('uploadProfilePicture: No auth token found');
    }

    console.log('uploadProfilePicture: Making request to /student/upload-profile-picture');

    const response = await uploadApi.post('/student/upload-profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('uploadProfilePicture: Upload successful!', response.data);
    console.log('uploadProfilePicture: Received URL:', response.data.profile_picture_url);

    return response.data;
  } catch (error: any) {
    console.error('uploadProfilePicture: Failed to upload profile picture:', error);
    
    if (error.response) {
      console.error('uploadProfilePicture: Server response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('uploadProfilePicture: Request was made but no response received:', error.request);
    } else {
      console.error('uploadProfilePicture: Request setup error:', error.message);
    }
    
    throw error;
  }
}; 