import { useState, useEffect } from 'react';
import { Bell, X, Check, Users, Search, Wallet, Plus, Calendar, FileText, DollarSign, Clock, History, BadgeCheck, Filter } from 'lucide-react';
import api from '../utils/api';
import { isAdmin } from '../utils/auth';
import { toast } from '@/components/ui/sonner';

interface Student {
  id: number;
  name: string;
  roll_number: string;
  email: string;
  course?: string;
}

interface Fee {
  id: number;
  student_id: number;
  description: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  due_date?: string;
  payment_date?: string;
  student_name?: string;
  student_roll_number?: string;
}

type ActiveTab = 'create' | 'history';

const AdminFeePaymentPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFees, setLoadingFees] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Notification form state
  const [showNotificationForm, setShowNotificationForm] = useState<boolean>(false);
  const [notificationContent, setNotificationContent] = useState<string>(
    'This is a reminder that your hostel fee payment is pending. Please pay at your earliest convenience.'
  );
  const [notificationTitle, setNotificationTitle] = useState<string>('Fee Payment Reminder');
  const [sendingNotification, setSendingNotification] = useState<boolean>(false);
  
  // Fee creation form state
  const [showFeeForm, setShowFeeForm] = useState<boolean>(false);
  const [feeDescription, setFeeDescription] = useState<string>('');
  const [feeAmount, setFeeAmount] = useState<string>('');
  const [feeDueDate, setFeeDueDate] = useState<string>('');
  const [creatingFee, setCreatingFee] = useState<boolean>(false);

  useEffect(() => {
    if (!isAdmin()) {
      setError("You don't have permission to access this page");
      setLoading(false);
      return;
    }

    fetchStudents();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAllFees();
    }
  }, [activeTab]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/students/approved');
      setStudents(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setError('Unable to load students list. Please try again later.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFees = async () => {
    try {
      setLoadingFees(true);
      // Get all fees (we'll need to add a backend endpoint for this)
      const response = await api.get('/fees');
      
      // Enrich fee data with student names
      const feesWithStudentInfo = response.data.map((fee: Fee) => {
        const student = students.find(s => s.id === fee.student_id);
        if (student) {
          return {
            ...fee,
            student_name: student.name,
            student_roll_number: student.roll_number
          };
        }
        return fee;
      });
      
      setFees(feesWithStudentInfo);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
      toast.error('Unable to load fee payment history');
    } finally {
      setLoadingFees(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id));
    }
    setSelectAll(!selectAll);
  };

  const handleStudentSelect = (studentId: number) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to send notification');
      return;
    }

    if (!notificationTitle.trim() || !notificationContent.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      setSendingNotification(true);

      // Create fee payment notification
      await api.post('/fee-notifications', {
        student_ids: selectedStudents,
        title: notificationTitle,
        content: notificationContent,
        notification_type: 'fee_payment'
      });

      toast.success(`Notification sent to ${selectedStudents.length} student(s)`);
      setShowNotificationForm(false);
      setSelectedStudents([]);
      setSelectAll(false);
    } catch (err) {
      console.error('Failed to send fee notifications:', err);
      toast.error('Failed to send notifications. Please try again.');
    } finally {
      setSendingNotification(false);
    }
  };
  
  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to assign fee');
      return;
    }

    if (!feeDescription.trim()) {
      toast.error('Fee description is required');
      return;
    }
    
    // Validate amount is a valid number
    const amount = parseFloat(feeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setCreatingFee(true);

      // Create fee records
      await api.post('/admin/fees', {
        student_ids: selectedStudents,
        description: feeDescription,
        amount: amount,
        due_date: feeDueDate || undefined
      });

      toast.success(`Fee assigned to ${selectedStudents.length} student(s)`);
      setShowFeeForm(false);
      setSelectedStudents([]);
      setSelectAll(false);
      
      // Reset form
      setFeeDescription('');
      setFeeAmount('');
      setFeeDueDate('');
      
      // Refresh fee history if we're in history tab
      if (activeTab === 'history') {
        fetchAllFees();
      }
    } catch (err) {
      console.error('Failed to create fees:', err);
      toast.error('Failed to assign fees. Please try again.');
    } finally {
      setCreatingFee(false);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter fees based on status and search query
  const filteredFees = fees.filter(fee => {
    // First apply status filter
    if (statusFilter !== 'all' && fee.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    
    // Then apply search query if present
    if (searchQuery) {
      return (
        (fee.student_name && fee.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (fee.student_roll_number && fee.student_roll_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        fee.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return true;
  });

  return (
    <div className="py-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Wallet className="mr-2 text-primary" />
          Fee Payment Management
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-md flex items-center transition-colors ${
              activeTab === 'create' 
                ? 'bg-primary text-white' 
                : 'bg-white text-primary border border-primary'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create & Send
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md flex items-center transition-colors ${
              activeTab === 'history' 
                ? 'bg-primary text-white' 
                : 'bg-white text-primary border border-primary'
            }`}
          >
            <History className="w-4 h-4 mr-2" />
            Payment History
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {activeTab === 'create' ? (
        // Create Fee & Send Notification Tab
        <>
          {/* Search and Filter Section */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">{selectedStudents.length} selected</span>
              <button
                onClick={() => setSelectedStudents([])}
                disabled={selectedStudents.length === 0}
                className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={() => setShowFeeForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-green-700 transition-colors"
              disabled={loading || selectedStudents.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Fee
            </button>
            
            <button
              onClick={() => setShowNotificationForm(true)}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center hover:bg-primary/90 transition-colors"
              disabled={loading || selectedStudents.length === 0}
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Notification
            </button>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'No students match your search' : 'No students found'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        Select All
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr 
                      key={student.id}
                      className={`hover:bg-gray-50 ${selectedStudents.includes(student.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentSelect(student.id)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.roll_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.course || 'Not specified'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        // Payment History Tab
        <>
          {/* Fee History Search and Filter Section */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by student name, ID or fee description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              
              <button
                onClick={fetchAllFees}
                className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Fee Payment History Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loadingFees ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading fee history...</p>
              </div>
            ) : filteredFees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery || statusFilter !== 'all' ? 'No fees match your filters' : 'No fee records found'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{fee.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fee.student_name || 'Unknown'}<br/>
                        <span className="text-xs text-gray-400">{fee.student_roll_number || `ID: ${fee.student_id}`}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fee.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{fee.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fee.due_date ? formatDate(fee.due_date) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          fee.status === 'Paid' 
                            ? 'bg-green-100 text-green-800' 
                            : fee.status === 'Overdue' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {fee.status === 'Paid' && <BadgeCheck className="w-3 h-3 mr-1" />}
                          {fee.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                          {fee.status === 'Overdue' && <X className="w-3 h-3 mr-1" />}
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fee.payment_date ? formatDate(fee.payment_date) : 'Not paid'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      
      {/* Fee Creation Form */}
      {showFeeForm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 m-4 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Fee</h2>
              <button 
                onClick={() => setShowFeeForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Creating fee for {selectedStudents.length} student(s)
            </p>
            
            <form onSubmit={handleCreateFee}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fee Description
                </label>
                <input
                  type="text"
                  value={feeDescription}
                  onChange={(e) => setFeeDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Hostel Fee Semester 1, Mess Fee, etc."
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter amount in rupees"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 absolute ml-3" />
                  <input
                    type="date"
                    value={feeDueDate}
                    onChange={(e) => setFeeDueDate(e.target.value)}
                    className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeeForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                  disabled={creatingFee}
                >
                  {creatingFee ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Create Fee
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Form */}
      {showNotificationForm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 m-4 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Send Fee Payment Notification</h2>
              <button 
                onClick={() => setShowNotificationForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Sending notification to {selectedStudents.length} student(s)
            </p>
            
            <form onSubmit={handleSendNotification}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Notification Title"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Content
                </label>
                <textarea
                  value={notificationContent}
                  onChange={(e) => setNotificationContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  placeholder="Notification Content"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNotificationForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 flex items-center"
                  disabled={sendingNotification}
                >
                  {sendingNotification ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Send Notification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeePaymentPage; 