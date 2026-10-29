import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  LockKeyhole,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../../components/Navbar/Navbar";
import { useCurrency } from "../../context/CurrencyContext";
import API from "../../api/axios";
import "./Auth.css";

function ResetPassword() {
  const navigate = useNavigate();
  const { token: tokenFromParam } = useParams();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const tokenFromStorage = localStorage.getItem("resetToken");
  const token = tokenFromParam || tokenFromUrl || tokenFromStorage;

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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

      setErrorMsg("");
      toast.success("Password updated successfully");

      setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      const msg = error.response?.data?.message || "Password reset failed";
      setErrorMsg(msg);
      toast.error(msg);
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
                <LockKeyhole size={14} />
                SECURE ACCESS
              </span>

              <h1 className="lux-auth-title">
                RESET
                <br />
                <span>PASSWORD</span>
              </h1>

              <p className="lux-auth-text">
                Choose a strong new password to protect your Campus Coin account.
              </p>

              <div className="lux-auth-points">
                <div className="lux-auth-point">
                  <span>01</span>
                  <strong>Minimum 8 characters</strong>
                </div>
                <div className="lux-auth-point">
                  <span>02</span>
                  <strong>Mix letters & numbers</strong>
                </div>
                <div className="lux-auth-point">
                  <span>03</span>
                  <strong>Keep it confidential</strong>
                </div>
              </div>
            </div>

            <div className="lux-auth-side-foot">
              Your goals. Your money. Your security.
            </div>
          </section>

          <section className="lux-auth-form-side">
            <div className="lux-auth-card">
              <div className="lux-auth-card-head">
                <h2>Set New Password</h2>
                <p>Enter your new password below to update your account</p>
              </div>

              {(!token || errorMsg) && (
                <div className="lux-alert-box" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span>⚠️ {errorMsg || "Invalid or missing reset token."}</span>
                  <Link to="/forgot-password" style={{ color: "#dc2626", fontWeight: "700", textDecoration: "underline" }}>
                    Click here to request a fresh reset link →
                  </Link>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="lux-field">
                  <label htmlFor="new-password">NEW PASSWORD</label>
                  <div className="lux-input-wrap">
                    <Lock size={16} className="lux-input-icon" />
                    <input
                      id="new-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="lux-input-toggle"
                      onClick={() => setShowPassword((c) => !c)}
                      aria-label="Show or hide password"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="lux-field">
                  <label htmlFor="confirm-new-password">CONFIRM PASSWORD</label>
                  <div className="lux-input-wrap">
                    <Lock size={16} className="lux-input-icon" />
                    <input
                      id="confirm-new-password"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="lux-submit-btn"
                  disabled={loading || !token}
                >
                  {loading ? "UPDATING PASSWORD..." : "UPDATE PASSWORD"}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>

              <p className="lux-auth-bottom">
                Remember your password?{" "}
                <Link to="/login">Back to login</Link>
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default ResetPassword;
