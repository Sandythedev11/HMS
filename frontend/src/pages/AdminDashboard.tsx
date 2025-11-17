import { FileText, Bed, Users, Wallet, Calendar, MessageSquare, UserCheck, LogOut, Edit, Trash2, Reply, Send, Check, X, ArrowLeft, User, Home, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api, { directFetch } from "../utils/api";
import { logout, isAdmin, getUserInfo } from "../utils/auth";
import ProfileAvatar from "../components/ProfileAvatar";
import BackgroundSlideshow from "../components/BackgroundSlideshow";
import { notify } from "../utils/notifications";

interface DashboardCardProps {
  title: string;
  icon: React.ElementType;
  url: string;
  count?: number;
  highlight?: boolean;
  description?: string;
  onClick?: () => void;
}

const DashboardCard = ({ title, icon: Icon, url, count, highlight, description, onClick }: DashboardCardProps) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault(); // Prevent default navigation when we have a custom handler
      onClick();
    } else {
      navigate(url);
    }
  };
  
  return (
    <div
      onClick={handleClick}
      className={`dashboard-card ${highlight ? 'border-orange-300' : 'border-primary/10'} rounded-xl p-7 flex flex-col items-center gap-4 hover:scale-105 transition-all duration-200 group animate-scale-in cursor-pointer ${highlight ? 'bg-orange-50/90' : ''}`}
    >
      <Icon className={`${highlight ? 'text-orange-500' : 'text-secondary'} mb-2 w-10 h-10 group-hover:scale-125 transition`} />
      <span className="text-lg font-semibold">{title}</span>
      {count !== undefined && (
        <div className={`${highlight ? 'bg-orange-100 text-orange-800' : 'bg-primary/10 text-primary'} px-3 py-1 rounded-full font-semibold`}>
          {count}
        </div>
      )}
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
};

