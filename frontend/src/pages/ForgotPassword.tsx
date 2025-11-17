import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API_URL}/forgot-password`, {
        email: email
      });

      console.log("Forgot password request successful:", response.data);
      setSuccess(response.data.message);
      
      // Store email in localStorage for OTP verification
      localStorage.setItem('resetEmail', email);
      
      // Navigate to OTP verification after a short delay
      setTimeout(() => {
        navigate("/otp-verification", { state: { purpose: 'password-reset', email: email } });
      }, 2000);
    } catch (error: any) {
      console.error("Forgot password error:", error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Failed to send password reset email. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-accent/10 via-primary/30 to-white animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white/80 rounded-xl shadow-lg p-8 flex flex-col gap-6 animate-scale-in backdrop-blur border"
      >
        <div className="flex flex-col items-center gap-2 mb-3">
          <Mail className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Forgot Password?
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <span>{success}</span>
          </div>
        )}
        
        <input
          type="email"
          className="px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition-all shadow hover:scale-105 flex justify-center items-center"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : null}
          Send OTP
        </button>
        <div className="text-center text-gray-600">
          <span className="cursor-pointer hover:underline" onClick={() => navigate("/login")}>Back to login</span>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;
