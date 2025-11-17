import { Info, Bed, Wallet, FileText, Calendar, MessageSquare, Clock, User, Book, MapPin, LogOut, Users, Edit, Check, X, Phone, Cake, Trash2, Reply, Send, Upload, Camera, Save, Home, Settings, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import api, { directFetch, updateStudentProfile, uploadProfilePicture } from "../utils/api";
import { logout, getUserInfo } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { notify } from "../utils/notifications";
import ProfileAvatar from "../components/ProfileAvatar";
import BackgroundSlideshow from "../components/BackgroundSlideshow";

// LatestNotices component to display the latest 3 notices
const LatestNotices = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatestNotices = async () => {
      try {
        setLoading(true);
        const response = await api.get('/notices');
        
        // API returns notices sorted by created_at in descending order (latest first)
        // Get the 3 most recent notices which are already sorted
        const latestNotices = response.data.slice(0, 3);
        setNotices(latestNotices);
        
        // Check for unread notices
        checkUnreadNotices(latestNotices);
      } catch (err) {
        console.error('Failed to fetch notices:', err);
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestNotices();
  }, []);
  
  // Check which notices are unread
  const checkUnreadNotices = (noticesList: any[]) => {
    // Get read notices from localStorage
    const readNoticesStr = localStorage.getItem('readNotices');
    const readNotices: number[] = readNoticesStr ? JSON.parse(readNoticesStr) : [];
    
    // Count unread notices
    const unread = noticesList.filter(notice => !readNotices.includes(notice.id)).length;
    setUnreadCount(unread);
  };
  
  // Mark a notice as read
  const markNoticeAsRead = (noticeId: number) => {
    // Get current read notices
    const readNoticesStr = localStorage.getItem('readNotices');
    const readNotices: number[] = readNoticesStr ? JSON.parse(readNoticesStr) : [];
    
    // Add this notice if not already included
    if (!readNotices.includes(noticeId)) {
      const updatedReadNotices = [...readNotices, noticeId];
      localStorage.setItem('readNotices', JSON.stringify(updatedReadNotices));
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    }
  };
  
  // Handle click on View All button
  const handleViewAllClick = () => {
    navigate('/notice');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-primary flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Latest Notices
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </h2>
        <button 
          onClick={handleViewAllClick}
          className="text-primary hover:text-primary/80 text-sm font-medium flex items-center"
        >
          View All
          {unreadCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
        {loading ? (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center p-6 text-gray-500">
            No notices available
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => {
              // Check if this notice has been read
              const readNoticesStr = localStorage.getItem('readNotices');
              const readNotices: number[] = readNoticesStr ? JSON.parse(readNoticesStr) : [];
              const isUnread = !readNotices.includes(notice.id);
              
              return (
                <div 
                  key={notice.id} 
                  className={`border-b border-gray-100 last:border-b-0 pb-3 last:pb-0 ${isUnread ? 'relative' : ''}`}
                  onClick={() => markNoticeAsRead(notice.id)}
                >
                  {isUnread && (
                    <span className="absolute right-0 top-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">{formatDate(notice.created_at)}</span>
                    {isUnread && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">New</span>
                    )}
                  </div>
                  <h3 className={`font-medium ${isUnread ? 'text-primary' : ''}`}>{notice.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{notice.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Recent Complaints component to display student complaints in social media format
const RecentComplaints = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", details: "" });
  const navigate = useNavigate();
  const user = getUserInfo();

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        const response = await api.get('/complaints');
        // Get the 5 most recent complaints
        const recentComplaints = response.data.slice(0, 5);
        setComplaints(recentComplaints);
      } catch (err) {
        console.error('Failed to fetch complaints:', err);
        setError('Failed to load complaints. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const handleEdit = (complaint: any) => {
    setEditingComplaint(complaint.id);
    setEditForm({
      subject: complaint.subject,
      details: complaint.details
    });
  };

  const handleEditChange = (key: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUpdateComplaint = async (complaintId: number) => {
    try {
      const response = await api.put(`/complaints/${complaintId}`, editForm);
      setComplaints(prev => 
        prev.map(c => c.id === complaintId ? { ...c, ...response.data } : c)
      );
      setEditingComplaint(null);
      
      // Show success notification
      notify.success(
        "Complaint Updated", 
        "Your complaint has been updated successfully."
      );
    } catch (err) {
      console.error('Failed to update complaint:', err);
      notify.error(
        "Update Failed", 
        "There was an error updating your complaint. Please try again."
      );
    }
  };

  const handleDeleteComplaint = async (complaintId: number) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try {
        // Find the complaint to be deleted for undo functionality
        const complaintToDelete = complaints.find(c => c.id === complaintId);
        if (!complaintToDelete) return;
        
        const { subject, details } = complaintToDelete;
        
        await api.delete(`/complaints/${complaintId}`);
        setComplaints(prev => prev.filter(c => c.id !== complaintId));
        
        // Show success notification with undo option
        notify.withUndo(
          "Complaint Deleted",
          "Your complaint has been removed.",
          async () => {
            try {
              // Recreate the deleted complaint
              const response = await api.post('/complaints', {
                subject,
                details,
                user_id: user?.id,
                student_name: user?.name || 'Student'
              });
              
              // Update state with the restored complaint
              setComplaints(prev => [response.data, ...prev]);
              
              notify.success(
                "Complaint Restored", 
                "Your complaint has been restored successfully."
              );
            } catch (err) {
              console.error('Failed to restore complaint:', err);
              notify.error(
                "Restore Failed", 
                "There was an error restoring your complaint."
              );
            }
          }
        );
      } catch (err) {
        console.error('Failed to delete complaint:', err);
        notify.error(
          "Delete Failed", 
          "There was an error deleting your complaint. Please try again."
        );
      }
    }
  };

  const handleReply = (complaintId: number) => {
    setReplyingTo(complaintId);
    setReplyContent("");
  };

  const submitReply = async (complaintId: number) => {
    try {
      setSubmittingReply(true);
      const payload = {
        content: replyContent,
        is_admin: false
      };
      
      const response = await api.post(`/complaints/${complaintId}/replies`, payload);
      
      setComplaints(prev => 
        prev.map(c => {
          if (c.id === complaintId) {
            return {
              ...c,
              replies: [...(c.replies || []), response.data]
            };
          }
          return c;
        })
      );
      
      setReplyingTo(null);
      setReplyContent("");
      
      // Show success notification
      notify.success(
        "Reply Sent", 
        "Your reply has been sent successfully."
      );
    } catch (err) {
      console.error('Failed to submit reply:', err);
      notify.error(
        "Reply Failed", 
        "There was an error sending your reply. Please try again."
      );
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-primary flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Recent Complaints
        </h2>
        <button 
          onClick={() => navigate('/complaint')}
          className="text-primary hover:text-primary/80 text-sm font-medium flex items-center"
        >
          View All
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center p-6 text-gray-500 bg-white/90 rounded-xl shadow border">
          No complaints found
        </div>
      ) : (
        <div className="space-y-6">
          {complaints.map(complaint => (
            <div key={complaint.id} className="bg-white/90 rounded-xl shadow p-5 border">
              {/* Complaint header with profile picture */}
              <div className="flex items-start space-x-4">
                <ProfileAvatar
                  src={complaint.student_profile_picture}
                  alt={complaint.student_name}
                  size="md"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-primary">
                        {editingComplaint === complaint.id ? (
                          <input
                            type="text"
                            className="w-full px-2 py-1 border rounded"
                            value={editForm.subject}
                            onChange={e => handleEditChange("subject", e.target.value)}
                            required
                          />
                        ) : (
                          complaint.subject
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(complaint.created_at)}
                      </p>
                    </div>
                    
                    {/* Edit/Delete buttons */}
                    {editingComplaint !== complaint.id && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(complaint)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteComplaint(complaint.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                    
                    {/* Save/Cancel buttons when editing */}
                    {editingComplaint === complaint.id && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleUpdateComplaint(complaint.id)}
                          className="text-green-500 hover:text-green-700"
                        >
                          <Save size={18} />
                        </button>
                        <button 
                          onClick={() => setEditingComplaint(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Complaint content */}
                  <div className="mt-2">
                    {editingComplaint === complaint.id ? (
                      <textarea
                        className="w-full px-3 py-2 border rounded min-h-[80px]"
                        value={editForm.details}
                        onChange={e => handleEditChange("details", e.target.value)}
                        required
                      />
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">{complaint.details}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies section */}
              <div className="mt-4 pl-14 border-t pt-4">
                {/* Existing replies */}
                <div className="space-y-3">
                  {complaint.replies?.map((reply: any) => (
                    <div 
                      key={reply.id}
                      className={`p-3 rounded-lg ${
                        reply.is_admin ? 'bg-blue-50 ml-4' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${
                          reply.is_admin ? 'text-blue-600' : 'text-gray-800'
                        }`}>
                          {reply.user_name} {reply.is_admin && '(Admin)'}
                        </span>
                        <span className="text-xs text-gray-500">
                          • {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{reply.content}</p>
                    </div>
                  ))}
                </div>

                {/* Reply form */}
                {replyingTo === complaint.id ? (
                  <div className="mt-3">
                    <textarea
                      placeholder="Write your reply..."
                      className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => submitReply(complaint.id)}
                        disabled={submittingReply || !replyContent.trim()}
                        className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-md text-sm disabled:opacity-50"
                      >
                        <Send size={14} />
                        {submittingReply ? "Sending..." : "Send Reply"}
                      </button>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleReply(complaint.id)}
                    className="mt-2 text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Reply size={14} />
                    Reply
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Disable console errors in production in a safer way
if (process.env.NODE_ENV !== 'development') {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Check if this is an API-related error that we want to suppress
    const errorStr = args.join(' ');
    if (errorStr.includes('405') || 
        errorStr.includes('METHOD NOT ALLOWED') ||
        errorStr.includes('Failed to fetch') ||
        errorStr.includes('Network Error') ||
        errorStr.includes('API update failed')) {
      // Suppress the error or log it differently
      console.log('Suppressed API error:', ...args);
      return;
    }
    // Otherwise, pass to the original console.error
    originalConsoleError.apply(console, args);
  };
}

// Create a proper interface for cards
interface CardItem {
  title: string;
  icon: React.ElementType;
  url: string;
  notificationCount?: number;
  onClick?: () => void;
}

// Update cards with onClick support
const cards: CardItem[] = [
  { title: "Notices", icon: Info, url: "/notice" },
  { title: "Pay Fees", icon: Wallet, url: "/fee-payment" },
  { title: "Room Details", icon: Bed, url: "/student-room" },
  { title: "Complaints", icon: MessageSquare, url: "/complaint" },
  { title: "Feedback", icon: FileText, url: "/feedback" }
  // Attendance card removed
];

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
  status?: 'active' | 'removed' | 'rejected';
  is_enrollment_requested?: boolean;
  approval_date?: string;
}

interface Roommate {
  id: number;
  name: string;
  roll_number: string;
  profile_picture?: string;
}

const StudentDashboard = () => {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<StudentProfile>>({});
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<React.ReactNode | null>(null);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<boolean>(false);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [unreadNoticesCount, setUnreadNoticesCount] = useState(0);
  const [unreadFeeNotifications, setUnreadFeeNotifications] = useState(0);
  const [unreadComplaintReplies, setUnreadComplaintReplies] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  // Add new state for profile completion
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [profileCompletionForm, setProfileCompletionForm] = useState({
    course: '',
    contact_number: '',
    date_of_birth: '',
    semesters_requested: 1,
    profile_picture: null as File | null
  });
  const [profileCompletionLoading, setProfileCompletionLoading] = useState(false);
  const [profileCompletionError, setProfileCompletionError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  
  // Extract profile loading logic to a memoized function to avoid dependency issues
  const loadStudentProfile = useCallback(async (forceReload = false) => {
    try {
      setLoading(true);
      
      // Clear any cached data if forceReload is true
      if (forceReload) {
        console.log("Force reloading student profile...");
      }
      
      // Try different approaches in sequence
      let success = false;
      let data = null;
      
      // Approach 1: Use the new dedicated endpoint
      try {
        const response = await api.get('/student/profile');
        console.log("Student profile response:", response.data);
        data = response.data;
        success = true;
      } catch (err1) {
        console.error("Failed to fetch student profile with main endpoint:", err1);
        
        // Approach 2: Try direct fetch as fallback
        try {
          console.log("Trying direct fetch...");
          const fetchData = await directFetch('/student/profile');
          console.log("Student profile response (fetch):", fetchData);
          data = fetchData;
          success = true;
        } catch (err2) {
          console.error("Failed with direct fetch:", err2);
          
          // Fallback to the old method as last resort
          try {
            const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
            if (userId) {
              const response = await api.get('/admin/students/approved');
              // Find the student with matching user_id
              const currentStudent = response.data.find((s: any) => s.user_id === userId);
              if (currentStudent) {
                data = currentStudent;
                success = true;
              }
            }
          } catch (err3) {
            console.error("All approaches failed:", err3);
            success = false;
          }
        }
      }
      
      if (success && data) {
        console.log("Successfully loaded student data:", data);
        console.log("Student approval status:", data.is_approved);
        console.log("Student enrollment request status:", data.is_enrollment_requested);
        
        // Check for approval status change and show notification
        await checkForApprovalNotification(data);
        
        setStudent(data);
        setProfileForm({
          name: data.name,
          course: data.course || '',
          contact_number: data.contact_number || '',
          date_of_birth: data.date_of_birth || '',
          semesters_requested: data.semesters_requested || 1,
        });
        
        // If student has a room assigned, fetch roommates
        if (data.room_id) {
          try {
            const response = await api.get(`/student/roommates?room_id=${data.room_id}`);
            // Filter out the current student from the roommates list
            const otherRoommates = response.data.filter((r: Roommate) => r.id !== data.id);
            setRoommates(otherRoommates);
          } catch (err) {
            console.error("Failed to fetch roommates:", err);
            // Don't block the dashboard if roommates can't be fetched
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
  }, []);  // Empty dependency array as this only needs to run once on mount
  
  // Function to check for approval notifications and show toast
  const checkForApprovalNotification = async (studentData: StudentProfile) => {
    try {
      // Check if student was recently approved
      if (studentData.is_approved && studentData.approval_date) {
        const approvalDate = new Date(studentData.approval_date);
        const now = new Date();
        const daysSinceApproval = Math.floor((now.getTime() - approvalDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Show toast if approved within last 7 days and not already shown
        if (daysSinceApproval <= 7) {
          const notificationKey = `approval_notification_${studentData.id}`;
          const hasShownNotification = localStorage.getItem(notificationKey);
          
          if (!hasShownNotification) {
            notify.success("🎉 Enrollment Approved!", 
              "Congratulations! Your enrollment request has been approved. You now have full access to all hostel services.",
              {
                duration: 10000,
                action: {
                  label: "Got it!",
                  onClick: () => {
                    localStorage.setItem(notificationKey, "true");
                  }
                }
              }
            );
            
            // Mark as shown after a delay
            setTimeout(() => {
              localStorage.setItem(notificationKey, "true");
            }, 5000);
          }
        }
      }
      
      // Check if student was rejected
      if (studentData.status === 'rejected') {
        const notificationKey = `rejection_notification_${studentData.id}`;
        const hasShownNotification = localStorage.getItem(notificationKey);
        
        if (!hasShownNotification) {
          notify.error("Enrollment Request Rejected", 
            "Your enrollment request has been rejected. You can update your profile and submit a new request.",
            {
              duration: 10000,
              action: {
                label: "Understand",
                onClick: () => {
                  localStorage.setItem(notificationKey, "true");
                }
              }
            }
          );
          
          // Mark as shown after a delay
          setTimeout(() => {
            localStorage.setItem(notificationKey, "true");
          }, 5000);
        }
      }
    } catch (err) {
      console.error("Error checking approval notifications:", err);
    }
  };
  
  useEffect(() => {
    loadStudentProfile();
    
    // Check for unread notices
    checkUnreadNotices();
    
    // Check for unread fee notifications
    checkUnreadFeeNotifications();
    
    // Check for unread complaint replies
    checkUnreadComplaintReplies();
  }, [loadStudentProfile]); // Now correctly depends on the memoized function
  
  // Function to check for unread notices
  const checkUnreadNotices = async () => {
    try {
      // First try the new API
      const response = await api.get('/notifications/new-notices/count');
      setUnreadNoticesCount(response.data.count);
    } catch (err) {
      console.error('Failed to fetch notice notifications from API, using fallback:', err);
      // Fallback to old localStorage method
      try {
        const readNoticesStr = localStorage.getItem('readNotices');
        const readNotices: number[] = readNoticesStr ? JSON.parse(readNoticesStr) : [];
        
        const response = await api.get('/notices');
        const notices = response.data;
        const unreadCount = notices.filter((notice: any) => !readNotices.includes(notice.id)).length;
        
        setUnreadNoticesCount(unreadCount);
      } catch (fallbackErr) {
        console.error('Fallback notice check also failed:', fallbackErr);
        setUnreadNoticesCount(0);
      }
    }
  };
  
  // Function to check for unread fee notifications
  const checkUnreadFeeNotifications = async () => {
    try {
      const readFeeNoticesStr = localStorage.getItem('readFeeNotifications');
      const readFeeNotices: number[] = readFeeNoticesStr ? JSON.parse(readFeeNoticesStr) : [];
      
      // Try dedicated endpoint first
      try {
        const response = await api.get('/student/fee-notifications');
        const notifications = response.data;
        
        // Count notifications that are either not marked as read locally OR not viewed in dashboard
        const unreadCount = notifications.filter((notification: any) => 
          !readFeeNotices.includes(notification.id) || !notification.viewed_in_dashboard
        ).length;
        
        setUnreadFeeNotifications(unreadCount);
      } catch (primaryErr) {
        // Fallback to notices and filter
        const response = await api.get('/notices');
        const feeNotifications = response.data.filter((notice: any) => 
          notice.title.toLowerCase().includes('fee') || 
          notice.content.toLowerCase().includes('fee payment') ||
          notice.notification_type === 'fee_payment'
        );
        
        const unreadCount = feeNotifications.filter((notice: any) => !readFeeNotices.includes(notice.id)).length;
        setUnreadFeeNotifications(unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch fee notifications for badge:', err);
      setUnreadFeeNotifications(0);
    }
  };
  
  // Function to check for unread complaint replies
  const checkUnreadComplaintReplies = async () => {
    try {
      const response = await api.get('/notifications/complaint-replies/count');
      setUnreadComplaintReplies(response.data.count);
    } catch (err) {
      console.error('Failed to fetch complaint reply notifications:', err);
      setUnreadComplaintReplies(0);
    }
  };
  
  // Listen for notice read updates
  useEffect(() => {
    // Check for unread notices on mount
    checkUnreadNotices();
    
    // Add event listener for notice read updates
    const handleNoticesReadUpdate = () => {
      checkUnreadNotices();
    };
    
    window.addEventListener('notices-read-update', handleNoticesReadUpdate);
    
    // Cleanup
    return () => {
      window.removeEventListener('notices-read-update', handleNoticesReadUpdate);
    };
  }, []);
  
  // Listen for notification updates
  useEffect(() => {
    // Add event listener for fee notification updates
    const handleFeeNotificationsUpdate = () => {
      checkUnreadFeeNotifications();
    };
    
    window.addEventListener('fee-notifications-update', handleFeeNotificationsUpdate);
    
    // Cleanup
    return () => {
      window.removeEventListener('fee-notifications-update', handleFeeNotificationsUpdate);
    };
  }, []);
  
  // Update the handleLogout function
  const handleLogout = () => {
    notify.info("Logging Out", "You have been logged out successfully.");
    logout(navigate);
  };

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`Form field updated - ${name}: ${value}`);
    setProfileForm(prev => ({
      ...prev,
      [name]: name === 'semesters_requested' ? parseInt(value) : value
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Profile form submission started");
    setProfileUpdateLoading(true);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(false);

    try {
      // Create the updated profile data
      const updatedData = {
        ...profileForm
      };
      
      console.log("Updating profile with data:", updatedData);
      
      // Always update the UI immediately for better user experience
      const updatedStudent = {
        ...student,
        ...updatedData
      };
      
      setStudent(updatedStudent);
      
      // Try to update in the database using our specialized function
      try {
        if (student?.id) {
          // Use the specialized function for updating student profile
          await updateStudentProfile(student.id, updatedData);
          console.log("Profile successfully updated in the database");
        } else {
          console.error("Missing student ID - cannot update profile in database");
        }
        
        // Set success state
        setEditingProfile(false);
        setProfileUpdateSuccess(true);
        
        // Show success notification
        notify.success(
          "Profile Updated", 
          "Your profile has been updated successfully."
        );
        
        // Hide success message after a delay
        setTimeout(() => {
          setProfileUpdateSuccess(false);
        }, 5000);
      } catch (updateErr) {
        console.error("Failed to update profile in database:", updateErr);
        setProfileUpdateError(
          <div className="flex flex-col">
            <span className="font-semibold">Failed to update profile.</span>
            <span className="text-sm">There was an issue connecting to the server. Please try again later.</span>
          </div>
        );
        
        notify.error(
          "Profile Update Failed", 
          "There was an issue connecting to the server. Your changes may not be saved."
        );
      }
    } catch (err) {
      console.error("Profile update failed:", err);
      setProfileUpdateError("An error occurred. Please try again.");
      
      notify.error(
        "Profile Update Failed", 
        "An unexpected error occurred. Please try again."
      );
      
      // Even on error, try to update the UI with the new data
      try {
        setStudent(prevStudent => ({
          ...prevStudent,
          ...profileForm
        }));
        setEditingProfile(false);
      } catch (stateErr) {
        console.error("Failed to update state:", stateErr);
      }
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  const cancelProfileEdit = () => {
    setEditingProfile(false);
    // Reset form to current student data
    if (student) {
      setProfileForm({
        name: student.name,
        course: student.course || '',
        contact_number: student.contact_number || '',
        date_of_birth: student.date_of_birth || '',
        semesters_requested: student.semesters_requested || 1,
      });
    }
  };
  
  // Ensure profile form stays in sync with student data when it changes
  useEffect(() => {
    if (student && !editingProfile) {
      // Use a referential equality check to prevent unnecessary updates
      const formDataChanged = 
        profileForm.name !== student.name ||
        profileForm.course !== (student.course || '') ||
        profileForm.contact_number !== (student.contact_number || '') ||
        profileForm.date_of_birth !== (student.date_of_birth || '') ||
        profileForm.semesters_requested !== (student.semesters_requested || 1);
      
      // Only update form data if it's actually different
      if (formDataChanged) {
        console.log("Syncing form data with student data");
        setProfileForm({
          name: student.name,
          course: student.course || '',
          contact_number: student.contact_number || '',
          date_of_birth: student.date_of_birth || '',
          semesters_requested: student.semesters_requested || 1
        });
      }
    }
  }, [student, editingProfile, profileForm]);
  
  // Use a proper initialFormState reference to avoid unnecessary renders
  const getInitialFormState = useCallback((studentData: StudentProfile | null) => {
    if (!studentData) return {};
    return {
      name: studentData.name,
      course: studentData.course || '',
      contact_number: studentData.contact_number || '',
      date_of_birth: studentData.date_of_birth || '',
      semesters_requested: studentData.semesters_requested || 1
    };
  }, []);

  // Initialize form data once when student data is first loaded
  useEffect(() => {
    if (student && Object.keys(profileForm).length === 0) {
      console.log("Initial form setup from student data");
      setProfileForm(getInitialFormState(student));
    }
  }, [student, profileForm, getInitialFormState]);
  
  // Handle cached data only once on initial load
  useEffect(() => {
    if (!student) return;
    console.log("Initial student data loaded:", student);
  }, []); // Empty dependency array - only run once on mount
  
  // Check if profile needs completion
  const needsProfileCompletion = (studentData: StudentProfile | null) => {
    if (!studentData) return false;
    return !studentData.course || !studentData.contact_number || !studentData.date_of_birth;
  };

  // Handle profile completion form changes
  const handleProfileCompletionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileCompletionForm(prev => ({
      ...prev,
      [name]: name === 'semesters_requested' ? parseInt(value) : value
    }));
  };
  
  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdownElement = document.getElementById('profile-dropdown');
      if (dropdownElement && !dropdownElement.contains(event.target as Node) && profileDropdownOpen) {
        setProfileDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Handle profile picture upload
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileCompletionForm(prev => ({
        ...prev,
        profile_picture: file
      }));
    }
  };

  // Handle profile picture upload in edit profile section
  const handleEditProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('handleEditProfilePictureChange: File selected:', file.name);
      
      try {
        setUploadingProfilePicture(true);
        console.log('handleEditProfilePictureChange: Starting upload...');
        
        const response = await uploadProfilePicture(file);
        console.log('handleEditProfilePictureChange: Upload response:', response);
        
        // Update student data with new profile picture URL
        const newProfilePictureUrl = response.profile_picture_url;
        console.log('handleEditProfilePictureChange: Updating student state with URL:', newProfilePictureUrl);
        
        setStudent(prev => {
          const updatedStudent = prev ? ({
            ...prev,
            profile_picture: newProfilePictureUrl
          }) : prev;
          console.log('handleEditProfilePictureChange: Updated student state:', updatedStudent);
          return updatedStudent;
        });
        
        // Also refresh the student profile from the server to ensure consistency
        try {
          const profileResponse = await api.get('/student/profile');
          console.log('handleEditProfilePictureChange: Refreshed profile from server:', profileResponse.data);
          setStudent(profileResponse.data);
        } catch (refreshErr) {
          console.warn('handleEditProfilePictureChange: Failed to refresh profile from server:', refreshErr);
          // Continue with local update if server refresh fails
        }
        
        console.log('handleEditProfilePictureChange: Profile picture uploaded and state updated successfully');
        
        // Show success notification
        notify.success(
          "Profile Picture Updated", 
          "Your profile picture has been updated successfully."
        );
      } catch (err: any) {
        console.error('handleEditProfilePictureChange: Failed to upload profile picture:', err);
        setProfileUpdateError('Failed to upload profile picture. Please try again.');
        
        notify.error(
          "Upload Failed", 
          "Failed to upload profile picture. Please try again."
        );
      } finally {
        setUploadingProfilePicture(false);
      }
    } else {
      console.log('handleEditProfilePictureChange: No file selected');
    }
  };

  // Submit profile completion and send enrollment request
  const handleProfileCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileCompletionLoading(true);
    setProfileCompletionError(null);
    
    // Validate all required fields
    if (!profileCompletionForm.course) {
      setProfileCompletionError('Course is required');
      setProfileCompletionLoading(false);
      return;
    }
    
    if (!profileCompletionForm.contact_number) {
      setProfileCompletionError('Contact number is required');
      setProfileCompletionLoading(false);
      return;
    }
    
    if (!profileCompletionForm.date_of_birth) {
      setProfileCompletionError('Date of birth is required');
      setProfileCompletionLoading(false);
      return;
    }
    
    if (!profileCompletionForm.semesters_requested) {
      setProfileCompletionError('Number of semesters is required');
      setProfileCompletionLoading(false);
      return;
    }
    
    // Check if student has already requested enrollment
    if (student?.is_enrollment_requested) {
      setProfileCompletionError('You have already submitted an enrollment request. Please wait for admin approval.');
      setProfileCompletionLoading(false);
      return;
    }
    
    try {
      // Create a simple object instead of FormData
      const profileData = {
        course: profileCompletionForm.course,
        contact_number: profileCompletionForm.contact_number,
        date_of_birth: profileCompletionForm.date_of_birth,
        semesters_requested: profileCompletionForm.semesters_requested,
        is_enrollment_requested: true
      };
      
      // Update the profile with all the necessary information
      const result = await updateStudentProfile(student?.id || 0, profileData, true);
      
      if (result) {
        // Update the local student state to immediately show enrollment pending view
        setStudent(prev => prev ? {
          ...prev,
          course: profileCompletionForm.course,
          contact_number: profileCompletionForm.contact_number,
          date_of_birth: profileCompletionForm.date_of_birth,
          semesters_requested: profileCompletionForm.semesters_requested,
          is_enrollment_requested: true
        } : prev);
        
        // Hide the profile completion form
        setShowProfileCompletion(false);
        
        // Show success notification
        notify.success(
          "Enrollment Request Submitted", 
          "Your enrollment request has been submitted successfully. The admin will review your request soon."
        );
      } else {
        setProfileCompletionError('Failed to submit enrollment request. Please try again.');
        
        notify.error(
          "Submission Failed", 
          "Failed to submit enrollment request. Please try again."
        );
      }
    } catch (err) {
      console.error('Failed to complete profile:', err);
      setProfileCompletionError('Failed to complete profile. Please try again.');
      
      notify.error(
        "Profile Completion Failed", 
        "There was an error completing your profile. Please try again."
      );
    } finally {
      setProfileCompletionLoading(false);
    }
  };

  // Edit Profile button click handler
  const handleEditProfileClick = () => {
    // Initialize the form with current student data
    if (student) {
      setProfileForm({
        name: student.name,
        course: student.course || '',
        contact_number: student.contact_number || '',
        date_of_birth: student.date_of_birth || '',
        semesters_requested: student.semesters_requested || 1
      });
    }
    setEditingProfile(true);
  };

  // Handle navigation to complaints page and mark replies as viewed
  const handleComplaintsNavigation = () => {
    navigate('/complaint');
    
    // Mark complaint reply notifications as viewed
    const markComplaintRepliesViewed = async () => {
      try {
        await api.post('/notifications/complaint-replies/mark-viewed');
        setUnreadComplaintReplies(0);
        console.log('Marked complaint reply notifications as viewed');
      } catch (err) {
        console.error('Failed to mark complaint replies as viewed:', err);
      }
    };
    
    markComplaintRepliesViewed();
  };
  
  // Handle navigation to notices page and mark notices as viewed
  const handleNoticesNavigation = () => {
    navigate('/notice');
    
    // Mark notice notifications as viewed
    const markNoticesViewed = async () => {
      try {
        await api.post('/notifications/new-notices/mark-viewed');
        setUnreadNoticesCount(0);
        console.log('Marked notice notifications as viewed');
        
        // Also dispatch event for backward compatibility
        window.dispatchEvent(new CustomEvent('notices-read-update'));
      } catch (err) {
        console.error('Failed to mark notices as viewed:', err);
        // Fallback to localStorage method
        try {
          const response = await api.get('/notices');
          const allNoticeIds = response.data.map((n: any) => n.id);
          localStorage.setItem('readNotices', JSON.stringify(allNoticeIds));
          setUnreadNoticesCount(0);
          window.dispatchEvent(new CustomEvent('notices-read-update'));
        } catch (fallbackErr) {
          console.error('Fallback notice marking also failed:', fallbackErr);
        }
      }
    };
    
    markNoticesViewed();
  };
  
  // Handle navigation to fee payment page and mark fee notifications as viewed
  const handleFeePaymentNavigation = () => {
    navigate('/fee-payment');
    
    // Mark fee notifications as viewed in dashboard
    const markFeeNotificationsViewed = async () => {
      try {
        await api.post('/student/fee-notifications/mark-viewed-in-dashboard');
        setUnreadFeeNotifications(0);
        console.log('Marked fee notifications as viewed in dashboard');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('fee-notifications-update'));
      } catch (err) {
        console.error('Failed to mark fee notifications as viewed:', err);
      }
    };
    
    markFeeNotificationsViewed();
  };

  // Update the cards with the notice count from state and add onClick handlers
  const cardsWithNotifications = cards.map(card => {
    if (card.title === "Notices") {
      return {
        ...card,
        notificationCount: unreadNoticesCount,
        onClick: handleNoticesNavigation
      };
    }
    if (card.title === "Pay Fees") {
      return {
        ...card,
        notificationCount: unreadFeeNotifications,
        onClick: handleFeePaymentNavigation
      };
    }
    if (card.title === "Complaints") {
      return {
        ...card,
        notificationCount: unreadComplaintReplies,
        onClick: handleComplaintsNavigation
      };
    }
    return card;
  });

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }
  
  // Handle error cases
  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Profile</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => loadStudentProfile(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // If no student data at all, redirect to login
  if (!student) {
    navigate('/login');
    return null;
  }
  
  // **CASE 1: Student enrollment request was REJECTED**
  if (student.status === 'rejected') {
    return (
      <div className="w-full max-w-4xl mx-auto py-10 animate-fade-in relative">
        <BackgroundSlideshow />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Enrollment Request Rejected</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2 rounded-full transition shadow-sm border border-gray-200"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg flex flex-col items-center mb-8">
          <X className="text-red-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Enrollment Request Rejected</h2>
          <p className="text-red-600 text-center max-w-lg mb-4">
            Your enrollment request has been rejected by the hostel administration. You can update your profile and submit a new enrollment request.
          </p>
          <button
            onClick={() => {
              // Reset student state to allow resubmission
              setStudent(prev => prev ? {
                ...prev,
                status: 'active',
                is_enrollment_requested: false
              } : prev);
            }}
            className="mt-4 bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition"
          >
            Update Profile & Resubmit Request
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">What you can do next</h3>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
              <span>Review and update your profile information</span>
            </div>
            <div className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
              <span>Ensure all required fields are completed accurately</span>
            </div>
            <div className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
              <span>Submit a new enrollment request for review</span>
            </div>
            <div className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
              <span>Wait for admin approval to access hostel services</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // **CASE 2: Student has INCOMPLETE PROFILE (needs to complete before enrollment)**
  if (!student.is_enrollment_requested && needsProfileCompletion(student)) {
    return (
      <div className="w-full max-w-5xl mx-auto py-10 animate-fade-in relative">
        <BackgroundSlideshow />
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-primary">Welcome, Student</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2 rounded-full transition shadow-sm border border-gray-200"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg flex flex-col items-center mb-8">
          <User className="text-blue-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-bold text-blue-700 mb-2">Complete Your Profile</h2>
          <p className="text-blue-600 text-center max-w-lg">
            Please complete your profile to submit an enrollment request to the hostel administration.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-100">
          <form onSubmit={handleProfileCompletionSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Profile Setup</h3>
              <p className="text-gray-600">Please provide the following information to complete your enrollment</p>
            </div>

            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  {profileCompletionForm.profile_picture ? (
                    <img 
                      src={URL.createObjectURL(profileCompletionForm.profile_picture)} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition">
                  <Upload className="w-4 h-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500">Upload your profile picture (optional)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course/Program *</label>
                <select
                  name="course"
                  value={profileCompletionForm.course}
                  onChange={handleProfileCompletionChange}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                <input
                  type="tel"
                  name="contact_number"
                  value={profileCompletionForm.contact_number}
                  onChange={handleProfileCompletionChange}
                  placeholder="Enter your contact number"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={profileCompletionForm.date_of_birth}
                  onChange={handleProfileCompletionChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Semesters Requested */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Semesters Requested *</label>
                <select
                  name="semesters_requested"
                  value={profileCompletionForm.semesters_requested}
                  onChange={handleProfileCompletionChange}
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

            {profileCompletionError && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                <p className="text-red-600 text-sm">{profileCompletionError}</p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="submit"
                disabled={profileCompletionLoading}
                className="bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {profileCompletionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Submitting Request...
                  </>
                ) : (
                  'Complete Profile & Send Enrollment Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  // **CASE 3: Student has COMPLETE PROFILE but NO ENROLLMENT REQUEST yet**
  if (!student.is_enrollment_requested && !needsProfileCompletion(student)) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10 animate-fade-in relative">
        <BackgroundSlideshow />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Ready to Submit Enrollment Request</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2 rounded-full transition shadow-sm border border-gray-200"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg flex flex-col items-center mb-8">
          <Check className="text-green-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Profile Complete!</h2>
          <p className="text-green-600 text-center max-w-lg mb-4">
            Your profile is complete. Click the button below to submit your enrollment request to the hostel administration.
          </p>
          <button
            onClick={async () => {
              try {
                setProfileCompletionLoading(true);
                const result = await updateStudentProfile(student.id, { is_enrollment_requested: true }, true);
                if (result) {
                  setStudent(prev => prev ? { ...prev, is_enrollment_requested: true } : prev);
                  notify.success(
                    "Enrollment Request Submitted", 
                    "Your enrollment request has been submitted successfully. The admin will review your request soon.",
                    { duration: 10000 }
                  );
                }
              } catch (err) {
                notify.error("Failed to submit enrollment request. Please try again.", 
                  "Failed to submit enrollment request. Please try again."
                );
              } finally {
                setProfileCompletionLoading(false);
              }
            }}
            disabled={profileCompletionLoading}
            className="bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {profileCompletionLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              'Submit Enrollment Request'
            )}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Profile Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <User className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p>{student.name}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Book className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Course</p>
                <p>{student.course}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p>{student.contact_number}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Cake className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p>{student.date_of_birth}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Semesters Requested</p>
                <p>{student.semesters_requested}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MessageSquare className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{student.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // **CASE 4: Student has ENROLLMENT REQUEST PENDING (waiting for admin approval)**
  if (student.is_enrollment_requested && !student.is_approved) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10 animate-fade-in relative">
        <BackgroundSlideshow />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Waiting for Approval</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => loadStudentProfile(true)}
              className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-full transition shadow-sm"
              disabled={loading}
              aria-label="Check approval status"
            >
              <div className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                {loading ? '⟳' : '🔄'}
              </div>
              <span className="text-sm font-medium">{loading ? 'Checking...' : 'Check Status'}</span>
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2 rounded-full transition shadow-sm border border-gray-200"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg flex flex-col items-center mb-8">
          <Clock className="text-blue-500 h-12 w-12 mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-blue-700 mb-2">Waiting for Approval</h2>
          <p className="text-blue-600 text-center max-w-lg mb-4">
            Your enrollment request has been submitted successfully! The hostel administration is currently reviewing your application.
          </p>
          <div className="bg-white/50 rounded-lg p-4 w-full max-w-md">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <p className="text-sm text-blue-600 text-center mt-2">Processing your request...</p>
          </div>
          <button 
            onClick={() => loadStudentProfile(true)}
            className="mt-4 bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition border border-blue-200"
            disabled={loading}
          >
            {loading ? 'Checking Status...' : 'Refresh Status'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Submitted Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <User className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{student.name}</p>
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
              <Cake className="h-5 w-5 text-primary mr-3 mt-0.5" />
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
            
            <div className="flex items-start">
              <MessageSquare className="h-5 w-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{student.email}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700 font-medium">Enrollment request submitted successfully</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              You will receive a notification once your request has been processed.
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">What happens next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Admin will review your enrollment request</li>
              <li>• A room will be allocated to you upon approval</li>
              <li>• You'll get access to all hostel management features</li>
              <li>• You can then pay fees, submit complaints, and more</li>
            </ul>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
              <Info className="h-4 w-4 mr-2" />
              Tip
            </h4>
            <p className="text-sm text-blue-600">
              Click "Check Status" or "Refresh Status" above to see if your request has been processed. 
              The page will automatically update once your enrollment is approved.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // **CASE 5: Student is APPROVED but profile incomplete (edge case)**
  if (student.is_approved && needsProfileCompletion(student)) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10 animate-fade-in relative">
        <BackgroundSlideshow />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Complete Your Profile</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-2 rounded-full transition shadow-sm border border-gray-200"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg flex flex-col items-center mb-8">
          <User className="text-green-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Welcome to the Hostel!</h2>
          <p className="text-green-600 text-center max-w-lg">
            Your enrollment has been approved! Please complete your profile information to get full access.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-100">
          <form onSubmit={handleProfileCompletionSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Profile Completion</h3>
              <p className="text-gray-600">Please provide the following information to finalize your profile</p>
            </div>

            {/* Same form fields as in CASE 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course/Program *</label>
                <select
                  name="course"
                  value={profileCompletionForm.course}
                  onChange={handleProfileCompletionChange}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                <input
                  type="tel"
                  name="contact_number"
                  value={profileCompletionForm.contact_number}
                  onChange={handleProfileCompletionChange}
                  placeholder="Enter your contact number"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={profileCompletionForm.date_of_birth}
                  onChange={handleProfileCompletionChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Semesters Requested */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Semesters Requested *</label>
                <select
                  name="semesters_requested"
                  value={profileCompletionForm.semesters_requested}
                  onChange={handleProfileCompletionChange}
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

            {profileCompletionError && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                <p className="text-red-600 text-sm">{profileCompletionError}</p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="submit"
                disabled={profileCompletionLoading}
                className="bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {profileCompletionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Completing Profile...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  // **CASE 6: Student is APPROVED and has FULL ACCESS to dashboard**
  // This is the main dashboard that only approved students with complete profiles should see
  return (
    <div className="w-full max-w-5xl mx-auto py-10 animate-fade-in relative">
      <BackgroundSlideshow />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-primary">Student Dashboard</h1>
        <div className="flex items-center gap-3">
          {/* Modern refresh button */}
          <button 
            onClick={() => {
              if (!refreshing) {
                setRefreshing(true);
                notify.info("Refreshing Dashboard", "Reloading your data...");
                
                // First try to reload profile data
                loadStudentProfile(true)
                  .then(() => {
                    // Then refresh other data
                    return Promise.all([
                      checkUnreadNotices(),
                      checkUnreadFeeNotifications(),
                      checkUnreadComplaintReplies()
                    ]);
                  })
                  .then(() => {
                    notify.success("Dashboard Refreshed", "Your data has been updated successfully.");
                  })
                  .catch(err => {
                    console.error("Failed to refresh dashboard:", err);
                    notify.error(
                      "Refresh Failed", 
                      "There was an error refreshing your data. Please try again."
                    );
                  })
                  .finally(() => {
                    setRefreshing(false);
                  });
              }
            }}
            disabled={refreshing}
            className="relative flex items-center justify-center p-2.5 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 rounded-full transition-all duration-300 text-primary overflow-hidden group"
            aria-label="Refresh dashboard"
          >
            <RefreshCw 
              className="h-5 w-5 transition-all duration-500 group-hover:rotate-180"
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none'
              }}
            />
            {refreshing && (
              <span className="absolute inset-0 bg-primary/10 animate-pulse rounded-full"></span>
            )}
            <span className="sr-only">Refresh dashboard</span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 px-2 py-2 pl-3 rounded-full transition shadow-sm border border-gray-200"
              aria-label="Open profile menu"
              aria-expanded={profileDropdownOpen}
            >
              <ProfileAvatar 
                src={student?.profile_picture}
                alt={student?.name || "Profile"}
                size="sm"
              />
              <span className="text-sm font-medium max-w-[120px] truncate">{student?.name}</span>
            </button>
            
            {profileDropdownOpen && (
              <div 
                id="profile-dropdown"
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10 border border-gray-200 animate-in fade-in slide-in-from-top-5 duration-200"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500">Signed in as</p>
                  <p className="font-medium truncate">{student?.email}</p>
                </div>
                <button 
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    handleEditProfileClick();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                >
                  <Settings className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {student.status === 'removed' ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg flex flex-col items-center mb-8">
          <X className="text-red-500 h-12 w-12 mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">No Longer Part of Hostel</h2>
          <p className="text-red-600 text-center max-w-lg">
            Your profile has been removed from the hostel system by an administrator. If you believe this is an error, please contact the hostel administration office.
          </p>
        </div>
      ) : (
        <>
          {/* Profile section - First Priority */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-primary flex items-center">
                <User className="w-5 h-5 mr-2" />
                Student Profile
              </h2>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              {editingProfile ? (
                <form onSubmit={handleProfileSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 bg-blue-50 p-3 rounded-md mb-2 flex items-center">
                      <Info className="text-blue-500 h-5 w-5 mr-2" />
                      <span className="text-sm text-blue-700">
                        {student.is_enrollment_requested && !student.is_approved 
                          ? "Your enrollment request has been submitted. You can update your name and profile picture, but other fields are locked until admin approval."
                          : "Update your profile information below. All changes will be saved to your student record."
                        }
                      </span>
                    </div>
                    
                    {/* Profile Picture Upload Section */}
                    <div className="md:col-span-2 flex flex-col items-center mb-4">
                      <div className="relative">
                        <ProfileAvatar 
                          src={student.profile_picture}
                          alt={student.name}
                          size="lg"
                          className="mb-3"
                        />
                        
                        <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition disabled:opacity-50">
                          {uploadingProfilePicture ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleEditProfilePictureChange}
                            className="hidden"
                            disabled={uploadingProfilePicture}
                          />
                        </label>
                      </div>
                      <p className="text-sm text-gray-500">
                        {uploadingProfilePicture ? 'Uploading...' : 'Click to change profile picture'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                      <input 
                        type="text" 
                        value={student.roll_number}
                        className="w-full p-3 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input 
                        type="text" 
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileInputChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input 
                        type="email" 
                        value={student.email}
                        className="w-full p-3 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                      <input 
                        type="text" 
                        value={profileForm.course}
                        className="w-full p-3 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Course cannot be modified after enrollment</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <input 
                        type="tel" 
                        name="contact_number"
                        value={profileForm.contact_number}
                        onChange={handleProfileInputChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={student.is_enrollment_requested && !student.is_approved}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        name="date_of_birth"
                        value={profileForm.date_of_birth}
                        onChange={handleProfileInputChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={student.is_enrollment_requested && !student.is_approved}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semesters Requested</label>
                      <input 
                        type="text" 
                        value={`${profileForm.semesters_requested} ${profileForm.semesters_requested === 1 ? 'Semester' : 'Semesters'}`}
                        className="w-full p-3 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Semesters cannot be modified after enrollment</p>
                    </div>
                  </div>
                  
                  {profileUpdateError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                      <p className="text-red-600 text-sm">{profileUpdateError}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-4 pt-6">
                    <button
                      type="button"
                      onClick={cancelProfileEdit}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={profileUpdateLoading}
                      className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {profileUpdateLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Updating...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 flex flex-col items-center mb-6">
                    <ProfileAvatar 
                      src={student.profile_picture}
                      alt={student.name}
                      size="lg"
                      className="mb-3"
                    />
                    <h3 className="text-xl font-semibold text-gray-800">{student.name}</h3>
                    <p className="text-gray-600">{student.roll_number}</p>
                  </div>
                  
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{student.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <MessageSquare className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{student.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Book className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Course</p>
                      <p className="font-medium">{student.course || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-medium">{student.contact_number || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Cake className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{student.date_of_birth || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Semesters Requested</p>
                      <p className="font-medium">{student.semesters_requested || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  {student.room_number && (
                    <div className="flex items-start">
                      <Bed className="h-5 w-5 text-primary mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Room</p>
                        <p className="font-medium">{student.room_number} ({student.room_type})</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Join Date</p>
                      <p className="font-medium">{student.join_date ? new Date(student.join_date).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Room Information Section */}
          {student.room_number && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-primary flex items-center mb-4">
                <Bed className="w-5 h-5 mr-2" />
                Room Information
              </h2>
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Room Number</p>
                      <p className="font-medium text-lg">{student.room_number}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Bed className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Room Type</p>
                      <p className="font-medium">{student.room_type}</p>
                    </div>
                  </div>
                </div>
                
                {/* Roommates Section */}
                {roommates.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Roommates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roommates.map((roommate) => (
                        <div key={roommate.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <ProfileAvatar 
                            src={roommate.profile_picture}
                            alt={roommate.name}
                            size="sm"
                            className="mr-3"
                          />
                          <div>
                            <p className="font-medium text-gray-800">{roommate.name}</p>
                            <p className="text-sm text-gray-600">{roommate.roll_number}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Latest Notices Section */}
          {/* Remove LatestNotices component */}

          {/* Recent Complaints Section */}
          {/* Remove RecentComplaints component */}

          {/* Hostel Services Section */}
          <h2 className="text-2xl font-bold mb-6 text-primary">Hostel Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {cardsWithNotifications.map((c) => (
              <a
                key={c.title}
                href={c.onClick ? undefined : c.url}
                onClick={c.onClick ? (e) => {
                  e.preventDefault();
                  c.onClick!();
                } : undefined}
                className={`dashboard-card border ${
                  'notificationCount' in c && c.notificationCount > 0 
                    ? 'border-red-300 ring-2 ring-red-300/50' 
                    : 'border-primary/10'
                } rounded-xl shadow-lg p-7 flex flex-col items-center gap-4 hover:scale-105 hover:shadow-xl transition-all duration-200 group animate-scale-in relative`}
              >
                {'notificationCount' in c && c.notificationCount > 0 && (
                  <div className="absolute -top-2 -right-2 animate-pulse">
                    <span className="relative flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 flex items-center justify-center text-white text-xs">
                        {c.notificationCount}
                      </span>
                    </span>
                  </div>
                )}
                <c.icon className={`${
                  'notificationCount' in c && c.notificationCount > 0 
                    ? 'text-red-500' 
                    : 'text-primary'
                } mb-2 w-10 h-10 group-hover:scale-125 transition`} />
                <span className="text-lg font-semibold flex items-center">
                  {c.title}
                  {'notificationCount' in c && c.notificationCount > 0 && (
                    <span className="ml-2 text-red-500">New!</span>
                  )}
                </span>
                {c.title === "Notices" && 'notificationCount' in c && c.notificationCount > 0 && (
                  <p className="text-sm text-red-600">
                    {c.notificationCount} new notice{c.notificationCount > 1 ? 's' : ''} from admin
                  </p>
                )}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboard;
