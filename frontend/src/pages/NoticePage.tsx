import { useState, useEffect } from 'react';
import { Info, Plus, Edit, Trash2, X, Check, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { isAdmin } from '../utils/auth';
import { toast } from '@/components/ui/sonner';

interface Notice {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

const NoticePage = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [readNotices, setReadNotices] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [noticesPerPage] = useState(5);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  // Form states
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  
  useEffect(() => {
    // Check if user is admin
    setIsAdminUser(isAdmin());
    
    // Get read notices from localStorage
    const readNoticesStr = localStorage.getItem('readNotices');
    if (readNoticesStr) {
      setReadNotices(JSON.parse(readNoticesStr));
    }
    
    // Fetch notices on component mount
    fetchNotices();
  }, []);
  
  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notices');
      setNotices(response.data);
      
      // If not an admin, mark all visible notices as read
      // Only when actually viewing the notices page
      if (!isAdmin()) {
        markAllAsRead(response.data);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notices:', err);
      setError('Unable to load notices. Please try again later.');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Mark all notices as read
  const markAllAsRead = (noticesList: Notice[]) => {
    // Get current read notices
    const readNoticesStr = localStorage.getItem('readNotices');
    const currentReadNotices: number[] = readNoticesStr ? JSON.parse(readNoticesStr) : [];
    
    // Add all notice IDs if not already included
    let updated = false;
    const updatedReadNotices = [...currentReadNotices];
    
    noticesList.forEach(notice => {
      if (!updatedReadNotices.includes(notice.id)) {
        updatedReadNotices.push(notice.id);
        updated = true;
      }
    });
    
    // Update localStorage and state if changed
    if (updated) {
      localStorage.setItem('readNotices', JSON.stringify(updatedReadNotices));
      setReadNotices(updatedReadNotices);
      
      // Dispatch an event to notify other components about read notices
      const updateEvent = new CustomEvent('notices-read-update', { 
        detail: { readNotices: updatedReadNotices } 
      });
      window.dispatchEvent(updateEvent);
    }
  };
  
  // Filter notices based on read/unread status
  const filteredNotices = notices.filter(notice => {
    if (filter === 'unread') return !readNotices.includes(notice.id);
    if (filter === 'read') return readNotices.includes(notice.id);
    return true;
  });

  // Get current notices for pagination
  const indexOfLastNotice = currentPage * noticesPerPage;
  const indexOfFirstNotice = indexOfLastNotice - noticesPerPage;
  const currentNotices = filteredNotices.slice(indexOfFirstNotice, indexOfLastNotice);
  const totalPages = Math.ceil(filteredNotices.length / noticesPerPage);
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    
    try {
      setLoading(true);
      
      if (editingNoticeId) {
        // Update existing notice
        await api.put(`/notices/${editingNoticeId}`, {
          title: formTitle,
          content: formContent
        });
        toast.success('Notice updated successfully');
      } else {
        // Create new notice
        await api.post('/notices', {
          title: formTitle,
          content: formContent
        });
        toast.success('Notice created successfully');
      }
      
      // Reset form and fetch updated notices
      resetForm();
      fetchNotices();
    } catch (err) {
      console.error('Failed to save notice:', err);
      toast.error(editingNoticeId ? 'Failed to update notice' : 'Failed to create notice');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditNotice = (notice: Notice) => {
    setFormTitle(notice.title);
    setFormContent(notice.content);
    setEditingNoticeId(notice.id);
    setShowForm(true);
  };
  
  const handleDeleteNotice = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`/notices/${id}`);
      toast.success('Notice deleted successfully');
      fetchNotices();
    } catch (err) {
      console.error('Failed to delete notice:', err);
      toast.error('Failed to delete notice');
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setEditingNoticeId(null);
    setShowForm(false);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Info className="mr-2 text-primary" />
          Notices
        </h1>
        
        {isAdminUser && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-md flex items-center hover:bg-primary/90 transition-colors"
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Notice
          </button>
        )}
      </div>
      
      {/* Filter Controls */}
      {!isAdminUser && (
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-md ${filter === 'unread' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-md ${filter === 'read' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            Read
          </button>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {isAdminUser && showForm && (
        <div className="bg-white rounded-lg shadow-md p-5 mb-8 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingNoticeId ? 'Edit Notice' : 'New Notice'}
            </h2>
            <button 
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleFormSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Notice Title"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                placeholder="Notice Content"
                required
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 flex items-center"
                disabled={loading}
              >
                <Check className="w-4 h-4 mr-2" />
                {editingNoticeId ? 'Update' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading && notices.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notices...</p>
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-6 rounded-lg text-center">
          <Info className="w-12 h-12 mx-auto mb-4 text-blue-500" />
          <p className="text-lg font-medium">No notices available</p>
          <p className="text-sm mt-1">
            {isAdminUser 
              ? 'Create your first notice by clicking the "Add Notice" button above.' 
              : 'Check back later for updates.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {currentNotices.map((notice) => (
            <li 
              key={notice.id} 
              className="bg-white/85 border-l-4 border-primary px-4 py-4 rounded-lg shadow animate-fade-in relative overflow-hidden"
            >
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(notice.created_at)}
                </span>
                <h2 className="text-lg font-bold mt-1 mb-1">{notice.title}</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>
              </div>
              
              {isAdminUser && (
                <div className="absolute top-3 right-3 flex gap-2">
                  <button 
                    onClick={() => handleEditNotice(notice)}
                    className="p-1 bg-blue-50 text-blue-500 rounded hover:bg-blue-100"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteNotice(notice.id)}
                    className="p-1 bg-red-50 text-red-500 rounded hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      
      {/* Pagination Controls */}
      {!loading && notices.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default NoticePage;
