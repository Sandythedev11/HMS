import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Key, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { API_URL } from "../utils/api";

const OtpVerification = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("registration"); // 'registration' or 'password-reset'
  const navigate = useNavigate();
  const location = useLocation();

  // Handle back navigation
  useEffect(() => {
    const handleBackNavigation = () => {
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, [navigate]);

  useEffect(() => {
    // Get purpose and email from navigation state or localStorage
    const state = location.state as { purpose?: string; email?: string } | null;
    const resetEmail = localStorage.getItem('resetEmail');
    
    if (state?.purpose && state?.email) {
      setPurpose(state.purpose);
      setEmail(state.email);
    } else if (resetEmail) {
      setPurpose('password-reset');
      setEmail(resetEmail);
    } else {
      // Default to registration if no context
      setPurpose('registration');
    }
  }, [location]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (purpose === 'password-reset') {
        // Verify OTP for password reset
        const response = await axios.post(`${API_URL}/verify-password-reset-otp`, {
          email: email,
          otp: otp
        });

        console.log("Password reset OTP verification successful:", response.data);
        
        // Store the reset token for password change
        localStorage.setItem('resetToken', response.data.reset_token);
        localStorage.removeItem('resetEmail'); // Clean up
        
        // Navigate to change password page
        navigate("/change-password");
      } else {
        // This would be for registration OTP (existing functionality)
        console.log("Registration OTP verification - redirecting to login");
        navigate("/login");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      if (error.response?.data?.message) {
        const message = error.response.data.message;
        if (message.includes('expired')) {
          setError("OTP expired");
        } else {
          setError("Invalid OTP");
        }
      } else {
        setError("OTP verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    if (!email) {
      setError("Email not found. Please start the process again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (purpose === 'password-reset') {
        await axios.post(`${API_URL}/forgot-password`, { email: email });
      } else {
        await axios.post(`${API_URL}/resend-otp`, { email: email });
      }
      
      // Show success message or toast here if needed
      console.log("OTP resent successfully");
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/20 to-white animate-fade-in px-2">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white/90 rounded-xl shadow-lg p-8 flex flex-col gap-6 animate-scale-in backdrop-blur border"
      >
        <div className="flex flex-col items-center gap-2 mb-3">
          <Key className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            OTP Verification
          </h2>
          {email && (
            <p className="text-sm text-gray-600 text-center">
              {purpose === 'password-reset' ? 'Password reset code sent to:' : 'Verification code sent to:'} {email}
            </p>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          className="px-4 py-3 border rounded-md text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary transition font-mono"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Enter 6-digit code"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition-all shadow hover:scale-105 flex justify-center items-center disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : null}
          Verify
        </button>
        <div className="text-center text-gray-600 text-sm">
          Didn't get the code?
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={loading}
            className="pl-2 text-primary hover:underline cursor-pointer disabled:opacity-50"
          >
            Resend
          </button>
        </div>
      </form>
    </div>
  );
};

export default OtpVerification;
