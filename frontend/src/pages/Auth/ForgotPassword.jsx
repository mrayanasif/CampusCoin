import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, KeyRound, Mail } from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar/Navbar";
import { useCurrency } from "../../context/CurrencyContext";
import API from "../../api/axios";
import "./Auth.css";

function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [emailFailed, setEmailFailed] = useState(false);
  const { currency, toggleCurrency } = useCurrency();
  const [theme, setTheme] = useState(() => {
    const preferences = JSON.parse(localStorage.getItem("student_preferences") || "{}");
    return preferences.darkMode ? "dark" : "light";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.body.classList.toggle("dark-mode", nextTheme === "dark");
    const preferences = JSON.parse(localStorage.getItem("student_preferences") || "{}");
    localStorage.setItem("student_preferences", JSON.stringify({ ...preferences, darkMode: nextTheme === "dark" }));
  };

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
    <>
      <Navbar currency={currency} onToggleCurrency={toggleCurrency} theme={theme} onToggleTheme={toggleTheme} />

      <main className="lux-auth">
        <div className="lux-auth-grid">
          <section className="lux-auth-side">
            <div className="lux-auth-blob"></div>
            <div className="lux-auth-sphere-1"></div>
            <div className="lux-auth-sphere-2"></div>

            <div className="lux-auth-side-content">
              <span className="lux-auth-tag">
                <KeyRound size={14} />
                ACCOUNT RECOVERY
              </span>

              <h1 className="lux-auth-title">
                FORGOT
                <br />
                <span>PASSWORD?</span>
              </h1>

              <p className="lux-auth-text">
                Enter your registered email address and we will send you a secure link to reset your password.
              </p>

              <div className="lux-auth-points">
                <div className="lux-auth-point">
                  <span>01</span>
                  <strong>Request a reset link</strong>
                </div>
                <div className="lux-auth-point">
                  <span>02</span>
                  <strong>Check your email inbox</strong>
                </div>
                <div className="lux-auth-point">
                  <span>03</span>
                  <strong>Create a new password</strong>
                </div>
              </div>
            </div>

            <div className="lux-auth-side-foot">
              Your goals. Your money. Your future.
            </div>
          </section>

          <section className="lux-auth-form-side">
            <div className="lux-auth-card">
              {!emailSent ? (
                <>
                  <div className="lux-auth-card-head">
                    <h2>Forgot Password</h2>
                    <p>Enter your email to receive recovery instructions</p>
                  </div>

                  <form onSubmit={handleSubmit} noValidate>
                    <div className="lux-field">
                      <label htmlFor="recovery-email">EMAIL ADDRESS</label>
                      <div className="lux-input-wrap">
                        <Mail size={16} className="lux-input-icon" />
                        <input
                          id="recovery-email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="lux-submit-btn"
                      disabled={loading}
                    >
                      {loading ? "SENDING LINK..." : "SEND RESET LINK"}
                      {!loading && <ArrowRight size={16} />}
                    </button>
                  </form>

                  <p className="lux-auth-bottom">
                    Remember your password?{" "}
                    <Link to="/login">Back to login</Link>
                  </p>
                </>
              ) : (
                <div className="lux-recovery-success">
                  <div className="lux-success-badge">
                    <CheckCircle2 size={40} className="lux-success-icon" />
                  </div>

                  <h2>Check Your Inbox</h2>
                  <p>
                    A password reset link has been dispatched to your email address.
                    Please check your inbox (and spam/junk folder).
                  </p>

                  {emailFailed && resetToken && (
                    <div className="lux-fallback-box">
                      <p>
                        ⚠️ Direct SMTP could not deliver the email. Use this local fallback link:
                      </p>
                      <Link
                        to={`/reset-password?token=${resetToken}`}
                        className="lux-submit-btn"
                        style={{ marginTop: "12px", textDecoration: "none" }}
                      >
                        Proceed to Reset Password
                      </Link>
                    </div>
                  )}

                  <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <Link
                      to="/login"
                      className="lux-submit-btn"
                      style={{ textDecoration: "none" }}
                    >
                      Back to Login
                    </Link>

                    <button
                      type="button"
                      className="lux-resend-btn"
                      onClick={() => {
                        setEmailSent(false);
                        setResetToken("");
                        setEmailFailed(false);
                      }}
                    >
                      Try another email
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default ForgotPassword;
