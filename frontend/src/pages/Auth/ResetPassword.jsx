import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CircleDollarSign,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import "./Auth.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const tokenFromStorage = localStorage.getItem("resetToken");
  const token = tokenFromUrl || tokenFromStorage;

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }

    const form = new FormData(event.currentTarget);
    const password = form.get("password") || "";
    const confirmPassword = form.get("confirmPassword") || "";

    if (!password) {
      toast.error("Please enter a new password");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!confirmPassword) {
      toast.error("Please confirm your password");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await API.post(`/auth/reset-password/${token}`, { password });

      localStorage.removeItem("resetToken");

      toast.success("Password updated successfully");

      setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      toast.error(error.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <section className="auth-side">
          <Link to="/" className="auth-brand">
            <span className="auth-brand-icon">
              <CircleDollarSign size={23} />
            </span>
            <span>Campus Coin</span>
          </Link>

          <div className="auth-side-content">
            <p className="auth-small-text">Almost There</p>
            <h1>Create a New Password.</h1>
            <p>
              Choose a password you can remember and keep your Campus Coin
              account secure.
            </p>

            <div className="auth-visual">
              <div className="auth-visual-circle">
                <KeyRound size={65} strokeWidth={1.5} />
              </div>
              <div className="auth-mini-icon coin-icon">
                <LockKeyhole size={22} />
              </div>
            </div>
          </div>

          <span className="auth-side-footer">
            Your goals. Your money. Your support.
          </span>
        </section>

        <section className="auth-form-side">
          <div className="auth-form-wrapper">
            <Link to="/" className="mobile-auth-brand">
              <CircleDollarSign size={25} />
              <span>Campus Coin</span>
            </Link>

            <div className="auth-heading">
              <span>Password Reset</span>
              <h2>Set a new password</h2>
              <p>Your new password should contain at least 8 characters.</p>
            </div>

            {!token && (
              <div
                style={{
                  background: "#fee",
                  color: "#900",
                  padding: "12px 16px",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 14,
                }}
              >
                ⚠️ Invalid reset link. Please request a new one.
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="new-password">New password</label>
                <div className="password-input">
                  <input
                    id="new-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((c) => !c)}
                    aria-label="Show or hide password"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-new-password">Confirm password</label>
                <input
                  id="confirm-new-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password again"
                  required
                />
              </div>

              <button type="submit" className="auth-submit" disabled={loading || !token}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>

            <p className="auth-switch">
              Remembered your password? <Link to="/login">Back to login</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ResetPassword;