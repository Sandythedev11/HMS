import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OtpVerification from "./pages/OtpVerification";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PendingStudentsPage from "./pages/PendingStudentsPage";
import ApprovedStudentsPage from "./pages/ApprovedStudentsPage";
import AdminStudentManagement from "./pages/AdminStudentManagement";
import AdminFeePaymentPage from "./pages/AdminFeePaymentPage";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";
import AdminAttendancePage from "./pages/AdminAttendancePage";
import NoticePage from "./pages/NoticePage";
import RoomPage from "./pages/RoomPage";
import StudentRoomPage from "./pages/StudentRoomPage";
import ComplaintPage from "./pages/ComplaintPage";
import FeePaymentPage from "./pages/FeePaymentPage";
import CheckoutPage from "./pages/CheckoutPage";
import FeedbackPage from "./pages/FeedbackPage";
import AttendancePage from "./pages/AttendancePage";
import StudentCompleteProfile from "./pages/StudentCompleteProfile";
import StudentSubmitEnrollment from "./pages/StudentSubmitEnrollment";
import StudentPendingApproval from "./pages/StudentPendingApproval";
import StudentEnrollmentRejected from "./pages/StudentEnrollmentRejected";
import StudentRouteGuard from "./components/StudentRouteGuard";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import React, { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import api, { directFetch } from "./utils/api";
import { isAdmin as checkIsAdmin } from "./utils/auth";

const queryClient = new QueryClient();

function LayoutWithSidebar({ isAdmin = false, children }: { isAdmin?: boolean; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col">
          <AppHeader />
        <main className="flex-1 bg-gradient-to-br from-white via-blue-50 to-purple-50 p-6 animate-fade-in">
          {children}
        </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Helper: Routing to show sidebar on dashboards, not on auth pages
function MainRouter() {
  const location = useLocation();
  const isUserAdmin = checkIsAdmin();
  
  // Common app pages like notices, rooms, etc.
  const commonAppPages = [
    "/notice",
    "/room",
    "/student-room",
    "/complaint",
    "/fee-payment",
    "/checkout",
    "/feedback",
    "/attendance"
  ];
  
  // If it's an admin user
  if (isUserAdmin) {
    // Admin paths or common paths (for an admin user)
    if (
      location.pathname.startsWith("/admin") ||
      location.pathname === "/admin-dashboard" ||
      commonAppPages.includes(location.pathname)
    ) {
      return (
        <LayoutWithSidebar isAdmin>
          <Routes>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/pending-students" element={<PendingStudentsPage />} />
            <Route path="/admin/students" element={<ApprovedStudentsPage />} />
            <Route path="/admin/student-management" element={<AdminStudentManagement />} />
            <Route path="/admin/student-management/:studentId" element={<AdminStudentManagement />} />
            <Route path="/admin/fee-payment" element={<AdminFeePaymentPage />} />
            <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
            <Route path="/admin/attendance" element={<AdminAttendancePage />} />
            <Route path="/notice" element={<NoticePage />} />
            <Route path="/room" element={<RoomPage />} />
            <Route path="/student-room" element={<StudentRoomPage />} />
            <Route path="/complaint" element={<ComplaintPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/fee-payment" element={<FeePaymentPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            {/* Add more admin routes here */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </LayoutWithSidebar>
      );
    }
  }
  
  // If it's a student or user paths that start with /student or are common app pages
  if (
    location.pathname.startsWith("/student") ||
    (!isUserAdmin && commonAppPages.includes(location.pathname))
  ) {
    // Student context with route protection
    return (
      <StudentRouteGuard>
        <LayoutWithSidebar>
          <Routes>
            {/* Protected dashboard and features - only accessible after full approval */}
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student-dashboard" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/notice" element={<NoticePage />} />
            <Route path="/room" element={<RoomPage />} />
            <Route path="/student-room" element={<StudentRoomPage />} />
            <Route path="/complaint" element={<ComplaintPage />} />
            <Route path="/fee-payment" element={<FeePaymentPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            
            {/* Enrollment flow pages - accessible based on student status */}
            <Route path="/student/complete-profile" element={<StudentCompleteProfile />} />
            <Route path="/student/submit-enrollment" element={<StudentSubmitEnrollment />} />
            <Route path="/student/pending-approval" element={<StudentPendingApproval />} />
            <Route path="/student/enrollment-rejected" element={<StudentEnrollmentRejected />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </LayoutWithSidebar>
      </StudentRouteGuard>
    );
  }
  
  // Auth pages, landing, etc.
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/otp-verification" element={<OtpVerification />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/test-cors" element={<TestCors />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function TestCors() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const testCors = async () => {
      try {
        console.log("Testing CORS connection...");
        
        // Try both methods
        try {
          console.log("Testing with axios:");
          const response = await api.get('/test-cors');
          console.log("CORS test successful (axios):", response.data);
          setResult(response.data);
        } catch (axiosErr) {
          console.error("Axios test failed:", axiosErr);
          
          // Try direct fetch as fallback
          console.log("Testing with direct fetch:");
          const data = await directFetch('/test-cors');
          console.log("CORS test successful (fetch):", data);
          setResult(data);
        }
      } catch (err: any) {
        console.error("CORS test failed completely:", err);
        setError(err.message || "Failed to connect to API");
      }
    };
    
    testCors();
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Testing CORS</h1>
      <p className="mb-4">Check the console for detailed results</p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
          Error: {error}
        </div>
      )}
      
      {result && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md">
          <h2 className="font-bold mb-2">Success!</h2>
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      <div className="mt-8">
        <a href="/login" className="text-blue-500 hover:underline">Go to Login</a>
      </div>
    </div>
  );
}

// Helper: Check if path is an auth page
const isAuthPage = (pathname: string) => {
  return ['/login', '/register', '/otp-verification', '/forgot-password', '/change-password'].includes(pathname);
};

// Helper: Handle back navigation
function NavigationHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // Set initial load to false after first render
    if (initialLoad) {
      setInitialLoad(false);
    }
  }, [initialLoad]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we're on the landing page
      if (location.pathname === '/') {
        // If this was a direct load of the landing page, prevent navigation
        if (initialLoad) {
          event.preventDefault();
          window.history.pushState(null, '', '/');
          return;
        }
      }
      
      // If coming back from an auth page, redirect to home
      if (isAuthPage(location.pathname)) {
        navigate('/', { replace: true });
      }
    };

    // Add state entry for the landing page
    if (location.pathname === '/') {
      window.history.pushState(null, '', '/');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location, navigate, initialLoad]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NavigationHandler />
          <MainRouter />
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
