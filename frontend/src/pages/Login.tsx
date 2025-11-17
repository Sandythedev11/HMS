import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import api, { API_URL } from "../utils/api";
import axios from "axios";

// Helper function to set admin credentials for quick testing - kept for development purposes
const setAdminCredentials = (setFormFn: React.Dispatch<React.SetStateAction<{ email: string; password: string }>>) => {
  if (process.env.NODE_ENV === 'development') {
    setFormFn({
      email: "sandeepgouda209@gmail.com",
      password: "Admin@123"
    });
  }
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isRejectedStudent, setIsRejectedStudent] = useState(false);

  // Handle back navigation
  useEffect(() => {
    const handleBackNavigation = () => {
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, [navigate]);

  // Check admin account on mount (for debugging) - kept but not displayed
  useEffect(() => {
    const checkAdminAccount = async () => {
      if (process.env.NODE_ENV === 'development') {
        try {
          const response = await axios.get(`${API_URL}/test-admin`);
          setDebugInfo(response.data);
        } catch (error) {
          console.error("Error checking admin account:", error);
          setDebugInfo({ error: "Failed to check admin account" });
        }
      }
    };
    
    checkAdminAccount();
  }, []);

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(""); // Clear error when input changes
    setIsRejectedStudent(false); // Clear rejected student state when input changes
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Using regular axios for login since we don't have a token yet
      const response = await axios.post(`${API_URL}/login`, {
        email: form.email,
        password: form.password
      });

      console.log("Login successful:", response.data);
      
      // Store token and user info in localStorage
      localStorage.setItem('token', response.data.token);
      
      // Make sure the role is correctly set
      const userData = response.data.user;
      userData.role = response.data.isAdmin ? 'admin' : 'student';
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Check if user is admin and redirect accordingly
      if (response.data.isAdmin) {
        console.log("Admin login detected, redirecting to admin dashboard");
        navigate("/admin-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Check if this is a rejected student case
      if (error.response?.data?.status === 'rejected' && error.response?.data?.registerAgain) {
        setError(error.response.data.message || "You have been removed from the hostel.");
        // Show register again button
        setIsRejectedStudent(true);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Login failed. Please check your credentials or connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-accent/40 via-primary/20 to-white animate-fade-in relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-left decorative circle */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-xl"></div>
        
        {/* Bottom-right decorative circle */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-xl"></div>
        
        {/* Center decorative patterns */}
        <div className="absolute top-1/4 right-1/4 w-60 h-60 bg-secondary/10 rounded-full blur-lg"></div>
        
        {/* Background image - abstract pattern */}
        <div 
          className="absolute inset-0 opacity-10 bg-no-repeat bg-cover"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1432821596592-e2c18b78144f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80')` 
          }}
        ></div>
        
        {/* Floating elements - keys/access themed items */}
        <div className="absolute top-16 left-1/4 w-10 h-10 border-2 border-primary/20 rounded-md rotate-12 backdrop-blur-sm"></div>
        <div className="absolute bottom-20 right-1/3 w-16 h-6 border border-accent/30 rounded-full -rotate-12"></div>
        <div className="absolute top-1/3 right-24 w-20 h-1 bg-primary/10 rounded-full rotate-45"></div>
        <div className="absolute bottom-1/4 left-10 w-16 h-16 border border-secondary/20 rounded-full rotate-45"></div>
      </div>
      
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white/85 rounded-xl shadow-lg p-8 flex flex-col gap-7 animate-scale-in backdrop-blur-md border relative z-10"
      >
        <div className="flex flex-col items-center gap-2 mb-3">
          <LogIn className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold mb-1 text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">Login to HMS</h2>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            
            {isRejectedStudent && (
              <button 
                onClick={() => navigate("/register")}
                className="mt-2 bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded-lg transition shadow hover:scale-105 flex justify-center items-center"
              >
                Register Again
              </button>
            )}
          </div>
        )}
        
        <input
          type="email"
          placeholder="Email"
          className="px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
          value={form.email}
          onChange={e => handleChange("email", e.target.value)}
          required
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
            value={form.password}
            onChange={e => handleChange("password", e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition shadow hover:scale-105 flex justify-center items-center"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : null}
          Login
        </button>
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span onClick={() => navigate("/forgot-password")} className="cursor-pointer hover:underline text-primary">Forgot password?</span>
          <span onClick={() => navigate("/register")} className="cursor-pointer hover:underline">Create account</span>
        </div>
      </form>
    </div>
  );
};

export default Login;