// Recent Complaints component for admin dashboard
const RecentComplaints = ({ onClose }: { onClose: () => void }) => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReply, setEditingReply] = useState<number | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        const response = await api.get('/complaints');
        // Get the 5 most recent complaints
        const recentComplaints = response.data.slice(0, 5);
        setComplaints(recentComplaints);
        
        // Mark complaints as viewed
        try {
          await api.post('/notifications/new-complaints/mark-viewed');
          // Dispatch event to ensure all components know complaints are viewed
          window.dispatchEvent(new CustomEvent('complaints-viewed'));
          console.log('Marked all complaints as viewed and dispatched event');
        } catch (apiErr) {
          console.error('Failed to mark complaints as viewed:', apiErr);
          // Fallback to localStorage method
          try {
            const allComplaintIds = response.data.map((c: any) => c.id);
            localStorage.setItem('viewedComplaints', JSON.stringify(allComplaintIds));
            // Still dispatch the event even with the fallback method
            window.dispatchEvent(new CustomEvent('complaints-viewed'));
            console.log('Marked complaints as viewed via localStorage and dispatched event');
          } catch (storageErr) {
            console.error('Failed to store viewed complaints in localStorage:', storageErr);
          }
        }
      } catch (err) {
        console.error('Failed to fetch complaints:', err);
        setError('Failed to load complaints. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);
  
  // Handle navigation to student profile
  const handleStudentProfileClick = (studentId: number) => {
    // Save current scroll position and complaints section state
    sessionStorage.setItem('adminDashboardState', JSON.stringify({
      scrollPosition: window.scrollY,
      showComplaintsSection: true,
      returnPath: location.pathname
    }));
    // Navigate to student profile
    navigate(`/admin/student-management/${studentId}`);
  };
  
  const handleReply = (complaintId: number) => {
    setReplyingTo(complaintId);
    setReplyContent("");
  };
  
  const submitReply = async (complaintId: number) => {
    try {
      setSubmittingReply(true);
      const user = getUserInfo();
      const payload = {
        content: replyContent,
        is_admin: true
      };
      
      const response = await api.post(`/complaints/${complaintId}/replies`, payload);
      
      // Update complaints state with new reply
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
        "Your reply has been successfully sent to the student."
      );
    } catch (err) {
      console.error('Failed to submit reply:', err);
      notify.error(
        "Failed to Send Reply", 
        "There was an error sending your reply. Please try again."
      );
    } finally {
      setSubmittingReply(false);
    }
  };
  
  const handleEditReply = (reply: any) => {
    setEditingReply(reply.id);
    setEditReplyContent(reply.content);
  };
  
  const updateReply = async (replyId: number, complaintId: number) => {
    try {
      // Using the nested route structure for updating replies
      const response = await api.put(`/complaints/${complaintId}/replies/${replyId}`, {
        content: editReplyContent
      });
      
      // Update complaints state with updated reply
      setComplaints(prev => 
        prev.map(c => {
          if (c.id === complaintId) {
            return {
              ...c,
              replies: (c.replies || []).map((r: any) => 
                r.id === replyId ? { ...r, content: editReplyContent } : r
              )
            };
          }
          return c;
        })
      );
      
      setEditingReply(null);
      
      // Show success notification
      notify.success(
        "Reply Updated", 
        "Your reply has been successfully updated."
      );
    } catch (err) {
      console.error('Failed to update reply:', err);
      notify.error(
        "Failed to Update Reply", 
        "There was an error updating your reply. Please try again."
      );
    }
  };
  
  const handleDeleteReply = async (replyId: number, complaintId: number) => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      try {
        // Save reply content for potential undo
        const replyToDelete = complaints
          .find(c => c.id === complaintId)?.replies
          .find((r: any) => r.id === replyId);
        
        if (!replyToDelete) return;
        
        const replyContent = replyToDelete.content;
        
        // Using the nested route structure for deleting replies
        await api.delete(`/complaints/${complaintId}/replies/${replyId}`);
        
        // Update complaints state by removing deleted reply
        setComplaints(prev => 
          prev.map(c => {
            if (c.id === complaintId) {
              return {
                ...c,
                replies: (c.replies || []).filter((r: any) => r.id !== replyId)
              };
            }
            return c;
          })
        );
        
        // Show success notification with undo option
        notify.withUndo(
          "Reply Deleted",
          "Your reply has been removed.",
          async () => {
            try {
              // Recreate the deleted reply
              const response = await api.post(`/complaints/${complaintId}/replies`, {
                content: replyContent,
                is_admin: true
              });
              
              // Update complaints state with restored reply
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
              
              notify.success("Reply Restored", "Your reply has been restored successfully.");
            } catch (err) {
              console.error('Failed to restore reply:', err);
              notify.error(
                "Failed to Restore Reply", 
                "There was an error restoring your reply."
              );
            }
          }
        );
      } catch (err) {
        console.error('Failed to delete reply:', err);
        notify.error(
          "Failed to Delete Reply", 
          "There was an error deleting your reply. Please try again."
        );
      }
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
    <div className="bg-white rounded-lg shadow-lg p-5 border border-gray-200 mb-8">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold text-primary flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Recent Student Complaints
        </h2>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/complaint')}
            className="text-primary hover:text-primary/80 text-sm font-medium flex items-center"
          >
            View All
          </button>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center p-6 text-gray-500">
          No complaints available
        </div>
      ) : (
        <div className="space-y-6">
          {complaints.map(complaint => (
            <div key={complaint.id} className="bg-white/90 rounded-xl shadow p-5 border border-gray-100">
              {/* Complaint header with profile picture */}
              <div className="flex items-start space-x-4">
                <div 
                  onClick={() => handleStudentProfileClick(complaint.student_id)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <ProfileAvatar
                    src={complaint.student_profile_picture}
                    alt={complaint.student_name}
                    size="md"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-primary">
                    {complaint.subject}
                  </h3>
                  <div 
                    onClick={() => handleStudentProfileClick(complaint.student_id)}
                    className="text-sm text-gray-600 hover:text-primary cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <span className="font-medium">{complaint.student_name}</span>
                    {complaint.student_roll_number && (
                      <span className="text-gray-500">({complaint.student_roll_number})</span>
                    )}
                    <span className="mx-1">•</span>
                    <span className="text-gray-500">{formatDate(complaint.created_at)}</span>
                  </div>
                  <p className="mt-2 text-gray-700">{complaint.details}</p>
                </div>
              </div>

              {/* Replies section */}
              <div className="mt-4 pl-14">
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

const AdminDashboard = () => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noticeCount, setNoticeCount] = useState<number>(0);
  const [complaintCount, setComplaintCount] = useState<number>(0);
  const [unviewedComplaintCount, setUnviewedComplaintCount] = useState<number>(0);
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState<number>(0);
  const [showComplaintsSection, setShowComplaintsSection] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Function to fetch and update complaint count in real-time
  const checkForNewComplaints = async () => {
    try {
      // Use the new backend API to get complaint count
      const response = await api.get('/notifications/new-complaints/count');
      setUnviewedComplaintCount(response.data.count);
      
      // Show notification if there are new complaints
      if (response.data.count > 0 && !sessionStorage.getItem('newComplaintsNotified')) {
        notify.info(
          `${response.data.count} New Complaint${response.data.count > 1 ? 's' : ''}`,
          "You have new student complaints that need your attention.",
          {
            action: {
              label: "View",
              onClick: () => {
                setShowComplaintsSection(true);
                setUnviewedComplaintCount(0);
                api.post('/notifications/new-complaints/mark-viewed');
                window.dispatchEvent(new CustomEvent('complaints-viewed'));
              }
            }
          }
        );
        sessionStorage.setItem('newComplaintsNotified', 'true');
        
        // Reset notification flag after 1 hour
        setTimeout(() => {
          sessionStorage.removeItem('newComplaintsNotified');
        }, 3600000);
      }
      
      console.log(`Complaint check: ${response.data.count} unviewed complaints`);
    } catch (err) {
      console.error("Failed to check for new complaints:", err);
      // Fallback to old localStorage method if API fails
      try {
        const response = await api.get('/complaints');
        const allComplaints = response.data;
        
        // Update total complaint count
        setComplaintCount(allComplaints.length);
        
        // Calculate unviewed complaints using localStorage as fallback
        const viewedComplaints = JSON.parse(localStorage.getItem('viewedComplaints') || '[]');
        const unviewedCount = allComplaints.filter((complaint: any) => !viewedComplaints.includes(complaint.id)).length;
        setUnviewedComplaintCount(unviewedCount);
      } catch (fallbackErr) {
        console.error("Fallback complaint check also failed:", fallbackErr);
      }
    }
  };
  
  // Listen for the complaints-viewed event
  useEffect(() => {
    const handleComplaintsViewed = () => {
      setUnviewedComplaintCount(0);
    };
    
    window.addEventListener('complaints-viewed', handleComplaintsViewed);
    
    return () => {
      window.removeEventListener('complaints-viewed', handleComplaintsViewed);
    };
  }, []);
  
  // Real-time polling for new complaints
  useEffect(() => {
    // Set up interval to check for new complaints every 30 seconds
    const complaintPollingInterval = setInterval(() => {
      checkForNewComplaints();
    }, 30000); // Poll every 30 seconds
    
    // Also check for new complaints when the window gains focus
    const handleWindowFocus = () => {
      checkForNewComplaints();
    };
    
    window.addEventListener('focus', handleWindowFocus);
    
    // Cleanup
    return () => {
      clearInterval(complaintPollingInterval);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);
  
  // Listen for the feedback-viewed event
  useEffect(() => {
    const handleFeedbackViewed = () => {
      setUnreadFeedbackCount(0);
    };
    
    window.addEventListener('feedback-viewed', handleFeedbackViewed);
    
    return () => {
      window.removeEventListener('feedback-viewed', handleFeedbackViewed);
    };
  }, []);
  
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
        
        // Debug the token first - using the new api utility
        try {
          // Try axios first
          try {
            const debugResponse = await api.get(`/debug-token`);
            console.log("Token validation response (axios):", debugResponse.data);
            
            if (!debugResponse.data.valid || debugResponse.data.role !== 'admin') {
              console.error("Invalid token or user is not admin:", debugResponse.data);
              setError("Authentication error. Please login again.");
              setLoading(false);
              return false;
            }
          } catch (axiosErr) {
            console.error("Token validation with axios failed:", axiosErr);
            
            // Try direct fetch as a fallback
            console.log("Trying direct fetch for token validation...");
            const debugData = await directFetch('/debug-token');
            console.log("Token validation response (fetch):", debugData);
            
            if (!debugData.valid || debugData.role !== 'admin') {
              console.error("Invalid token or user is not admin:", debugData);
              setError("Authentication error. Please login again.");
              setLoading(false);
              return false;
            }
          }
        } catch (err) {
          console.error("Token validation failed completely:", err);
          setError("Failed to validate your admin session. Please login again.");
          setLoading(false);
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
    
    const fetchDashboardData = async () => {
      try {
        // First validate the token
        const isValid = await validateToken();
        if (!isValid) {
          // Redirect to login if validation fails
          logout(navigate);
          return;
        }
        
        setLoading(true);
        
        // Fetch pending students
        try {
          const pendingResponse = await api.get(`/admin/students/pending`);
          console.log("Pending students response:", pendingResponse.data);
          
          const newPendingCount = pendingResponse.data.length;
          setPendingCount(newPendingCount);
          
          // Show notification for pending students if there are any and notification hasn't been shown
          if (newPendingCount > 0 && !sessionStorage.getItem('pendingStudentsNotified')) {
            notify.info(
              `${newPendingCount} Pending Enrollment${newPendingCount > 1 ? 's' : ''}`,
              "You have student enrollment requests waiting for approval.",
              {
                action: {
                  label: "Review",
                  onClick: () => navigate('/admin/pending-students')
                }
              }
            );
            sessionStorage.setItem('pendingStudentsNotified', 'true');
            
            // Reset notification flag after 2 hours
            setTimeout(() => {
              sessionStorage.removeItem('pendingStudentsNotified');
            }, 7200000);
          }
        } catch (err) {
          console.error("Failed to fetch pending students:", err);
          // Set default count to avoid blocking UI
          setPendingCount(0);
        }
        
        // Fetch notices count
        try {
          const noticesResponse = await api.get('/notices');
          console.log("Notices response:", noticesResponse.data);
          setNoticeCount(noticesResponse.data.length);
        } catch (err) {
          console.error("Failed to fetch notices:", err);
          setNoticeCount(0);
        }
        
        // Fetch complaints count
        try {
          const complaintsResponse = await api.get('/complaints');
          console.log("Complaints response:", complaintsResponse.data);
          
          // Set total complaint count
          setComplaintCount(complaintsResponse.data.length);
          
          // Get unviewed complaint count from API
          try {
            const unviewedResponse = await api.get('/notifications/new-complaints/count');
            setUnviewedComplaintCount(unviewedResponse.data.count);
            console.log(`Unviewed complaints: ${unviewedResponse.data.count}`);
          } catch (countErr) {
            console.error("Failed to get unviewed count from API, using fallback:", countErr);
            // Fallback to localStorage method if API fails
            const viewedComplaints = JSON.parse(localStorage.getItem('viewedComplaints') || '[]');
            const unviewedCount = complaintsResponse.data.filter((complaint: any) => 
              !viewedComplaints.includes(complaint.id)
            ).length;
            setUnviewedComplaintCount(unviewedCount);
          }
        } catch (err) {
          console.error("Failed to fetch complaints:", err);
          setComplaintCount(0);
          setUnviewedComplaintCount(0);
        }
        
        // Fetch feedback count
        try {
          let feedbackData;
          
          try {
            // First try with regular API
            const feedbackResponse = await api.get('/feedback');
            feedbackData = feedbackResponse.data;
            console.log("Feedback response:", feedbackData);
          } catch (apiErr) {
            console.error("Regular API fetch failed, trying directFetch:", apiErr);
            
            // Fallback to directFetch
            feedbackData = await directFetch('/feedback');
            console.log("Feedback response (directFetch):", feedbackData);
          }
          
          // Set total feedback count
          setFeedbackCount(feedbackData.length);
          
          // Calculate unread feedback count
          const unreadCount = feedbackData.filter((item: any) => !item.is_read).length;
          setUnreadFeedbackCount(unreadCount);
          
          // Store unread feedback IDs in localStorage to persist across refreshes
          const unreadFeedbackIds = feedbackData
            .filter((item: any) => !item.is_read)
            .map((item: any) => item.id);
          
          localStorage.setItem('unreadFeedbackIds', JSON.stringify(unreadFeedbackIds));
        } catch (err) {
          console.error("Failed to fetch feedback:", err);
          setFeedbackCount(0);
          // Try to get unread count from localStorage as fallback
          try {
            const storedUnreadIds = JSON.parse(localStorage.getItem('unreadFeedbackIds') || '[]');
            setUnreadFeedbackCount(storedUnreadIds.length);
          } catch (storageErr) {
            setUnreadFeedbackCount(0);
          }
        }
        
      } catch (err: any) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data");
        notify.error(
          "Dashboard Error", 
          "Failed to load dashboard data. Please try refreshing the page."
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [navigate]);
  
  const handleLogout = () => {
    setProfileDropdownOpen(false);
    notify.info("Logging Out", "You have been successfully logged out.");
    logout(navigate);
  };
  
  const handleComplaintsClick = () => {
    // Immediately clear the notification indicator
    setUnviewedComplaintCount(0);
    // Show the complaints section in the dashboard
    setShowComplaintsSection(true);
    
    // Mark complaints as viewed
    api.post('/notifications/new-complaints/mark-viewed')
      .then(() => {
        console.log('Marked all complaints as viewed via API');
        // Dispatch event to notify any other components
        window.dispatchEvent(new CustomEvent('complaints-viewed'));
        
        // Show a subtle notification
        if (unviewedComplaintCount > 0) {
          notify.info(
            "Complaints Updated", 
            `${unviewedComplaintCount} complaint${unviewedComplaintCount > 1 ? 's' : ''} marked as viewed.`
          );
        }
      })
      .catch(err => {
        console.error('Failed to mark complaints as viewed via API:', err);
        // Fallback to localStorage method
        api.get('/complaints')
          .then(response => {
            const allComplaintIds = response.data.map((c: any) => c.id);
            localStorage.setItem('viewedComplaints', JSON.stringify(allComplaintIds));
            console.log('Marked complaints as viewed via localStorage fallback');
          })
          .catch(fetchErr => {
            console.error('Failed to fetch complaints for marking as viewed:', fetchErr);
            notify.error(
              "Sync Error", 
              "Failed to mark complaints as viewed. Your status will sync when you reconnect."
            );
          });
      });
  };
  
  const handleFeedbackClick = () => {
    // Immediately clear the unread feedback notification
    setUnreadFeedbackCount(0);
    navigate('/admin/feedback');
    
    // Show notification if there was unread feedback
    if (unreadFeedbackCount > 0) {
      notify.info(
        "Feedback Updated", 
        `${unreadFeedbackCount} feedback item${unreadFeedbackCount > 1 ? 's' : ''} marked as read.`
      );
    }
  };

  const handleCloseSection = () => {
    setShowComplaintsSection(false);
  };

  const admCards = [
    { 
      title: "Enrollment Requests", 
      icon: UserCheck, 
      url: "/admin/pending-students", 
      count: pendingCount,
      highlight: pendingCount > 0,
      description: "Review student enrollment requests with completed profiles"
    },
    { title: "Rooms", icon: Bed, url: "/room" },
    {
      title: "Complaints",
      icon: MessageSquare,
      url: "/complaint",
      count: unviewedComplaintCount > 0 ? unviewedComplaintCount : undefined,
      highlight: unviewedComplaintCount > 0,
      description: "View and respond to student complaints",
      onClick: () => {
        // Immediately clear the notification indicator
        setUnviewedComplaintCount(0);
        // Show the complaints section in the dashboard
        setShowComplaintsSection(true);
        
        // Mark complaints as viewed
        api.post('/notifications/new-complaints/mark-viewed')
          .then(() => {
            console.log('Marked all complaints as viewed via API');
            // Dispatch event to notify any other components
            window.dispatchEvent(new CustomEvent('complaints-viewed'));
            
            // Show a subtle notification
            if (unviewedComplaintCount > 0) {
              notify.info(
                "Complaints Updated", 
                `${unviewedComplaintCount} complaint${unviewedComplaintCount > 1 ? 's' : ''} marked as viewed.`
              );
            }
          })
          .catch(err => {
            console.error('Failed to mark complaints as viewed via API:', err);
            // Fallback to localStorage method
            api.get('/complaints')
              .then(response => {
                const allComplaintIds = response.data.map((c: any) => c.id);
                localStorage.setItem('viewedComplaints', JSON.stringify(allComplaintIds));
                console.log('Marked complaints as viewed via localStorage fallback');
              })
              .catch(fetchErr => {
                console.error('Failed to fetch complaints for marking as viewed:', fetchErr);
                notify.error(
                  "Sync Error", 
                  "Failed to mark complaints as viewed. Your status will sync when you reconnect."
                );
              });
          });
      }
    },
    { title: "Manage Students", icon: Users, url: "/admin/student-management", description: "Allocate rooms and manage student status" },
    { 
      title: "Fee Management", 
      icon: Wallet, 
      url: "/admin/fee-payment",
      description: "Send fee notifications and track payments"
    },
    { 
      title: "Notices", 
      icon: FileText, 
      url: "/notice",
      description: "Manage hostel notices and announcements"
    },
    {
      title: "Feedback",
      icon: FileText,
      url: "#",
      count: unreadFeedbackCount > 0 ? unreadFeedbackCount : undefined,
      highlight: unreadFeedbackCount > 0,
      description: unreadFeedbackCount > 0 
        ? `${unreadFeedbackCount} new feedback ${unreadFeedbackCount === 1 ? 'item' : 'items'} to review` 
        : "View student feedback",
      onClick: handleFeedbackClick
    }
  ];

  // Add this effect to restore state when returning from student profile
  useEffect(() => {
    const savedState = sessionStorage.getItem('adminDashboardState');
    if (savedState) {
      const { scrollPosition, showComplaintsSection, returnPath } = JSON.parse(savedState);
      if (returnPath === location.pathname) {
        setShowComplaintsSection(showComplaintsSection);
        window.scrollTo(0, scrollPosition);
        sessionStorage.removeItem('adminDashboardState');
      }
    }
  }, [location.pathname]);

  return (
    <div className="w-full max-w-5xl mx-auto py-10 animate-fade-in relative">
      <BackgroundSlideshow />
      
      {/* Header section with increased bottom margin for better spacing */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
        <h1 className="text-4xl font-bold text-primary">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          {/* Modern refresh button */}
          <button 
            onClick={() => {
              if (!refreshing) {
                setRefreshing(true);
                notify.info("Refreshing Dashboard", "Reloading the page...");
                
                // Use simple page reload with a slight delay to show animation
                setTimeout(() => {
                  window.location.reload();
                }, 500);
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
          
          {/* Profile indicator with dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
              aria-label="Admin profile"
            >
              <span className="text-lg font-semibold">A</span>
            </button>
            
            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-10 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm text-gray-500">Signed in as</p>
                  <p className="font-medium text-gray-800">Admin</p>
                </div>
                <div className="mt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Add extra spacing between header and content */}
      <div className="mt-6">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">{error}</div>
        ) : (
          <>
            {/* Only show complaints section when clicked */}
            {showComplaintsSection && <RecentComplaints onClose={handleCloseSection} />}
            
            {/* Only show the card grid if no sections are expanded */}
            {!showComplaintsSection && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
                {admCards.map((c) => (
                  <DashboardCard 
                    key={c.title} 
                    title={c.title} 
                    icon={c.icon} 
                    url={c.url} 
                    count={c.count}
                    highlight={c.highlight}
                    description={c.description}
                    onClick={c.onClick}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
