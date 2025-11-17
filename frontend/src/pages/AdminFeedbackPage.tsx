import { useState, useEffect } from "react";
import { FileText, User, Calendar } from "lucide-react";
import api, { directFetch } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { isAdmin } from "../utils/auth";

interface Feedback {
  id: number;
  content: string;
  created_at: string;
  is_read: boolean;
  rating: number;
}

const AdminFeedbackPage = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);
  const navigate = useNavigate();

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/login');
    }
  }, [navigate]);
  
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
        
        // API returns feedback sorted by is_read (unread first) and created_at (newest first)
        setFeedback(feedbackData);
        
        // Mark all feedback as read
        try {
          await api.post('/feedback/mark-read');
        } catch (apiErr) {
          console.error('Failed to mark feedback as read with API, trying directFetch:', apiErr);
          await directFetch('/feedback/mark-read', { method: 'POST' });
        }
        
        // Dispatch an event to notify about viewed feedback
        window.dispatchEvent(new CustomEvent('feedback-viewed'));
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
        setError('Failed to load feedback. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);
  
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

  const toggleFeedback = (feedbackId: number) => {
    setExpandedFeedback(current => current === feedbackId ? null : feedbackId);
  };
  
  return (
    <div className="py-8 max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <FileText className="text-primary" /> Student Feedback
      </h1>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : feedback.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          No feedback available at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {feedback.map((item) => (
            <div 
              key={item.id} 
              className="bg-white border border-gray-100 rounded-lg shadow-md overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="text-gray-400 w-4 h-4" />
                  <span className="text-sm text-gray-500">{formatDate(item.created_at)}</span>
                </div>
                <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  Rating: {item.rating}/5
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <button 
                    onClick={() => toggleFeedback(item.id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {expandedFeedback === item.id ? "Show Less" : "Show More"}
                  </button>
                </div>
                
                <div className={`mt-3 ${expandedFeedback === item.id ? '' : 'line-clamp-3'}`}>
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackPage; 