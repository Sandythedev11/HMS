import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { User, AlertCircle, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { API_URL } from "../utils/api";

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

interface FormError {
  field: string;
  message: string;
}

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<RegisterFormData>({ 
    name: "", 
    email: "", 
    password: "", 
    confirm: "" 
  });
  const [errors, setErrors] = useState<FormError[]>([]);
  const [loading, setLoading] = useState(false);
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle back navigation
  useEffect(() => {
    const handleBackNavigation = () => {
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, [navigate]);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field if it exists
    setErrors(prev => prev.filter(error => error.field !== key));
  }

  function validateForm() {
    const newErrors: FormError[] = [];
    
    if (!form.name.trim()) {
      newErrors.push({ field: 'name', message: 'Name is required' });
    }
    
    if (!form.email.trim()) {
      newErrors.push({ field: 'email', message: 'Email is required' });
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.push({ field: 'email', message: 'Email is invalid' });
    }
    
    if (!form.password) {
      newErrors.push({ field: 'password', message: 'Password is required' });
    } else {
      // Password requirements validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(form.password)) {
        newErrors.push({ 
          field: 'password', 
          message: 'Password must be at least 8 characters and contain lowercase, uppercase, number, and special character (@$!%*?&)'
        });
      }
    }
    
    if (form.password !== form.confirm) {
      newErrors.push({ field: 'confirm', message: 'Passwords do not match' });
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/register`, {
        name: form.name,
        email: form.email,
        password: form.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Registration initiated:", response.data);
      setRegisterStep('otp');
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.response?.data?.message) {
        setErrors([{ field: 'general', message: error.response.data.message }]);
      } else if (error.response?.status === 400) {
        setErrors([{ field: 'general', message: 'Invalid registration data. Please check your information and try again.' }]);
      } else {
        setErrors([{ field: 'general', message: 'An error occurred during registration. Please check if the backend server is running.' }]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    
    if (!otp.trim()) {
      setOtpError("OTP is required");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/verify-otp`, {
        email: form.email,
        otp: otp,
        name: form.name,
        password: form.password
      });
      
      console.log("Registration completed:", response.data);
      
      // Store token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      // Show success message briefly before redirecting
      setRegistrationSuccess(true);
      
      // Redirect to student dashboard where profile completion flow will be enforced
      setTimeout(() => {
        navigate("/student/dashboard");
      }, 1500);
    } catch (error: any) {
      console.error("OTP verification error:", error);
      if (error.response?.data?.message) {
        setOtpError(error.response.data.message);
      } else {
        setOtpError("Failed to verify OTP. Please check if the backend server is running.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/resend-otp`, {
        email: form.email
      });
      
      console.log("OTP resent:", response.data);
      setOtpError("New OTP has been sent to your email");
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      if (error.response?.data?.message) {
        setOtpError(error.response.data.message);
      } else {
        setOtpError("Failed to resend OTP. Please check if the backend server is running.");
      }
    } finally {
      setLoading(false);
    }
  }

  function getFieldError(field: string) {
    return errors.find(error => error.field === field)?.message;
  }
  
  // For CORS debugging purposes
  useEffect(() => {
    const testServerConnection = async () => {
      try {
        await axios.options(`${API_URL}/register`);
        console.log("CORS preflight check passed");
      } catch (error) {
        console.error("CORS preflight check failed:", error);
      }
    };
    
    testServerConnection();
  }, []);

  // Registration form step
  if (registerStep === 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-primary/20 via-accent/30 to-white animate-fade-in px-2 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Background image - campus/education themed */}
          <div 
            className="absolute inset-0 opacity-10 bg-no-repeat bg-cover"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80')`
            }}
          ></div>
          
          {/* Top-right decorative shapes */}
          <div className="absolute top-10 right-10 w-72 h-72 bg-accent/10 rounded-full blur-xl"></div>
          <div className="absolute top-20 right-20 w-40 h-40 bg-primary/15 rounded-full blur-lg"></div>
          
          {/* Bottom-left decorative shapes */}
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-secondary/10 rounded-full blur-xl"></div>
          
          {/* Floating elements - registration themed */}
          <div className="absolute top-1/4 left-1/5 w-10 h-10 border border-accent/20 rounded-md rotate-45"></div>
          <div className="absolute bottom-1/3 right-1/5 w-8 h-8 border-2 border-primary/15 rounded-full"></div>
          <div className="absolute top-2/3 right-1/3 w-16 h-2 bg-secondary/15 rounded-full -rotate-12"></div>
          <div className="absolute top-1/5 left-1/3 w-12 h-12 border border-primary/10 rounded-lg rotate-12"></div>
        </div>
        
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/85 rounded-xl shadow-lg p-8 flex flex-col gap-6 animate-scale-in backdrop-blur-md border relative z-10"
        >
          <div className="flex flex-col items-center gap-2 mb-3">
            <User className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Register for HMS
            </h2>
          </div>
          
          {/* General error message */}
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{getFieldError('general')}</span>
            </div>
          )}
          
          <div className="relative">
            <input
              type="text"
              placeholder="Full Name"
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition ${
                getFieldError('name') ? 'border-red-500' : ''
              }`}
              value={form.name}
              onChange={e => update("name", e.target.value)}
              required
            />
            {getFieldError('name') && (
              <p className="text-red-500 text-sm mt-1">{getFieldError('name')}</p>
            )}
          </div>
          
          <div className="relative">
            <input
              type="email"
              placeholder="Email"
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition ${
                getFieldError('email') ? 'border-red-500' : ''
              }`}
              value={form.email}
              onChange={e => update("email", e.target.value)}
              required
            />
            {getFieldError('email') && (
              <p className="text-red-500 text-sm mt-1">{getFieldError('email')}</p>
            )}
          </div>
          
          <div className="relative">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition ${
                  getFieldError('password') ? 'border-red-500' : ''
                }`}
                value={form.password}
                onChange={e => update("password", e.target.value)}
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
            {getFieldError('password') && (
              <p className="text-red-500 text-sm mt-1">{getFieldError('password')}</p>
            )}
            {!getFieldError('password') && (
              <div className="text-gray-600 text-xs mt-1">
                <p>Password requirements:</p>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li className={form.password.length >= 8 ? "text-green-600" : ""}>At least 8 characters</li>
                  <li className={/[a-z]/.test(form.password) ? "text-green-600" : ""}>One lowercase letter</li>
                  <li className={/[A-Z]/.test(form.password) ? "text-green-600" : ""}>One uppercase letter</li>
                  <li className={/\d/.test(form.password) ? "text-green-600" : ""}>One number</li>
                  <li className={/[@$!%*?&]/.test(form.password) ? "text-green-600" : ""}>One special character (@$!%*?&)</li>
                </ul>
              </div>
            )}
          </div>
          
          <div className="relative">
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition ${
                  getFieldError('confirm') ? 'border-red-500' : ''
                }`}
                value={form.confirm}
                onChange={e => update("confirm", e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {getFieldError('confirm') && (
              <p className="text-red-500 text-sm mt-1">{getFieldError('confirm')}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition-all shadow hover:scale-105 flex justify-center items-center"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            Sign Up
          </button>
          
          <div className="text-center text-gray-600">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")} className="text-primary font-semibold cursor-pointer hover:underline">
              Login
            </span>
          </div>
        </form>
      </div>
    );
  }
  
  // OTP verification step
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-primary/20 via-accent/30 to-white animate-fade-in px-2 relative overflow-hidden">
      {/* Background decorative elements - similar to registration but with verification theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Background image - verification/secure themed */}
        <div 
          className="absolute inset-0 opacity-10 bg-no-repeat bg-cover"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1614064641938-3bbee52942c7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80')`
          }}
        ></div>
        
        {/* Decorative shapes */}
        <div className="absolute -top-40 right-0 w-96 h-96 bg-accent/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-20 left-20 w-72 h-72 bg-primary/15 rounded-full blur-xl"></div>
        
        {/* Floating elements - verification themed */}
        <div className="absolute top-1/3 left-1/4 w-12 h-12 border-2 border-primary/20 rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/3 w-16 h-3 bg-secondary/20 rounded-full rotate-12"></div>
        <div className="absolute top-1/2 right-1/5 w-8 h-8 border border-accent/15 rounded-md rotate-45"></div>
        
        {/* Abstract code/verification pattern */}
        <div className="absolute top-20 left-10 opacity-5">
          <div className="flex gap-1">
            <div className="w-4 h-8 bg-primary/50 rounded-sm"></div>
            <div className="w-4 h-4 bg-accent/50 rounded-sm"></div>
            <div className="w-4 h-6 bg-primary/50 rounded-sm"></div>
          </div>
        </div>
      </div>
      
      <form
        onSubmit={handleVerifyOtp}
        className="w-full max-w-md bg-white/85 rounded-xl shadow-lg p-8 flex flex-col gap-6 animate-scale-in backdrop-blur-md border relative z-10"
      >
        <div className="flex flex-col items-center gap-2 mb-3">
          <User className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Verify Email
          </h2>
          <p className="text-center text-gray-600">
            We've sent a verification code to <span className="font-semibold">{form.email}</span>
          </p>
        </div>
        
        {/* Success message */}
        {registrationSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>Registration successful! Redirecting to dashboard...</span>
          </div>
        )}
        
        {/* Error message */}
        {otpError && !registrationSuccess && (
          <div className={`bg-${otpError.includes('sent') ? 'green' : 'red'}-50 border border-${otpError.includes('sent') ? 'green' : 'red'}-200 text-${otpError.includes('sent') ? 'green' : 'red'}-700 px-4 py-3 rounded-md flex items-center gap-2`}>
            <AlertCircle className="h-5 w-5" />
            <span>{otpError}</span>
          </div>
        )}
        
        <div className="relative">
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition text-center text-2xl tracking-widest"
            value={otp}
            onChange={e => {
              // Allow only digits
              const value = e.target.value.replace(/[^0-9]/g, '');
              // Limit to 6 digits
              setOtp(value.slice(0, 6));
              setOtpError("");
            }}
            required
            maxLength={6}
            disabled={registrationSuccess}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || registrationSuccess}
          className="bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition-all shadow hover:scale-105 flex justify-center items-center"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : null}
          Verify & Complete Registration
        </button>
        
        <div className="text-center text-gray-600">
          Didn't receive the code?{" "}
          <span 
            onClick={handleResendOtp} 
            className={`text-primary font-semibold cursor-pointer hover:underline ${registrationSuccess ? 'opacity-50 pointer-events-none' : ''}`}
          >
            Resend OTP
          </span>
        </div>
        
        <div className="text-center text-gray-600">
          <span 
            onClick={() => setRegisterStep('form')} 
            className={`text-primary font-semibold cursor-pointer hover:underline ${registrationSuccess ? 'opacity-50 pointer-events-none' : ''}`}
          >
            Back to Registration
          </span>
        </div>
      </form>
    </div>
  );
};

export default Register;
