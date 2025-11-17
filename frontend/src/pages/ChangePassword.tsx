import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, AlertCircle, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a reset token
    const resetToken = localStorage.getItem('resetToken');
    if (!resetToken) {
      // Redirect to forgot password if no token
      navigate("/forgot-password");
      return;
    }
  }, [navigate]);

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error when input changes
  }

  function validatePassword(password: string) {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return "Password must contain at least one special character (@$!%*?&)";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const resetToken = localStorage.getItem('resetToken');
      if (!resetToken) {
        setError("Reset session expired. Please start the process again.");
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/reset-password`,
        { password: formData.password },
        {
          headers: {
            'Authorization': `Bearer ${resetToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Password reset successful:", response.data);
      setSuccess(response.data.message);
      
      // Clean up
      localStorage.removeItem('resetToken');
      
      // Navigate to login after success
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Failed to reset password. Please try again.");
      }
      
      // If token is invalid, redirect to forgot password
      if (error.response?.status === 401 || error.response?.status === 422) {
        localStorage.removeItem('resetToken');
        setTimeout(() => {
          navigate("/forgot-password");
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  const isPasswordValid = formData.password.length >= 8 && 
    /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-accent/10 via-primary/30 to-white animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white/80 rounded-xl shadow-lg p-8 flex flex-col gap-6 animate-scale-in backdrop-blur border"
      >
        <div className="flex flex-col items-center gap-2 mb-3">
          <Lock className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Reset Password
          </h2>
          <p className="text-sm text-gray-600 text-center">
            Enter your new password below
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}
        
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition pr-12"
            value={formData.password}
            onChange={e => handleChange("password", e.target.value)}
            placeholder="New Password"
            required
            disabled={loading}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition pr-12"
            value={formData.confirmPassword}
            onChange={e => handleChange("confirmPassword", e.target.value)}
            placeholder="Confirm New Password"
            required
            disabled={loading}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        {/* Password requirements */}
        <div className="text-xs text-gray-600">
          <p className="font-semibold mb-1">Password requirements:</p>
          <ul className="space-y-1">
            <li className={`flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-600' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              At least 8 characters
            </li>
            <li className={`flex items-center gap-1 ${/(?=.*[a-z])/.test(formData.password) ? 'text-green-600' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${/(?=.*[a-z])/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              One lowercase letter
            </li>
            <li className={`flex items-center gap-1 ${/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${/(?=.*[A-Z])/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              One uppercase letter
            </li>
            <li className={`flex items-center gap-1 ${/(?=.*\d)/.test(formData.password) ? 'text-green-600' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${/(?=.*\d)/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              One number
            </li>
            <li className={`flex items-center gap-1 ${/(?=.*[@$!%*?&])/.test(formData.password) ? 'text-green-600' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${/(?=.*[@$!%*?&])/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              One special character (@$!%*?&)
            </li>
          </ul>
        </div>
        
        <button
          type="submit"
          disabled={loading || !isPasswordValid || !passwordsMatch}
          className="bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition-all shadow hover:scale-105 flex justify-center items-center disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : null}
          Reset Password
        </button>
        
        <div className="text-center text-gray-600">
          <span className="cursor-pointer hover:underline" onClick={() => navigate("/login")}>
            Back to login
          </span>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword; 