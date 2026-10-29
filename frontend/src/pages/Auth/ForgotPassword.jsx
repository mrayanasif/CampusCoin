import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CircleDollarSign, KeyRound, Mail } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import "./Auth.css";

function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [emailFailed, setEmailFailed] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const form = new FormData(event.currentTarget);
    const email = form.get("email")?.trim();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/forgot-password", { email });

      if (res.data.token) {
        setResetToken(res.data.token);
        setEmailFailed(true);
        localStorage.setItem("resetToken", res.data.token);
        toast.success("Reset link generated (fallback mode)");
      } else {
        toast.success("Reset link sent to your email!");
      }

      setEmailSent(true);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send reset link"
      );
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
            <p className="auth-small-text">Account Recovery</p>
            <h1>We'll Help You Get Back In.</h1>
            <p>
              Enter the email connected to your account and we'll help
              you reset your password.
            </p>

            <div className="auth-visual">
              <div className="auth-visual-circle">
                <KeyRound size={65} strokeWidth={1.5} />
              </div>
              <div className="auth-mini-icon coin-icon">
                <Mail size={22} />
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

            {!emailSent ? (
              <>
                <div className="auth-heading">
                  <span>Password Recovery</span>
                  <h2>Forgot your password?</h2>
                  <p>
                    Enter your email and we'll send you instructions to reset
                    your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="auth-field">
                    <label htmlFor="recovery-email">Email address</label>
                    <input
                      id="recovery-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>

                <Link to="/login" className="back-login">
                  <ArrowLeft size={16} />
                  Back to login
                </Link>
              </>
            ) : (
              <div className="recovery-success">
                <div className="success-icon">
                  <Mail size={28} />
                </div>

                <span>Check your inbox</span>
                <h2>Reset link sent</h2>

                {emailFailed ? (
                  <>
                    <p style={{ color: "#c0392b" }}>
                      ⚠️ Email could not be sent from the server. Use the
                      fallback option below to reset your password.
                    </p>
                    <Link
                      to={`/reset-password?token=${resetToken}`}
                      className="btn auth-submit"
                      style={{ marginBottom: "10px" }}
                    >
                      Continue to Reset Password
                    </Link>
                  </>
                ) : (
                  <p>
                    Password reset instructions have been sent to your email.
                    Please check your inbox (and spam folder).
                  </p>
                )}

                <Link to="/login" className="btn auth-submit">
                  Back to Login
                </Link>

                <button
                  type="button"
                  className="resend-button"
                  onClick={() => {
                    setEmailSent(false);
                    setResetToken("");
                    setEmailFailed(false);
                  }}
                >
                  Try another email
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default ForgotPassword;