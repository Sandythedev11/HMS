import { useNavigate, useLocation } from "react-router-dom";
import { Bed, Users, ShieldCheck, MessageSquare, Calendar, Wallet, Info, Star, X, Fingerprint, CheckCircle, AlertTriangle, ArrowLeft, Mail, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import api from "../utils/api";
import { isAuthenticated, isAdmin, getDashboardUrl } from "../utils/auth";

const features = [
  {
    icon: Bed,
    title: "Smart Room Allocation",
    desc: "Enjoy seamless room assignments using AI-driven logic for comfort & fairness.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Access",
    desc: "Bank-level security & privacy for your data – peace of mind guaranteed.",
  },
  {
    icon: MessageSquare,
    title: "Instant Notices & Complaints",
    desc: "Receive updates in real-time & submit feedback anytime.",
  },
  {
    icon: Wallet,
    title: "One-Tap Fee Payments",
    desc: "Pay hostel fees securely, anytime, from any device.",
  },
  {
    icon: Calendar,
    title: "Room Maintenance",
    desc: "Request and track room maintenance services with ease.",
  },
  {
    icon: Users,
    title: "Community Built-in",
    desc: "Collaborate & connect inside a vibrant student community.",
  },
];

// Add AttendanceMarker component
const AttendanceMarker = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [windowOpen, setWindowOpen] = useState(false);
  
  useEffect(() => {
    // Check if attendance window is open
    const checkWindow = async () => {
      try {
        const response = await api.get('/attendance/window/status');
        setWindowOpen(response.data.is_open);
      } catch (err) {
        console.error("Failed to check attendance window:", err);
        setWindowOpen(false);
      }
    };
    
    if (isVisible) {
      checkWindow();
      setError(null);
      setSuccess(null);
    }
  }, [isVisible]);
  
  const handleMarkAttendance = async () => {
    if (!studentId.trim()) {
      setError("Please enter your student ID");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if attendance window is open
      const windowResponse = await api.get('/attendance/window/status');
      if (!windowResponse.data.is_open) {
        setError("Attendance time window is closed.");
        setIsLoading(false);
        return;
      }
      
      // Try to authenticate and mark attendance
      // This is a simplified approach - in a real implementation, you would handle
      // fingerprint verification here.
      const response = await api.post('/login', {
        email: studentId,
        password: studentId // Simplified for demo, normally would use proper auth
      });
      
      // If login successful, use the token to mark attendance
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        try {
          const attendanceResponse = await api.post('/attendance', {});
          setSuccess("Attendance marked successfully!");
          setStudentId("");
        } catch (attendanceErr: any) {
          if (attendanceErr.response && attendanceErr.response.data && attendanceErr.response.data.message) {
            setError(attendanceErr.response.data.message);
          } else {
            setError("Failed to mark attendance. Please try again.");
          }
        }
      }
    } catch (err: any) {
      console.error("Authentication failed:", err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Student ID not recognized. Please try again.");
      }
    } finally {
      setIsLoading(false);
      localStorage.removeItem('token'); // Clean up token
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center mb-4">
          <Fingerprint className="w-8 h-8 text-primary mr-3" />
          <h2 className="text-xl font-semibold">Mark Attendance</h2>
        </div>
        
        {!windowOpen ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
            <p className="text-yellow-700">Attendance time window is closed.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <p className="text-green-700">{success}</p>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="Enter your student ID"
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={handleMarkAttendance}
              disabled={isLoading || !!success}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Mark Attendance
                </span>
              )}
            </button>
            
            <p className="text-xs text-gray-500 mt-3 text-center">
              Please ensure you are using your registered fingerprint device.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAttendanceMarker, setShowAttendanceMarker] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [fromDashboard, setFromDashboard] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Hostel slideshow images
  const slideshowImages = [
    {
      url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
      caption: "Modern Hostel Common Area"
    },
    {
      url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
      caption: "Student Dormitory Building"
    },
    {
      url: "https://images.unsplash.com/photo-1595846519845-68e298c2edd8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
      caption: "Cafeteria & Dining Area"
    },
    {
      url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
      caption: "Comfortable Student Room"
    },
    {
      url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
      caption: "Study & Collaboration Space"
    }
  ];
  
  useEffect(() => {
    // Check if coming from dashboard
    const searchParams = new URLSearchParams(location.search);
    setFromDashboard(searchParams.get('from') === 'dashboard');
    
    // Handle direct landing page load
    if (location.pathname === '/') {
      // Replace the current history entry with the landing page
      window.history.replaceState(null, '', '/');
    }

    // Handle back button behavior
    const handleBackButton = (event: PopStateEvent) => {
      if (location.pathname === '/') {
        event.preventDefault();
        window.history.pushState(null, '', '/');
      }
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [location.pathname, location.search]);

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slideshowImages.length);
    }, 4000); // Change slide every 4 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleReturnToDashboard = () => {
    const dashboardUrl = getDashboardUrl();
    navigate(dashboardUrl);
  };

  // Terms and Conditions Modal
  const TermsAndConditionsModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
    if (!isVisible) return null;
    
    return (
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        style={{ transition: 'opacity 0.3s ease' }}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[80vh] overflow-y-auto"
          style={{ 
            transform: 'none',
            transition: 'none'
          }}
        >
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center mb-4">
            <FileText className="w-6 h-6 text-primary mr-3" />
            <h2 className="text-xl font-semibold">Terms and Conditions</h2>
          </div>
          
          <div className="space-y-4 text-gray-700">
            <h3 className="font-semibold text-lg">1. Acceptance of Terms</h3>
            <p>By accessing and using the Hostel Management System (HMS), you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this system.</p>
            
            <h3 className="font-semibold text-lg">2. User Accounts</h3>
            <p>2.1. You are responsible for maintaining the confidentiality of your account and password.</p>
            <p>2.2. You agree to accept responsibility for all activities that occur under your account.</p>
            <p>2.3. You must immediately notify HMS of any unauthorized use of your account or any other breach of security.</p>
            
            <h3 className="font-semibold text-lg">3. Privacy Policy</h3>
            <p>3.1. HMS collects and processes personal data in accordance with our Privacy Policy.</p>
            <p>3.2. By using our system, you consent to such processing and you warrant that all data provided by you is accurate.</p>
            
            <h3 className="font-semibold text-lg">4. System Use</h3>
            <p>4.1. HMS grants you a limited, non-exclusive, non-transferable, and revocable license to access and use the system.</p>
            <p>4.2. You agree not to use the system for any unlawful purpose or in any way that might harm, damage, or overburden it.</p>
            <p>4.3. You must not attempt to gain unauthorized access to any part of the system or any server, computer, or database connected to it.</p>
            
            <h3 className="font-semibold text-lg">5. Limitations of Liability</h3>
            <p>5.1. HMS shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to or use of the system.</p>
            <p>5.2. The system is provided on an "as is" and "as available" basis without any warranties.</p>
            
            <h3 className="font-semibold text-lg">6. Changes to Terms</h3>
            <p>HMS reserves the right to modify these terms at any time. Your continued use of the system following any changes indicates your acceptance of the new terms.</p>
            
            <h3 className="font-semibold text-lg">7. Governing Law</h3>
            <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which HMS operates, without regard to its conflict of law provisions.</p>
            
            <h3 className="font-semibold text-lg">8. Contact Information</h3>
            <p>If you have any questions about these Terms, please contact us at hostelmanagmentsystem76@gmail.com.</p>
            
            <p className="mt-6 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-[#e9e3ff] via-[#f1f5ff] to-[#f8f0fa] font-sans overflow-x-hidden">
      {/* AttendanceMarker Modal */}
      <AttendanceMarker 
        isVisible={showAttendanceMarker} 
        onClose={() => setShowAttendanceMarker(false)} 
      />
      
      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal 
        isVisible={showTerms} 
        onClose={() => setShowTerms(false)} 
      />
      
      {/* Navigation area with Return button */}
      {fromDashboard && isAuthenticated() && (
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={handleReturnToDashboard}
            className="flex items-center gap-2 bg-white/80 hover:bg-white px-4 py-2 rounded-full shadow-md transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return</span>
          </button>
        </div>
      )}
      
      {/* Large Slideshow Section */}
      <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
        {/* Background Slideshow */}
        {slideshowImages.map((image, index) => (
          <div 
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img 
              src={image.url} 
              alt={image.caption}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-black/60"></div>
            
            {/* Caption */}
            <div className="absolute bottom-8 left-0 right-0 text-center">
              <h3 className="text-white text-xl md:text-2xl font-semibold drop-shadow-md">{image.caption}</h3>
            </div>
          </div>
        ))}
        
        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slideshowImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        

        
        {/* Overlay Content with HMS Branding */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="inline-flex items-center gap-3 mb-4">
              <Bed className="w-12 h-12 text-white drop-shadow-xl" />
              <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg tracking-tight">
                HMS
              </h1>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg max-w-2xl mx-auto">
              Modern Hostel Management, <span className="text-accent">Redefined.</span>
            </h2>
            <div className="flex gap-4 mt-6 justify-center">
              <button
                onClick={() => navigate("/register")}
                className="bg-primary text-white px-6 py-2.5 rounded-lg shadow-lg hover:bg-primary/90 transition-all"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate("/login")}
                className="bg-white text-primary px-6 py-2.5 rounded-lg shadow-lg hover:bg-white/90 transition-all"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-4 pt-16 pb-16 flex flex-col items-center">
        {/* Feature Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-7 w-full animate-fade-in">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="relative bg-white/90 glass-morphism border border-accent/30 shadow-md rounded-2xl px-6 py-7 flex flex-col gap-2 items-start transition-transform duration-300 hover:-translate-y-2 animate-fade-in"
              style={{ animationDelay: `${i * 60 + 280}ms` }}
            >
              <f.icon className="w-8 h-8 text-primary drop-shadow-lg mb-1 animate-scale-in" />
              <div className="font-bold text-lg text-gray-800">{f.title}</div>
              <div className="text-gray-500 text-base">{f.desc}</div>
            </div>
          ))}
        </div>
        

                {/* About Us Section */}
        <div className="w-full mt-16 bg-white/80 rounded-2xl p-8 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-800">About Us</h2>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700">
              HMS is a comprehensive hostel management solution designed to streamline the administration of student accommodations. Our platform connects students, wardens, and administrators through an intuitive digital interface.
            </p>
            <p className="text-gray-700">
              Founded with the mission to simplify hostel operations, HMS helps institutions manage room allocations, attendance tracking, fee collection, and communication efficiently. We believe in creating a seamless living experience for students while providing powerful management tools for administrators.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">Our Mission</h3>
                <p className="text-sm text-gray-700">To transform hostel management through technology that creates better living and administrative experiences.</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">Our Vision</h3>
                <p className="text-sm text-gray-700">To become the leading digital solution for educational institutions managing student accommodations worldwide.</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">Our Values</h3>
                <p className="text-sm text-gray-700">Innovation, reliability, security, and student-centric design guide everything we do.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Community Callout */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 mt-8 bg-gradient-to-r from-primary/40 via-accent/30 to-secondary/30 rounded-2xl p-7 shadow-lg animate-fade-in">
          <div className="flex items-center gap-4">
            <Users className="w-7 h-7 text-primary" />
            <span className="font-semibold text-lg text-gray-800">
              Students & Admin Portals
            </span>
          </div>
          <div className="flex items-center gap-3 text-primary font-medium text-base tracking-tight">
            <Star className="w-5 h-5 text-accent" /> Trusted by 1500+ users & counting
          </div>
          <div className="flex flex-col items-center gap-2">
          <a
              href="mailto:hostelmanagmentsystem76@gmail.com"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary/90 transition-all font-semibold w-full justify-center"
              aria-label="Contact support by email"
          >
              <Mail className="w-5 h-5" />
              Email Support
          </a>
            <span className="text-sm text-gray-600 font-medium">hostelmanagmentsystem76@gmail.com</span>
          </div>
        </div>
        {/* Footer */}
        <div className="mt-16 text-gray-400 text-center text-sm w-full animate-fade-in">
          <div className="mb-3 flex items-center justify-center gap-4">
            <button 
              onClick={() => setShowTerms(true)} 
              className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              <span>Terms & Conditions</span>
            </button>
          </div>
          &copy; {new Date().getFullYear()} HMS Hostel Management System. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Index;
