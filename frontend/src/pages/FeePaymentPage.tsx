import { useState, useEffect } from 'react';
import { Wallet, Info, AlertTriangle, Bell, Check, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from '@/components/ui/sonner';

interface FeePayment {
  id: number;
  description: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  due_date?: string;
  student_id?: number;
}

interface FeeNotification {
  id: number;
  title: string;
  content: string;
  created_at: string;
  notification_type: string;
  is_read: boolean;
}

const FeePaymentPage = () => {
  const [fees, setFees] = useState<FeePayment[]>([]);
  const [notifications, setNotifications] = useState<FeeNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeePayments();
    fetchFeeNotifications();
    
    // Mark all fee notifications as viewed in dashboard when the page is opened
    const markNotificationsAsViewedInDashboard = async () => {
      try {
        await api.post('/student/fee-notifications/mark-viewed-in-dashboard');
        // Dispatch event to update the dashboard notification counter
        const updateEvent = new CustomEvent('fee-notifications-update');
        window.dispatchEvent(updateEvent);
      } catch (error) {
        console.error('Failed to mark fee notifications as viewed in dashboard:', error);
      }
    };
    
    markNotificationsAsViewedInDashboard();
  }, []);

  const fetchFeePayments = async () => {
    try {
      // In a real implementation, this would fetch from the backend
      // For now, we'll use a placeholder until the API is implemented
      const response = await api.get('/fees');
      setFees(response.data);
    } catch (err) {
      console.error('Failed to fetch fee payments:', err);
      // Use placeholder data if API call fails
      setFees([
        { id: 1, description: "Hostel Fee (Current Semester)", amount: 24500, status: "Pending", due_date: "2023-12-15" },
        { id: 2, description: "Mess Fee (Current Semester)", amount: 7800, status: "Paid" }
      ]);
    }
  };

  const fetchFeeNotifications = async () => {
    try {
      // Try to fetch dedicated fee notifications first
      try {
        const response = await api.get('/student/fee-notifications');
        const feeNotifications = response.data.map((notification: any) => ({
          ...notification,
          is_read: isNotificationRead(notification.id)
        }));
        
        setNotifications(feeNotifications);
        
        // Update unread count
        const unreadNotifications = feeNotifications.filter((n: FeeNotification) => !n.is_read);
        setUnreadCount(unreadNotifications.length);
        
      } catch (primaryErr) {
        console.error('Failed to fetch fee notifications, trying fallback:', primaryErr);
        
        // Fallback to notices endpoint and filter for fee-related ones
        const response = await api.get('/notices');
        
        // Filter for fee-related notifications
        const feeNotifications = response.data
          .filter((notice: any) => 
            notice.title.toLowerCase().includes('fee') || 
            notice.content.toLowerCase().includes('fee payment') ||
            notice.notification_type === 'fee_payment'
          )
          .map((notice: any) => ({
            ...notice,
            is_read: isNotificationRead(notice.id)
          }));
        
        setNotifications(feeNotifications);
        
        // Update unread count
        const unreadNotifications = feeNotifications.filter((n: FeeNotification) => !n.is_read);
        setUnreadCount(unreadNotifications.length);
      }
    } catch (err) {
      console.error('Failed to fetch fee notifications:', err);
      // Don't show error for notifications, just show empty state
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const isNotificationRead = (notificationId: number): boolean => {
    // Check localStorage for read status
    const readNoticesStr = localStorage.getItem('readFeeNotifications');
    const readNotices: number[] = readNoticesStr ? JSON.parse(readNoticesStr) : [];
    return readNotices.includes(notificationId);
  };

  const markAsRead = async (notificationId: number) => {
    // Get current read notifications
    const readNoticesStr = localStorage.getItem('readFeeNotifications');
    const readNotices: number[] = readNoticesStr ? JSON.parse(readNoticesStr) : [];
    
    // Add this notification if not already included
    if (!readNotices.includes(notificationId)) {
      const updatedReadNotices = [...readNotices, notificationId];
      localStorage.setItem('readFeeNotifications', JSON.stringify(updatedReadNotices));
      
      // Update UI
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      
      // Also mark as read on the server if the endpoint exists
      try {
        await api.post(`/student/fee-notifications/${notificationId}/read`);
      } catch (err) {
        console.error('Failed to mark notification as read on server:', err);
        // Not critical if this fails - we still have local state updated
      }
      
      // Notify other components that might be displaying fee notifications
      const updateEvent = new CustomEvent('fee-notifications-update', { 
        detail: { readNotificationId: notificationId } 
      });
      window.dispatchEvent(updateEvent);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  const handlePayFee = (feeId: number) => {
    // Find the fee object by ID
    const feeToProcess = fees.find(fee => fee.id === feeId);
    
    if (!feeToProcess) {
      toast.error("Fee information not found");
      return;
    }
    
    // Get student ID from localStorage (if not already in the fee object)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const studentId = user.id || 1; // Fallback to ID 1 if not found
    
    // Create a complete fee object including student_id if needed
    const completeFeeData = {
      ...feeToProcess,
      student_id: feeToProcess.student_id || studentId
    };
    
    // Navigate to checkout page with fee data
    navigate('/checkout', { state: { fee: completeFeeData } });
  };

  return (
    <div className="py-8 max-w-2xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-7">
        <h1 className="text-3xl font-bold flex items-center">
          <Wallet className="mr-2 text-primary" />
          Fee Payment
        </h1>
        
        {unreadCount > 0 && (
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center animate-pulse">
            <Bell className="w-4 h-4 mr-1" />
            {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Fee Notifications */}
      {notifications.length > 0 && (
        <div className={`mb-6 ${unreadCount > 0 ? 'border-2 border-red-400 rounded-lg p-1' : ''}`}>
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Bell className="mr-2 text-primary w-5 h-5" />
            Fee Notifications
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 mb-6">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${notification.is_read ? '' : 'bg-yellow-50'}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex justify-between mb-1">
                  <h3 className={`font-medium ${notification.is_read ? 'text-gray-700' : 'text-primary'} flex items-center`}>
                    {!notification.is_read && <ShieldAlert className="w-4 h-4 mr-1 text-red-500" />}
                    {notification.title}
                  </h3>
                  {!notification.is_read && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full flex items-center">
                      <Bell className="w-3 h-3 mr-1" />
                      New
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{notification.content}</p>
                <p className="text-xs text-gray-500 mt-1">{formatDate(notification.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      ) : loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fee information...</p>
        </div>
      ) : (
        <>
          <table className="min-w-full bg-white/80 rounded-lg overflow-hidden shadow mb-6">
            <thead className="text-left bg-primary text-white">
              <tr>
                <th className="p-4">Type</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No fee records found
                  </td>
                </tr>
              ) : (
                fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-gray-200">
                    <td className="p-4">{fee.description}</td>
                    <td className="p-4">&#8377; {fee.amount.toLocaleString()}</td>
                    <td className="p-4">{fee.due_date ? formatDate(fee.due_date) : 'N/A'}</td>
                    <td className={`p-4 font-semibold ${
                      fee.status === "Paid" 
                        ? "text-green-700" 
                        : fee.status === "Overdue" 
                          ? "text-red-700" 
                          : "text-orange-700"
                    }`}>
                      <div className="flex items-center">
                        {fee.status === "Paid" && <Check className="w-4 h-4 mr-1" />}
                        {fee.status === "Pending" && <AlertTriangle className="w-4 h-4 mr-1" />}
                        {fee.status === "Overdue" && <Info className="w-4 h-4 mr-1" />}
                        {fee.status}
                      </div>
                    </td>
                    <td className="p-4">
                      {fee.status !== "Paid" && (
                        <button 
                          onClick={() => handlePayFee(fee.id)}
                          className="bg-primary hover:bg-secondary text-white text-sm font-bold py-1 px-3 rounded hover:scale-105 transition-all"
                        >
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {fees.some(fee => fee.status === "Pending" || fee.status === "Overdue") && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-start mb-6">
              <Info className="text-blue-500 h-5 w-5 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-700">Payment Information</h3>
                <p className="text-sm text-blue-600 mt-1">
                  Fees can be paid through bank transfer or online payment. Once payment is complete, 
                  it may take 1-2 business days to reflect in your account.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FeePaymentPage;
