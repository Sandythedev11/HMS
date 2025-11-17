import { useState, useEffect } from "react";
import { FileText, Edit, Trash2, Check, X, Send } from "lucide-react";
import api, { directFetch } from "../utils/api";

interface Feedback {
  id: number;
  content: string;
  user_id: number;
  user_name: string;
  created_at: string;
  is_read: boolean;
  rating: number;
}

const FeedbackPage = () => {
  const [form, setForm] = useState({ content: "", rating: 5 });
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ content: "", rating: 5 });
  const [submitting, setSubmitting] = useState(false);

  // Fetch feedback on mount
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        let feedbackData;
        
        try {
          // First try with regular API
          const response = await api.get('/feedback');
          feedbackData = response.data;
        } catch (apiErr) {
          console.error('Regular API fetch failed, trying directFetch:', apiErr);
          
          // Fallback to directFetch
          feedbackData = await directFetch('/feedback');
        }
        
        setFeedback(feedbackData);
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
        setError('Failed to load feedback. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Handle form input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm({ ...form, content: e.target.value });
  };

  // Handle rating change
  const handleRatingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, rating: parseInt(e.target.value) });
  };

  // Handle edit form input change
  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, content: e.target.value });
  };

  // Handle edit rating change
  const handleEditRatingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditForm({ ...editForm, rating: parseInt(e.target.value) });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.content.trim()) return;
    
    try {
      setSubmitting(true);
      // Get the current user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Add a default rating value to satisfy the database constraint
      const formDataWithRating = { 
        content: form.content,
        rating: form.rating,
        comment: form.content, // Add comment field for backward compatibility
        user_id: user.id,
        user_name: user.name || 'Student'
      };
      
      let responseData;
      
      try {
        // First try with regular API
        const response = await api.post('/feedback', formDataWithRating);
        responseData = response.data;
      } catch (apiErr) {
        console.error('Regular API post failed, trying directFetch:', apiErr);
        
        // Fallback to directFetch
        responseData = await directFetch('/feedback', {
          method: 'POST',
          body: JSON.stringify(formDataWithRating)
        });
      }
      
      setFeedback(prev => [responseData, ...prev]);
      setForm({ content: "", rating: 5 });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing feedback
  const handleEdit = (feedbackItem: Feedback) => {
    setEditingId(feedbackItem.id);
    setEditForm({ content: feedbackItem.content, rating: feedbackItem.rating });
  };

  // Submit edited feedback
  const handleUpdateFeedback = async (feedbackId: number) => {
    if (!editForm.content.trim()) return;
    
    try {
      setSubmitting(true);
      // Get the current user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Add a default rating value to satisfy the database constraint
      const editFormWithRating = {
        content: editForm.content,
        rating: editForm.rating,
        comment: editForm.content, // Add comment field for backward compatibility
        user_id: user.id,
        user_name: user.name || 'Student'
      };
      
      let responseData;
      
      try {
        // First try with regular API
        const response = await api.put(`/feedback/${feedbackId}`, editFormWithRating);
        responseData = response.data;
      } catch (apiErr) {
        console.error('Regular API update failed, trying directFetch:', apiErr);
        
        // Fallback to directFetch
        responseData = await directFetch(`/feedback/${feedbackId}`, {
          method: 'PUT',
          body: JSON.stringify(editFormWithRating)
        });
      }
      
      // Update the feedback list with the edited item
      setFeedback(prev => 
        prev.map(item => item.id === feedbackId ? responseData : item)
      );
      
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update feedback:', err);
      setError('Failed to update feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete feedback
  const handleDeleteFeedback = async (feedbackId: number) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      try {
        // First try with regular API
        await api.delete(`/feedback/${feedbackId}`);
      } catch (apiErr) {
        console.error('Regular API delete failed, trying directFetch:', apiErr);
        
        // Fallback to directFetch
        await directFetch(`/feedback/${feedbackId}`, {
          method: 'DELETE'
        });
      }
      
      // Remove the deleted item from the list
      setFeedback(prev => prev.filter(item => item.id !== feedbackId));
    } catch (err) {
      console.error('Failed to delete feedback:', err);
      setError('Failed to delete feedback. Please try again.');
    }
  };

  return (
    <div className="py-8 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-7 flex gap-2 items-center"><FileText className="text-primary" /> Feedback</h1>
      
      {/* Feedback form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white/85 rounded-xl shadow p-8 border mb-8">
        <h2 className="text-xl font-semibold">Share Your Experience</h2>
        <textarea
          placeholder="Tell us about your hostel experience..."
          className="px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[130px]"
          value={form.content}
          onChange={handleChange}
          required
        />
        <div className="flex items-center gap-2">
          <label htmlFor="rating" className="text-sm font-medium">Rating:</label>
          <select
            id="rating"
            className="px-2 py-1 border rounded-md"
            value={form.rating}
            onChange={handleRatingChange}
          >
            <option value="1">1 - Poor</option>
            <option value="2">2 - Fair</option>
            <option value="3">3 - Good</option>
            <option value="4">4 - Very Good</option>
            <option value="5">5 - Excellent</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting || !form.content.trim()}
          className="bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition-all shadow hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : (
            <>
              <Send size={18} />
              Submit Feedback
            </>
          )}
        </button>
      </form>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {/* Feedback list */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Your Submitted Feedback</h2>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : feedback.length === 0 ? (
          <div className="bg-white/85 rounded-xl shadow p-8 border text-center text-gray-500">
            You haven't submitted any feedback yet.
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map(item => (
              <div key={item.id} className="bg-white/85 rounded-xl shadow p-6 border">
                {/* Header with date and actions */}
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm text-gray-500">
                    {formatDate(item.created_at)}
                  </span>
                  
                  {/* Edit/Delete buttons */}
                  {editingId !== item.id && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteFeedback(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                  
                  {/* Save/Cancel buttons when editing */}
                  {editingId === item.id && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleUpdateFeedback(item.id)}
                        disabled={submitting}
                        className="text-green-500 hover:text-green-700"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Content */}
                {editingId === item.id ? (
                  <>
                    <textarea
                      className="w-full px-3 py-2 border rounded min-h-[100px] mb-2"
                      value={editForm.content}
                      onChange={handleEditChange}
                      required
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <label htmlFor="edit-rating" className="text-sm font-medium">Rating:</label>
                      <select
                        id="edit-rating"
                        className="px-2 py-1 border rounded-md"
                        value={editForm.rating}
                        onChange={handleEditRatingChange}
                      >
                        <option value="1">1 - Poor</option>
                        <option value="2">2 - Fair</option>
                        <option value="3">3 - Good</option>
                        <option value="4">4 - Very Good</option>
                        <option value="5">5 - Excellent</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {item.content}
                    </p>
                    <div className="mt-2 text-sm text-gray-500">
                      Rating: {item.rating}/5
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
