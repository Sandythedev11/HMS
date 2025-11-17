import { useState, useEffect } from "react";
import { MessageSquare, Edit, Trash2, Reply, Send, Save, X } from "lucide-react";
import api from "../utils/api";
import { getUserInfo } from "../utils/auth";
import ProfileAvatar from "../components/ProfileAvatar";
import { useNavigate } from "react-router-dom";
import { notify } from "../utils/notifications";

interface Complaint {
  id: number;
  student_id: number;
  student_name: string;
  student_profile_picture?: string;
  student_roll_number?: string;
  subject: string;
  details: string;
  created_at: string;
  updated_at: string;
  replies?: Reply[];
}

interface Reply {
  id: number;
  complaint_id: number;
  user_id: number;
  user_name: string;
  user_profile_picture?: string;
  content: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

const ComplaintPage = () => {
  const [form, setForm] = useState({ subject: "", details: "" });
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", details: "" });
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReply, setEditingReply] = useState<number | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  
  const user = getUserInfo();
  const isUserAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  // Fetch all complaints
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        const response = await api.get('/complaints');
        // API returns complaints sorted by created_at in descending order (latest first)
        setComplaints(response.data);
        
        // Mark complaints as viewed if user is admin
        const userInfo = getUserInfo();
        if (userInfo?.role === 'admin') {
          try {
            await api.post('/notifications/new-complaints/mark-viewed');
            console.log('Marked all complaints as viewed via API');
            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('complaints-viewed'));
            
            // Show a subtle notification if there were new complaints
            if (response.data.length > 0) {
              notify.info(
                "Complaints Updated", 
                "All complaints have been marked as viewed."
              );
            }
          } catch (err) {
            console.error('Failed to mark complaints as viewed via API:', err);
            // Fallback to localStorage
            try {
              const allComplaintIds = response.data.map((c: any) => c.id);
              localStorage.setItem('viewedComplaints', JSON.stringify(allComplaintIds));
              // Still dispatch the event even with the fallback method
              window.dispatchEvent(new CustomEvent('complaints-viewed'));
              console.log('Marked complaints as viewed via localStorage');
            } catch (storageErr) {
              console.error('Failed to mark complaints as viewed via localStorage:', storageErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch complaints:', err);
        setError('Failed to load complaints. Please try again later.');
        notify.error(
          "Loading Failed", 
          "Failed to load complaints. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!form.subject.trim() || !form.details.trim()) {
      notify.error(
        "Validation Error", 
        "Please provide both a subject and details for your complaint."
      );
      return;
    }
    
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        user_id: user?.id,
        student_name: user?.name || 'Student'
      };
      
      const response = await api.post('/complaints', payload);
      setComplaints(prev => [response.data, ...prev]);
      setForm({ subject: "", details: "" });
      
      notify.success(
        "Complaint Submitted", 
        "Your complaint has been submitted successfully."
      );
    } catch (err) {
      console.error('Failed to submit complaint:', err);
      setError('Failed to submit complaint. Please try again.');
      
      notify.error(
        "Submission Failed", 
        "Failed to submit your complaint. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const handleEdit = (complaint: Complaint) => {
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
    if (!editForm.subject.trim() || !editForm.details.trim()) {
      notify.error(
        "Validation Error", 
        "Please provide both a subject and details for your complaint."
      );
      return;
    }
    
    try {
      const response = await api.put(`/complaints/${complaintId}`, editForm);
      setComplaints(prev => 
        prev.map(c => c.id === complaintId ? { ...c, ...response.data } : c)
      );
      setEditingComplaint(null);
      
      notify.success(
        "Complaint Updated", 
        "Your complaint has been updated successfully."
      );
    } catch (err) {
      console.error('Failed to update complaint:', err);
      setError('Failed to update complaint. Please try again.');
      
      notify.error(
        "Update Failed", 
        "Failed to update your complaint. Please try again."
      );
    }
  };

  const handleDeleteComplaint = async (complaintId: number) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try {
        // Find the complaint to delete for potential undo functionality
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
              const payload = {
                subject,
                details,
                user_id: user?.id,
                student_name: user?.name || 'Student'
              };
              
              const response = await api.post('/complaints', payload);
              setComplaints(prev => [response.data, ...prev]);
              
              notify.success(
                "Complaint Restored", 
                "Your complaint has been restored successfully."
              );
            } catch (err) {
              console.error('Failed to restore complaint:', err);
              notify.error(
                "Restore Failed", 
                "Failed to restore your complaint. Please try again."
              );
            }
          }
        );
      } catch (err) {
        console.error('Failed to delete complaint:', err);
        setError('Failed to delete complaint. Please try again.');
        
        notify.error(
          "Delete Failed", 
          "Failed to delete your complaint. Please try again."
        );
      }
    }
  };

  const handleReply = (complaintId: number) => {
    setReplyingTo(complaintId);
    setReplyContent("");
  };

  const submitReply = async (complaintId: number) => {
    if (!replyContent.trim()) {
      notify.error(
        "Empty Reply", 
        "Please enter a reply before submitting."
      );
      return;
    }
    
    try {
      setSubmittingReply(true);
      const payload = {
        user_id: user?.id,
        user_name: user?.name || (isUserAdmin ? 'Admin' : 'Student'),
        content: replyContent,
        is_admin: isUserAdmin
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
      
      notify.success(
        "Reply Sent", 
        isUserAdmin ? 
          "Your reply has been sent to the student." : 
          "Your reply has been sent to the administrator."
      );
    } catch (err) {
      console.error('Failed to submit reply:', err);
      setError('Failed to submit reply. Please try again.');
      
      notify.error(
        "Reply Failed", 
        "Failed to send your reply. Please try again."
      );
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleEditReply = (reply: Reply) => {
    setEditingReply(reply.id);
    setEditReplyContent(reply.content);
  };

  const updateReply = async (replyId: number, complaintId: number) => {
    if (!editReplyContent.trim()) {
      notify.error(
        "Empty Reply", 
        "Reply content cannot be empty."
      );
      return;
    }
    
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
              replies: (c.replies || []).map((r: Reply) => 
                r.id === replyId ? { ...r, content: editReplyContent } : r
              )
            };
          }
          return c;
        })
      );
      
      setEditingReply(null);
      
      notify.success(
        "Reply Updated", 
        "Your reply has been updated successfully."
      );
    } catch (err) {
      console.error('Failed to update reply:', err);
      setError('Failed to update reply. Please try again.');
      
      notify.error(
        "Update Failed", 
        "Failed to update your reply. Please try again."
      );
    }
  };

  const handleDeleteReply = async (replyId: number, complaintId: number) => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      try {
        // Save reply content for potential undo
        const complaint = complaints.find(c => c.id === complaintId);
        if (!complaint || !complaint.replies) return;
        
        const replyToDelete = complaint.replies.find(r => r.id === replyId);
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
                replies: (c.replies || []).filter(r => r.id !== replyId)
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
              const payload = {
                content: replyContent,
                is_admin: isUserAdmin
              };
              
              const response = await api.post(`/complaints/${complaintId}/replies`, payload);
              
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
              
              notify.success(
                "Reply Restored", 
                "Your reply has been restored successfully."
              );
            } catch (err) {
              console.error('Failed to restore reply:', err);
              notify.error(
                "Restore Failed", 
                "Failed to restore your reply. Please try again."
              );
            }
          }
        );
      } catch (err) {
        console.error('Failed to delete reply:', err);
        setError('Failed to delete reply. Please try again.');
        
        notify.error(
          "Delete Failed", 
          "Failed to delete your reply. Please try again."
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
    <div className="py-8 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-7 flex gap-2 items-center">
        <MessageSquare className="text-primary" /> Complaints
      </h1>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {/* New complaint form */}
      {!isUserAdmin && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white/85 rounded-xl shadow p-8 border mb-8">
          <h2 className="text-xl font-semibold">Submit a New Complaint</h2>
          <input
            type="text"
            placeholder="Subject"
            className="px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.subject}
            onChange={e => handleChange("subject", e.target.value)}
            required
          />
          <textarea
            placeholder="Describe the issue"
            className="px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
            value={form.details}
            onChange={e => handleChange("details", e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition-all shadow hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? "Submitting..." : "Submit Complaint"}
          </button>
        </form>
      )}
      
      {/* Complaints List */}
      <div className="space-y-5">
        <h2 className="text-xl font-semibold mb-4">
          {isUserAdmin ? "Student Complaints" : "Your Complaints"}
        </h2>
        
        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white/85 rounded-xl shadow p-8 border text-center text-gray-500">
            No complaints found.
          </div>
        ) : (
          <div className="space-y-6">
            {complaints.map(complaint => (
              <div key={complaint.id} className="bg-white/85 rounded-xl shadow p-6 border">
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
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <span className="font-medium hover:text-primary cursor-pointer" onClick={() => navigate(`/admin/students/${complaint.student_id}`)}>
                            {complaint.student_name}
                          </span>
                          • {formatDate(complaint.created_at)}
                        </p>
                      </div>
                      
                      {/* Edit/Delete buttons */}
                      {(complaint.student_id === user?.id || isUserAdmin) && editingComplaint !== complaint.id && (
                        <div className="flex space-x-2">
                          {complaint.student_id === user?.id && (
                            <>
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
                            </>
                          )}
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
                    <div className="mt-3">
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
                <div className="mt-6 pl-14 border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Replies</h4>
                    
                    {/* Reply button */}
                    {replyingTo !== complaint.id && (
                      <button 
                        onClick={() => handleReply(complaint.id)}
                        className="text-sm flex items-center gap-1 text-blue-500 hover:text-blue-700"
                      >
                        <Reply size={14} /> Reply
                      </button>
                    )}
                  </div>
                  
                  {/* Replies list */}
                  <div className="space-y-4">
                    {complaint.replies && complaint.replies.length > 0 ? (
                      complaint.replies.map(reply => (
                        <div key={reply.id} className={`flex items-start gap-3 ${reply.is_admin ? 'ml-4' : ''}`}>
                          <ProfileAvatar
                            src={reply.user_profile_picture}
                            alt={reply.user_name}
                            size="sm"
                          />
                          <div className={`flex-1 p-3 rounded-lg ${reply.is_admin ? 'bg-blue-50' : 'bg-gray-50'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${reply.is_admin ? 'text-blue-600' : 'text-gray-800'}`}>
                                  {reply.user_name} {reply.is_admin && '(Admin)'}
                                </span>
                                <span className="text-xs text-gray-500">• {formatDate(reply.created_at)}</span>
                              </div>
                              
                              {/* Edit/Delete reply buttons */}
                              {((reply.user_id === user?.id) || (isUserAdmin && reply.is_admin)) && (
                                <div className="flex space-x-1">
                                  <button 
                                    onClick={() => handleEditReply(reply)}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteReply(reply.id, complaint.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* Reply content */}
                            {editingReply === reply.id ? (
                              <div className="mt-2">
                                <textarea
                                  className="w-full px-2 py-1 border rounded text-sm min-h-[60px]"
                                  value={editReplyContent}
                                  onChange={e => setEditReplyContent(e.target.value)}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                  <button 
                                    onClick={() => updateReply(reply.id, complaint.id)}
                                    className="px-2 py-1 bg-blue-500 text-white rounded-md text-xs"
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={() => setEditingReply(null)}
                                    className="px-2 py-1 bg-gray-200 rounded-md text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-1">{reply.content}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No replies yet</p>
                    )}
                  </div>
                  
                  {/* Reply form */}
                  {replyingTo === complaint.id && (
                    <div className="mt-4">
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintPage;
